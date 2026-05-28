// Popup reads capture state from chrome.storage.session and sends
// START_CAPTURE / STOP_CAPTURE messages to the service worker.
// The service worker owns all network I/O; the popup only reflects state.
//
// The popup also owns the bearer-token UX: if chrome.storage.local.authToken
// is empty, the paste-token section is shown instead of Start/Stop. The SW
// clears the token on 401, which fires storage.local.onChanged and reverts
// the popup to the paste-token state automatically.

const tokenSection = document.getElementById("tokenSection");
const tokenInput   = document.getElementById("tokenInput");
const saveTokenBtn = document.getElementById("saveTokenBtn");

const mainSection  = document.getElementById("mainSection");
const dot          = document.getElementById("dot");
const statusText   = document.getElementById("statusText");
const sessionEl    = document.getElementById("sessionId");
const banner       = document.getElementById("promptBanner");
const btn          = document.getElementById("btn");
const signoutLink  = document.getElementById("signoutLink");

// Render UI from the current capture state, Meet-tab flag, and token presence.
// Pure function — no side effects beyond DOM updates.
function render(state, onMeet, hasToken) {
  if (!hasToken) {
    tokenSection.style.display = "block";
    mainSection.style.display  = "none";
    dot.classList.remove("active");
    return;
  }

  tokenSection.style.display = "none";
  mainSection.style.display  = "block";

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

async function readPopupState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onMeet = tab?.url?.startsWith("https://meet.google.com/") ?? false;
  const local  = await chrome.storage.local.get("authToken");
  const sess   = await chrome.storage.session.get("captureState");
  return { state: sess.captureState ?? null, onMeet, hasToken: !!local.authToken };
}

async function rerender() {
  const { state, onMeet, hasToken } = await readPopupState();
  render(state, onMeet, hasToken);
}

// Send a message to the service worker and re-render on the response.
async function sendCommand(type) {
  btn.disabled = true;
  try {
    await chrome.runtime.sendMessage({ type });
  } catch (err) {
    console.warn("MeetPilot popup: SW not responding —", err.message);
  }
  await rerender();
  btn.disabled = false;
}

btn.addEventListener("click", () => {
  const capturing = btn.classList.contains("btn-stop");
  sendCommand(capturing ? "STOP_CAPTURE" : "START_CAPTURE");
});

saveTokenBtn.addEventListener("click", async () => {
  const value = tokenInput.value.trim();
  if (!value) return;
  saveTokenBtn.disabled = true;
  await chrome.storage.local.set({ authToken: value });
  tokenInput.value = "";
  await rerender();
  saveTokenBtn.disabled = false;
});

signoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await chrome.storage.local.remove("authToken");
  await rerender();
});

// Re-render if capture state changes (SW updates session storage).
chrome.storage.session.onChanged.addListener(async (changes) => {
  if (!changes.captureState) return;
  await rerender();
});

// Re-render if the token is added/removed (e.g. SW cleared it on a 401).
chrome.storage.local.onChanged.addListener(async (changes) => {
  if (!changes.authToken) return;
  await rerender();
});

rerender();
