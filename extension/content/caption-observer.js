'use strict';

// ============================================================================
// DOM SELECTORS — isolated here; this is the only place to edit when Meet
// updates its DOM. Verified against the live Meet DOM on 2026-05-22.
//
// How to re-tune if segments stop appearing:
//   1. Join a Meet, enable captions (CC button).
//   2. DevTools → Inspector → find the captions panel.
//   3. captionsContainer: look for div[role="region"][aria-label="Captions"] —
//      this is ARIA-based and the most stable.
//   4. captionItem:  a direct child div that holds one speaker's utterance.
//   5. speakerName:  the span inside the item that shows the speaker's name.
//   6. captionText:  the div inside the item that shows the spoken text.
// ============================================================================
const SELECTORS = {
  // STABLE — ARIA role/label; Google won't break screen readers by changing this.
  captionsContainer: 'div[role="region"][aria-label="Captions"]',

  // FRAGILE — compiled class names; most likely to drift with Meet updates.
  captionItem: 'div.nMcdL',    // outer block per speaker utterance
  speakerName: 'span.NWpY1d', // speaker name span inside the item
  captionText: 'div.ygicle',  // spoken text div inside the item
};

// How long (ms) the last caption line's text must be unchanged before we treat
// it as final. Meet updates the line word-by-word; this fires after the speaker
// pauses or finishes the thought.
const DEBOUNCE_MS = 1800;

// ============================================================================
// State
// ============================================================================

// The content script is intentionally stateless with respect to capture.
// It always forwards finalized segments to the service worker; the SW decides
// whether to buffer or drop them based on its own capture state.
//
// Dedup model: Meet often re-uses the same div.nMcdL element for multiple
// utterances on the same line (and refines a single utterance word-by-word).
// Tracking "emitted nodes" as a WeakSet would silently swallow everything
// after the first emit from such a node. Instead we track the FULL text we
// last successfully emitted per node; subsequent mutations are compared
// against it and only the new content (tail) is sent.
//
// `lastEmittedTextByNode` and `latestPending` are reset per session via
// SESSION_RESET from the SW so a restart on the same Meet tab starts clean.
let lastEmittedTextByNode = new WeakMap(); // node → last full text we emitted
let debounceTimer         = null;

// Snapshot of the most recent extracted speaker/text for the still-growing
// last caption item. Refreshed on every mutation regardless of prior emit
// state. If Meet wipes the inner text just before our debounce fires (or
// before the node is detached), or the user clicks Stop mid-utterance, we
// fall back to this cache so the latest grown state isn't lost.
let latestPending = null; // { node, speaker, text } | null

// ============================================================================
// Extract speaker + text from a single caption item node
// ============================================================================
function extractSegment(node) {
  const speaker = node.querySelector(SELECTORS.speakerName)?.textContent.trim() || 'unknown';
  const text    = node.querySelector(SELECTORS.captionText)?.textContent.trim()  || '';
  return { speaker, text };
}

// ============================================================================
// Decide what fresh text (if any) to send for this node, given the current
// DOM text and what we've already emitted from it.
//
//   no prior emit       → send full current text (first segment from node)
//   identical to prior  → null (nothing new)
//   current startsWith  → continuation; send only the new tail
//   else                → text reset / new utterance on same node; send full
// ============================================================================
function diffToEmit(node, currentText) {
  const prior = lastEmittedTextByNode.get(node);
  if (!prior) return currentText;
  if (currentText === prior) return null;
  if (currentText.startsWith(prior)) {
    const tail = currentText.slice(prior.length).trim();
    return tail || null;
  }
  return currentText;
}

// ============================================================================
// Send a finalized segment to the service worker
//
// Reads the DOM first; if the node has been wiped, falls back to the cached
// latestPending snapshot. The "full" text is recorded as the new emission
// boundary so future continuation checks compare against cumulative content,
// while the "tail" (when applicable) is what actually gets sent.
//
// Returns the in-flight sendMessage promise (or null if nothing to send) so
// callers that need ordering — FLUSH_PENDING — can await it.
// ============================================================================
function emitSegment(node) {
  let { speaker, text } = extractSegment(node);
  if (!text && latestPending && latestPending.node === node) {
    speaker = latestPending.speaker;
    text    = latestPending.text;
  }
  if (!text) return null;

  const toEmit = diffToEmit(node, text);
  if (!toEmit) return null;

  lastEmittedTextByNode.set(node, text);
  console.log(`[MeetPilot] segment → ${speaker}: ${toEmit}`);

  const sent = chrome.runtime.sendMessage({ type: 'SEGMENT', speaker, text: toEmit })
    .catch(() => {
      // SW may be briefly asleep during MV3 lifecycle; safe to swallow.
    });

  if (latestPending && latestPending.node === node) latestPending = null;
  return sent;
}

