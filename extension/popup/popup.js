// Popup reads capture state from chrome.storage.session and sends
// START_CAPTURE / STOP_CAPTURE messages to the service worker.
// The service worker owns all network I/O; the popup only reflects state.

const dot        = document.getElementById("dot");
const statusText = document.getElementById("statusText");
const sessionEl  = document.getElementById("sessionId");
const banner     = document.getElementById("promptBanner");
const btn        = document.getElementById("btn");

// Render UI from the current capture state + whether the active tab is Meet.
function render(state, onMeet) {
  const capturing = state?.isCapturing ?? false;

  dot.classList.toggle("active", capturing);

  if (capturing) {
    statusText.textContent = "Capturing…";
    statusText.className   = "status-text capturing";
    sessionEl.textContent  = state.sessionId ? `Session: ${state.sessionId.slice(0, 8)}…` : "";
    banner.style.display   = "none";
    btn.textContent        = "Stop Capture";
    btn.className          = "btn btn-stop";
  } else {
    statusText.textContent = "Idle";
    statusText.className   = "status-text";
    sessionEl.textContent  = "";
    banner.style.display   = onMeet ? "block" : "none";
    btn.textContent        = "Start Capture";
    btn.className          = "btn btn-start";
  }
}

// Query active tab to detect Meet, then load state and render.
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onMeet = tab?.url?.startsWith("https://meet.google.com/") ?? false;

  const stored = await chrome.storage.session.get("captureState");
  render(stored.captureState ?? null, onMeet);
}

// Send a message to the service worker and re-render on the response.
async function sendCommand(type) {
  btn.disabled = true;
  try {
    await chrome.runtime.sendMessage({ type });
  } catch (err) {
    // Service worker may not be ready yet during development; log and move on.
    console.warn("MeetPilot popup: SW not responding —", err.message);
  }
  // Re-read state after the command (SW updates storage before responding).
  const stored = await chrome.storage.session.get("captureState");
  const [tab]  = await chrome.tabs.query({ active: true, currentWindow: true });
  const onMeet = tab?.url?.startsWith("https://meet.google.com/") ?? false;
  render(stored.captureState ?? null, onMeet);
  btn.disabled = false;
}

btn.addEventListener("click", () => {
  const capturing = btn.classList.contains("btn-stop");
  sendCommand(capturing ? "STOP_CAPTURE" : "START_CAPTURE");
});

// Re-render if storage changes while popup is open (e.g. SW updates state).
chrome.storage.session.onChanged.addListener(async (changes) => {
  if (!changes.captureState) return;
  const [tab]  = await chrome.tabs.query({ active: true, currentWindow: true });
  const onMeet = tab?.url?.startsWith("https://meet.google.com/") ?? false;
  render(changes.captureState.newValue ?? null, onMeet);
});

init();
