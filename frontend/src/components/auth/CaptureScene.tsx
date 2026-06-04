"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * The animated illustration for the Capture slide of the login carousel.
 *
 * It mimics what Subsystem 1 actually does: Google Meet's live captions stream
 * in already labeled with real speaker names, and each line gets "finalized"
 * into an ordered segment. Here each line types out character by character,
 * settles into the feed, and the captured-count ticks up — a live, in-order
 * capture with a pulsing recording badge and a periodic auto-save. No audio,
 * no recording, just the caption DOM, which is the whole reason we scrape Meet.
 */
type Line = {
  id: number;
  speaker: string;
  initials: string;
  color: string;
  text: string;
};

const SCRIPT: Omit<Line, "id">[] = [
  { speaker: "Priya", initials: "P", color: "#1a73e8", text: "I'll send the Q3 deck by Thursday." },
  { speaker: "Aman", initials: "A", color: "#ea4335", text: "Let's book a design review next week." },
  { speaker: "Diego", initials: "D", color: "#34a853", text: "I can take the API migration." },
  { speaker: "Sara", initials: "S", color: "#b06000", text: "I'll follow up with the vendor today." },
  { speaker: "Aman", initials: "A", color: "#ea4335", text: "And I'll share the notes right after." },
];

const TYPE_MS = 55; // per-character typing speed (slower, easier to read)
const HOLD_MS = 1100; // pause after a line finishes before it finalizes
const KEEP = 4; // how many finalized lines stay visible

export function CaptureScene() {
  const [finalized, setFinalized] = useState<Line[]>([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(12 * 60 + 4); // mm:ss meeting clock

  const entry = SCRIPT[idx % SCRIPT.length];

  // Live meeting clock — ticks every second.
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Type out the current line, then finalize it into the feed.
  useEffect(() => {
    if (typed.length < entry.text.length) {
      const t = setTimeout(
        () => setTyped(entry.text.slice(0, typed.length + 1)),
        TYPE_MS,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setFinalized((f) => [...f, { ...entry, id: idx }].slice(-KEEP));
      setCount((c) => c + 1);
      setIdx((i) => i + 1);
      setTyped("");
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [typed, idx, entry.text]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]">
      {/* Window chrome — the meeting being captured. */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green text-white">
            <VideoIcon />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-ink">Q3 Planning sync</p>
            <p className="text-[11px] text-ink-faint">Google Meet</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-red-bg px-2.5 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red" />
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-red">
            {mm}:{ss}
          </span>
        </div>
      </div>

      {/* Transcript feed. */}
      <div className="flex h-[228px] flex-col justify-end gap-2.5 px-4 py-4">
        <AnimatePresence initial={false} mode="popLayout">
          {finalized.map((line) => (
            <motion.div
              key={line.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <CaptionRow line={line} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* The line being captured right now — caret blinks at the cursor. */}
        <CaptionRow
          line={{ ...entry, id: -1, text: typed }}
          live
          dim={typed.length === 0}
        />
      </div>

      {/* Footer — running count + periodic auto-save (Subsystem 1 flushes
          every 15-30s so a crash loses seconds, not the meeting). */}
      <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <motion.span
            key={count}
            initial={{ scale: 1.5, color: "#1a73e8" }}
            animate={{ scale: 1, color: "#202124" }}
            className="text-xs font-semibold tabular-nums text-ink"
          >
            {count}
          </motion.span>
          <span className="text-[11px] text-ink-muted">lines captured</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
          <span className="text-[11px] font-medium text-ink-muted">Auto-saved</span>
        </div>
      </div>
    </div>
  );
}

function CaptionRow({
  line,
  live = false,
  dim = false,
}: {
  line: Line;
  live?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 transition-opacity ${
        dim ? "opacity-40" : "opacity-100"
      }`}
    >
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ backgroundColor: line.color }}
      >
        {line.initials}
      </span>
      <p className="text-[13px] leading-snug text-ink">
        <span className="font-semibold" style={{ color: line.color }}>
          {line.speaker}:
        </span>{" "}
        <span className="text-ink-muted">{line.text}</span>
        {live && (
          <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-primary align-middle" />
        )}
      </p>
    </div>
  );
}

function VideoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3.5l4 3v-9l-4 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
