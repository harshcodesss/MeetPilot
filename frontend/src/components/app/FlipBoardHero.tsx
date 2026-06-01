"use client";

import { useEffect, useState } from "react";

import { TextFlippingBoard } from "@/components/ui/text-flipping-board";

/**
 * A split-flap "airport board" hero that cycles through messages. Wraps the
 * TextFlippingBoard (which re-flips whenever its `text` changes) with a timer.
 *
 * Color tiles available inside messages: {R} {O} {Y} {G} {B} {V} {W}.
 */
interface FlipBoardHeroProps {
  messages: string[];
  /** Seconds between message swaps. */
  intervalSeconds?: number;
  /** Flip animation length passed through to the board. */
  duration?: number;
  className?: string;
}

export function FlipBoardHero({
  messages,
  intervalSeconds = 5,
  duration,
  className,
}: FlipBoardHeroProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      intervalSeconds * 1000,
    );
    return () => clearInterval(id);
  }, [messages.length, intervalSeconds]);

  return (
    <TextFlippingBoard
      text={messages[index]}
      duration={duration}
      className={className}
    />
  );
}
