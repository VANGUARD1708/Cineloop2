"use client";

import { useEffect, useState } from "react";

interface Props {
  warzone: {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
    expiresAt?: string;
  };
}

export default function WarzoneCard({ warzone }: Props) {
  const [votesA, setVotesA] = useState(warzone.votesA);
  const [votesB, setVotesB] = useState(warzone.votesB);
  const [voted, setVoted] = useState<"A" | "B" | null>(null);

  /* ANIMATE WHEN SERVER UPDATES */
  useEffect(() => {
    const animate = (start: number, end: number, setter: any) => {
      const duration = 300;
      const startTime = performance.now();

      const frame = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const value = Math.floor(start + (end - start) * progress);
        setter(value);
        if (progress < 1) requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    };

    animate(votesA, warzone.votesA, setVotesA);
    animate(votesB, warzone.votesB, setVotesB);
  }, [warzone.votesA, warzone.votesB]);

  const total = votesA + votesB;
  const percentA = total ? (votesA / total) * 100 : 50;
  const percentB = total ? (votesB / total) * 100 : 50;

  const vote = (side: "A" | "B") => {
    if (voted) return;

    setVoted(side);

    if (side === "A") setVotesA((v) => v + 1);
    else setVotesB((v) => v + 1);

    // TODO: send to API
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 space-y-4">
      <h3 className="text-lg font-semibold">
        {warzone.question}
      </h3>

      {/* OPTION A */}
      <button
        onClick={() => vote("A")}
        className="relative w-full p-3 rounded-lg bg-black border border-white/10 overflow-hidden"
      >
        <div
          className="absolute inset-y-0 left-0 bg-red-500/30 transition-all duration-300"
          style={{ width: `${percentA}%` }}
        />

        <div className="relative flex justify-between">
          <span>{warzone.optionA}</span>
          <span>{Math.round(percentA)}%</span>
        </div>
      </button>

      {/* OPTION B */}
      <button
        onClick={() => vote("B")}
        className="relative w-full p-3 rounded-lg bg-black border border-white/10 overflow-hidden"
      >
        <div
          className="absolute inset-y-0 left-0 bg-blue-500/30 transition-all duration-300"
          style={{ width: `${percentB}%` }}
        />

        <div className="relative flex justify-between">
          <span>{warzone.optionB}</span>
          <span>{Math.round(percentB)}%</span>
        </div>
      </button>

      <div className="text-xs text-white/50">
        {votesA + votesB} votes
      </div>
    </div>
  );
}