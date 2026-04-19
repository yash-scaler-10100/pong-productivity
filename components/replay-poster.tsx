"use client";

import type { MatchData, PlayerId } from "@/lib/types";

const playerTone: Record<PlayerId, { label: string; color: string; glow: string }> = {
  you: { label: "YOU", color: "#00ffcc", glow: "rgba(0,255,204,0.55)" },
  teammate: { label: "MATE", color: "#ff00aa", glow: "rgba(255,0,170,0.55)" },
};

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function ReplayPoster({ match }: { match: MatchData }) {
  const ships = match.ships.slice(-10);
  const total = Math.max(1, ships.length);

  return (
    <section className="poster-frame rounded-[8px] p-5 text-white">
      <div className="relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/15 pb-4">
          <div>
            <p className="font-mono text-xs uppercase text-cyan-200/80">Final replay poster</p>
            <h2 className="neon-title font-arcade text-3xl uppercase tracking-[0] md:text-5xl">
              ChaosPong
            </h2>
          </div>
          <div className="text-right font-mono">
            <p className="text-sm text-white/60">SCORE</p>
            <p className="text-3xl font-black text-cyan-200">
              {match.score.you}:{match.score.teammate}
            </p>
          </div>
        </div>

        <svg
          className="mt-5 h-[340px] w-full overflow-visible"
          viewBox="0 0 920 340"
          role="img"
          aria-label="ChaosPong replay poster timeline"
        >
          <defs>
            <filter id="posterGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="timelineGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#00ffcc" />
              <stop offset="50%" stopColor="#ff00aa" />
              <stop offset="100%" stopColor="#fff200" />
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="904" height="324" rx="8" fill="#050506" stroke="#2affdf" opacity="0.72" />
          <path
            d="M70 170 C 215 72, 345 268, 475 168 S 715 54, 850 170"
            fill="none"
            stroke="url(#timelineGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#posterGlow)"
          />
          {ships.map((ship, index) => {
            const x = 70 + (index / Math.max(1, total - 1)) * 780;
            const y = 170 + Math.sin(index * 1.45) * 82;
            const tone = playerTone[ship.player];
            const textY = y > 170 ? y - 42 : y + 58;
            return (
              <g key={ship.id}>
                <circle cx={x} cy={y} r="17" fill={tone.color} opacity="0.2" />
                <circle cx={x} cy={y} r="9" fill={tone.color} filter="url(#posterGlow)">
                  <animate attributeName="r" values="8;15;8" dur="1.8s" begin={`${index * 0.14}s`} repeatCount="indefinite" />
                </circle>
                <line x1={x} y1={y} x2={x} y2={textY - 18} stroke={tone.color} strokeDasharray="4 8" opacity="0.65" />
                <text x={x} y={textY - 22} textAnchor="middle" fill={tone.color} fontSize="18" fontWeight="900">
                  {tone.label} {formatTime(ship.timestamp)}
                </text>
                <text x={x} y={textY + 2} textAnchor="middle" fill="#ffffff" fontSize="15" fontFamily="monospace">
                  {ship.text.slice(0, 24)}
                </text>
              </g>
            );
          })}
          <text x="460" y="312" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="900">
            {match.score.rallies} RALLIES - CHAOS LVL {match.score.chaos} - {match.combos} COMBOS
          </text>
        </svg>
      </div>
    </section>
  );
}
