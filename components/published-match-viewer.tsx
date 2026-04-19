"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RadioTower } from "lucide-react";
import { ReplayPoster } from "@/components/replay-poster";
import { Button } from "@/components/ui/button";
import type { MatchData } from "@/lib/types";

export function PublishedMatchViewer({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMatch() {
      try {
        const response = await fetch(`/api/get-match/${id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Remote match unavailable");
        }
        const data = (await response.json()) as MatchData;
        if (active) setMatch(data);
      } catch {
        const local = localStorage.getItem(`chaospong-match-${id}`);
        if (local) {
          if (active) setMatch(JSON.parse(local) as MatchData);
          return;
        }
        if (active) setError("That match is not in the broadcast archive.");
      }
    }

    loadMatch();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="chaos-shell min-h-screen p-4 text-white">
      <div className="lightning" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-4">
        <header className="arcade-panel flex flex-wrap items-center justify-between gap-4 rounded-[8px] p-4">
          <div>
            <p className="font-mono text-xs uppercase text-cyan-200/80">Published broadcast</p>
            <h1 className="neon-title font-arcade text-4xl uppercase tracking-[0] md:text-6xl">
              ChaosPong Replay
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2" size={18} />
              New Match
            </Link>
          </Button>
        </header>

        {!match && !error ? (
          <div className="arcade-panel flex min-h-[420px] items-center justify-center rounded-[8px]">
            <div className="flex items-center gap-3 font-mono text-cyan-100">
              <Loader2 className="animate-spin" size={24} />
              Tuning neon antenna...
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="arcade-panel rounded-[8px] p-8 text-center">
            <RadioTower className="mx-auto mb-4 text-fuchsia-200" size={44} />
            <p className="font-arcade text-3xl uppercase tracking-[0] text-fuchsia-100">Signal Lost</p>
            <p className="mt-2 font-mono text-white/70">{error}</p>
          </div>
        ) : null}

        {match ? (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <div className="arcade-panel rounded-[8px] p-4">
                <p className="font-mono text-xs uppercase text-white/50">You</p>
                <p className="font-arcade text-4xl text-cyan-100">{match.score.you}</p>
              </div>
              <div className="arcade-panel rounded-[8px] p-4">
                <p className="font-mono text-xs uppercase text-white/50">Teammate</p>
                <p className="font-arcade text-4xl text-fuchsia-100">{match.score.teammate}</p>
              </div>
              <div className="arcade-panel rounded-[8px] p-4">
                <p className="font-mono text-xs uppercase text-white/50">Rallies</p>
                <p className="font-arcade text-4xl text-yellow-100">{match.score.rallies}</p>
              </div>
              <div className="arcade-panel rounded-[8px] p-4">
                <p className="font-mono text-xs uppercase text-white/50">Combos</p>
                <p className="font-arcade text-4xl text-cyan-100">{match.combos}</p>
              </div>
            </section>
            <ReplayPoster match={match} />
          </>
        ) : null}
      </div>
    </main>
  );
}