// ============================================================================
// Finalization heuristic
//
// Triggers, in priority order:
//   1. A new caption item appears after the current one → the previous item
//      is definitively final (Meet moved to a new utterance).
//   2. Captions container empties (items=0) → Meet just cleared the panel;
//      flush the cached in-flight line now, before its text gets wiped.
//   3. Debounce — the last item's text has not changed for DEBOUNCE_MS →
//      treat it as final.
// ============================================================================
function onCaptionsChanged(container) {
  const items = container.querySelectorAll(SELECTORS.captionItem);

  if (!items.length) {
    // Container cleared — emit the cached in-flight caption right now.
    flushPendingNow();
    return;
  }

  // Everything except the last item is definitively final.
  for (let i = 0; i < items.length - 1; i++) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    emitSegment(items[i]);
  }

  // The last item is still growing — refresh the cache and (re)arm the
  // debounce. Crucially we do this even if we've previously emitted from this
  // node: Meet re-uses the same div.nMcdL element across utterances, so the
  // tail (case 1) or replacement (case 4) must still be picked up.
  const last = items[items.length - 1];
  const snapshot = extractSegment(last);
  if (!snapshot.text) return;
  if (lastEmittedTextByNode.get(last) === snapshot.text) return; // nothing new

  latestPending = { node: last, ...snapshot };
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => emitSegment(last), DEBOUNCE_MS);
}

// Force-emit the cached in-flight caption right now (cancels the debounce).
// Used on container-clear and on FLUSH_PENDING from the SW (Stop button).
function flushPendingNow() {
  clearTimeout(debounceTimer);
  debounceTimer = null;
  if (latestPending) emitSegment(latestPending.node);
}

// ============================================================================
// Captions-container lifecycle
//
// Meet removes the captions container entirely when the user toggles CC off,
// and creates a fresh element with the same selector when they toggle CC
// back on. A one-shot waitForContainer wouldn't see the second container.
// We keep an outer body observer running for the whole page lifetime and
// re-attach whenever the container appears, disappears, or is replaced.
// ============================================================================
let currentContainer  = null;
let containerObserver = null;

function attachToContainer(container) {
  if (currentContainer === container && containerObserver) return; // already attached

  if (containerObserver) containerObserver.disconnect();
  currentContainer = container;

  console.log('[MeetPilot] captions container found — attaching MutationObserver');
  console.log('[MeetPilot] container el:', container);

  containerObserver = new MutationObserver(() => {
    const items = container.querySelectorAll(SELECTORS.captionItem);
    console.log(`[MeetPilot] mutation fired | items=${items.length}`);
    onCaptionsChanged(container);
  });

  containerObserver.observe(container, {
    childList: true,      // new caption items appearing
    subtree: true,        // text nodes growing inside items
    characterData: true,  // direct text-node changes
  });
}

function detachContainer() {
  if (containerObserver) containerObserver.disconnect();
  containerObserver = null;
  currentContainer  = null;
}

// Run for the lifetime of the page: watch document.body for the captions
// container appearing, disappearing, or being replaced (CC toggle on/off).
//
// Two signals run in parallel:
//   (1) Body MutationObserver — fast path, fires on most DOM changes.
//   (2) 500ms poll           — backup, catches cases the observer misses
//                              (e.g. Meet flips role/aria-label attributes,
//                              renders captions via a portal, or otherwise
//                              changes state in a way that doesn't bubble
//                              cleanly through childList mutations).
function watchForContainer() {
  const initial = document.querySelector(SELECTORS.captionsContainer);
  if (initial) attachToContainer(initial);
  else         console.log('[MeetPilot] waiting for captions container…');

  const reconcileContainer = () => {
    const el = document.querySelector(SELECTORS.captionsContainer);

    if (el && el !== currentContainer) {
      // (Re)appeared — initial render, or after a CC-off/CC-on cycle that
      // replaced the element (or restored attributes our selector requires).
      console.log('[MeetPilot] captions container (re)appeared — re-attaching');
      attachToContainer(el);
    } else if (!el && currentContainer) {
      // Disappeared — element removed or attributes stripped. Flush any
      // in-flight caption now while latestPending still has the text.
      console.log('[MeetPilot] captions container disappeared — flushing in-flight caption');
      flushPendingNow();
      detachContainer();
    }
  };

  const bodyObserver = new MutationObserver(reconcileContainer);
  bodyObserver.observe(document.body, { childList: true, subtree: true });

  // Backup: 500ms poll. Cheap (one querySelector per tick), runs for the
  // lifetime of the page. Adds at most ~500ms latency to detect a toggle.
  setInterval(reconcileContainer, 500);
}

// ============================================================================
// Lifecycle messages from the SW
//
//   SESSION_RESET — sent on START_CAPTURE. Clears per-session emission state
//                   so a node Meet re-uses across sessions isn't muted by the
//                   WeakSet from the previous run.
//   FLUSH_PENDING — sent on STOP_CAPTURE. Emits any cached in-flight caption
//                   immediately so the SW can include it in the final flush
//                   before /complete.
// ============================================================================
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SESSION_RESET') {
    lastEmittedTextByNode = new WeakMap();
    clearTimeout(debounceTimer);
    debounceTimer = null;
    latestPending = null;
    console.log('[MeetPilot] session reset — emission state cleared');
    sendResponse({ ok: true });
    return; // sync response
  }

  if (msg.type === 'FLUSH_PENDING') {
    handleFlushPending().then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async response
  }
});

async function handleFlushPending() {
  clearTimeout(debounceTimer);
  debounceTimer = null;

  if (!latestPending) return;

  // emitSegment internally applies diffToEmit, so a continuation sends only
  // the tail and a replacement sends the full new text. We await the returned
  // promise so the SW's SEGMENT handler buffers this BEFORE our response
  // unblocks the SW's STOP_CAPTURE handler.
  const sent = emitSegment(latestPending.node);
  if (sent) {
    try { await sent; }
    catch (e) { console.warn('[MeetPilot] flush-on-stop send failed:', e.message); }
  }
}

watchForContainer();
