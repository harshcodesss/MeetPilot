'use strict';

// Change before deploying; mirrors extension/shared/config.js (SW can't import it).
const BACKEND_URL = 'http://localhost:8000';

// Flush when buffer reaches this many segments OR when FLUSH_INTERVAL_MS has
// elapsed since the last flush — whichever comes first.
const FLUSH_SEGMENT_COUNT = 25;
const FLUSH_INTERVAL_MS   = 20_000; // 20 s

// ============================================================================
// Auth — bearer token stored in chrome.storage.local, sent on every API call.
// AuthError signals "popup needs to show the paste-token state" (no token, or
// the backend just told us the token is invalid).
// ============================================================================
class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

async function getAuthToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken || null;
}

async function clearAuthToken() {
  await chrome.storage.local.remove('authToken');
}

// ============================================================================
// In-memory state
// captureState is also mirrored to chrome.storage.session so the popup can
// read it. Buffer and seq live only in memory: receiving SEGMENT messages from
// the content script keeps the SW alive during active capture.
// ============================================================================
let captureState = { isCapturing: false, sessionId: null };
let buffer       = [];   // {seq, speaker, text, timestamp}[]
let seq          = 0;    // monotonic counter; reset on each session start
let lastFlushAt  = 0;    // Date.now() of last successful flush

// ============================================================================
// Broadcast a lifecycle message to every open Meet tab's content script.
// Errors are swallowed — a tab without a listener (e.g. page still loading)
// just means there's nothing on the other end to coordinate with.
// ============================================================================
async function broadcastToMeetTabs(message) {
  const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
  await Promise.all(
    tabs.map(tab => chrome.tabs.sendMessage(tab.id, message).catch(() => {})),
  );
}

// ============================================================================
// Thin fetch wrapper — adds the bearer header, throws on non-2xx.
// AuthError fires on missing token (no header to send) or 401 (backend rejected
// the token). 401 also clears the stored token so the popup reverts to the
// paste-token state via chrome.storage.local.onChanged.
// ============================================================================
async function apiPost(path, body) {
  const token = await getAuthToken();
  if (!token) {
    throw new AuthError('No auth token — connect your account in the popup.');
  }
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body:    JSON.stringify(body),
  });
  if (res.status === 401) {
    await clearAuthToken();
    throw new AuthError('Session expired — reconnect your account in the popup.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`POST ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ============================================================================
// Flush — POST the current buffer as a batch.
// On success:  remove sent segments from the buffer.
// On failure:  leave them in the buffer; seq+session_id dedup on retry.
// ============================================================================
async function flush() {
  if (!captureState.isCapturing || !captureState.sessionId || buffer.length === 0) return;

  const batch = [...buffer];
  try {
    const result = await apiPost(`/session/${captureState.sessionId}/segments`, {
      segments: batch,
    });
    // Only remove the segments we actually sent (not anything that arrived mid-flush).
    buffer    = buffer.filter(s => !batch.includes(s));
    lastFlushAt = Date.now();
    console.log(`[MeetPilot SW] flushed — accepted=${result.accepted} skipped=${result.skipped}`);
  } catch (err) {
    console.warn('[MeetPilot SW] flush failed; will retry on next flush:', err.message);
    // Segments stay in buffer — backend deduplicates via (session_id, seq).
  }
}

// ============================================================================
// Message router
// ============================================================================
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg)
    .then(sendResponse)
    .catch(err => {
      console.error('[MeetPilot SW] unhandled error in', msg.type, err);
      sendResponse({ ok: false, error: err.message });
    });
  return true; // keep channel open for async sendResponse
});

async function handleMessage(msg) {
  // ------------------------------------------------------------------
  // START_CAPTURE — call /session/start, initialise state
  // ------------------------------------------------------------------
  if (msg.type === 'START_CAPTURE') {
    const data = await apiPost('/session/start', {});
    captureState = { isCapturing: true, sessionId: data.session_id };
    buffer      = [];
    seq         = 0;
    lastFlushAt = Date.now();
    await chrome.storage.session.set({ captureState });

    // Tell open Meet tabs to clear per-session state so a node Meet re-uses
    // across sessions isn't muted by the previous run's emittedNodes WeakSet.
    await broadcastToMeetTabs({ type: 'SESSION_RESET' });

    console.log(`[MeetPilot SW] session started: ${data.session_id}`);
    return { ok: true, sessionId: data.session_id };
  }

  // ------------------------------------------------------------------
  // STOP_CAPTURE — final flush, then /complete
  // ------------------------------------------------------------------
  if (msg.type === 'STOP_CAPTURE') {
    if (!captureState.isCapturing) return { ok: true };
    const sessionId = captureState.sessionId;

    // Ask Meet tabs to emit any in-flight caption (still being typed when the
    // user clicked Stop). Awaiting this guarantees the resulting SEGMENT
    // message is buffered before our final flush below.
    await broadcastToMeetTabs({ type: 'FLUSH_PENDING' });

    await flush(); // send any buffered segments before completing

    await apiPost(`/session/${sessionId}/complete`, {});
    console.log(`[MeetPilot SW] session complete: ${sessionId}`);

    captureState = { isCapturing: false, sessionId: null };
    buffer       = [];
    await chrome.storage.session.set({ captureState });
    return { ok: true };
  }

  // ------------------------------------------------------------------
  // SEGMENT — stamp seq/timestamp, buffer, flush if due
  // ------------------------------------------------------------------
  if (msg.type === 'SEGMENT') {
    if (!captureState.isCapturing) return { ok: true }; // not capturing — drop

    seq += 1;
    buffer.push({
      seq,
      speaker:   msg.speaker,
      text:      msg.text,
      timestamp: new Date().toISOString(),
    });

    const elapsed = Date.now() - lastFlushAt;
    if (elapsed >= FLUSH_INTERVAL_MS || buffer.length >= FLUSH_SEGMENT_COUNT) {
      await flush();
    }

    return { ok: true };
  }

  return { ok: false, error: `unknown message type: ${msg.type}` };
}
