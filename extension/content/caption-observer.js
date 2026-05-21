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
// This avoids any chrome.storage access in the content script context.

// Track which DOM nodes we've already emitted so we never double-send.
const emittedNodes = new WeakSet();

let debounceTimer = null;

// ============================================================================
// Extract speaker + text from a single caption item node
// ============================================================================
function extractSegment(node) {
  const speaker = node.querySelector(SELECTORS.speakerName)?.textContent.trim() || 'unknown';
  const text    = node.querySelector(SELECTORS.captionText)?.textContent.trim()  || '';
  return { speaker, text };
}

// ============================================================================
// Send a finalized segment to the service worker
// ============================================================================
function emitSegment(node) {
  if (emittedNodes.has(node)) return;

  const { speaker, text } = extractSegment(node);
  if (!text) return; // skip blank lines (e.g. cleared container)

  emittedNodes.add(node);
  console.log(`[MeetPilot] segment → ${speaker}: ${text}`);

  chrome.runtime.sendMessage({ type: 'SEGMENT', speaker, text })
    .catch(() => {
      // Service worker may be sleeping (MV3 lifecycle); safe to swallow here.
      // The SW in Checkpoint 4 will handle keeping itself alive during capture.
    });
}

// ============================================================================
// Finalization heuristic
//
// Two triggers — whichever fires first:
//   1. A new caption item appears after the current one → the previous item is
//      definitively final (Meet has moved to a new utterance).
//   2. Debounce — the last item's text has not changed for DEBOUNCE_MS →
//      the speaker has paused long enough that we treat it as final.
//
// This prevents capturing the same growing line dozens of times.
// ============================================================================
function onCaptionsChanged(container) {
  const items = container.querySelectorAll(SELECTORS.captionItem);
  if (!items.length) return;

  // Everything except the last item is definitively final.
  for (let i = 0; i < items.length - 1; i++) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    emitSegment(items[i]);
  }

  // The last item is still growing — arm the debounce.
  const last = items[items.length - 1];
  if (!emittedNodes.has(last)) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => emitSegment(last), DEBOUNCE_MS);
  }
}

// ============================================================================
// Attach MutationObserver to the captions container
// ============================================================================
function attachToContainer(container) {
  console.log('[MeetPilot] captions container found — attaching MutationObserver');
  console.log('[MeetPilot] container el:', container);

  const observer = new MutationObserver(() => {
    const items = container.querySelectorAll(SELECTORS.captionItem);
    console.log(`[MeetPilot] mutation fired | items=${items.length}`);
    onCaptionsChanged(container);
  });

  observer.observe(container, {
    childList: true,      // new caption items appearing
    subtree: true,        // text nodes growing inside items
    characterData: true,  // direct text-node changes
  });
}

// ============================================================================
// Wait for the captions container to appear
// (It only exists after the user enables live captions in Meet)
// ============================================================================
function waitForContainer() {
  const existing = document.querySelector(SELECTORS.captionsContainer);
  if (existing) {
    attachToContainer(existing);
    return;
  }

  // Poll the DOM until Meet renders the captions panel.
  const bodyObserver = new MutationObserver(() => {
    const el = document.querySelector(SELECTORS.captionsContainer);
    if (el) {
      bodyObserver.disconnect();
      attachToContainer(el);
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
  console.log('[MeetPilot] waiting for captions container…');
}

waitForContainer();
