"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import WarzoneCard from "@/components/trending/WarzoneCard";
import WarzoneSkeleton from "@/components/trending/WarzoneSkeleton";

interface Warzone {
  id: string;
  title: string;
  question: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  expiresAt?: string;
}

export default function TrendingPage() {
  const [warzones, setWarzones] = useState<Warzone[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  /* FETCH */
  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/warzones?page=${page}`);
      const data = await res.json();

      setWarzones((prev) => [...prev, ...data.results]);
      setPage((p) => p + 1);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
    setInitialLoading(false);
  }, [page, loading]);

  useEffect(() => {
    loadMore();
  }, []);

  /* REALTIME POLLING */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/warzones?page=1`);
        const data = await res.json();

        setWarzones((prev) => {
          const map = new Map(prev.map((w) => [w.id, w]));

          data.results.forEach((incoming: Warzone) => {
            const existing = map.get(incoming.id);

            if (existing) {
              map.set(incoming.id, {
                ...existing,
                votesA: incoming.votesA,
                votesB: incoming.votesB,
              });
            }
          });

          return Array.from(map.values());
        });
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  /* AUTO REMOVE EXPIRED */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setWarzones((prev) =>
        prev.filter((w) => {
          if (!w.expiresAt) return true;
          return new Date(w.expiresAt).getTime() > now;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /* SCROLL */
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
      loadMore();
    }
  };

  /* SORT */
  const ranked = useMemo(() => {
    return [...warzones].sort((a, b) => {
      const aVotes = a.votesA + a.votesB;
      const bVotes = b.votesA + b.votesB;
      return bVotes - aVotes;
    });
  }, [warzones]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen overflow-y-scroll bg-black text-white"
    >
      <div className="px-4 pt-24 pb-20">

        <h1 className="text-4xl font-bold mb-2">
          Trending
        </h1>

        <p className="text-white/60 mb-6">
          What the loop is obsessed with right now.
        </p>

        <div className="sticky top-20 z-20 bg-black py-3">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-xl">🔥</span>
            <h2 className="text-xl font-semibold">
              Active Warzones
            </h2>
          </div>
        </div>

        {initialLoading && (
          <div className="space-y-4 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <WarzoneSkeleton key={i} />
            ))}
          </div>
        )}

        {!initialLoading && (
          <div className="space-y-4 mt-4">
            {ranked.map((w) => (
              <WarzoneCard key={w.id} warzone={w} />
            ))}
          </div>
        )}

        {loading && !initialLoading && (
          <div className="space-y-4 mt-4">
            <WarzoneSkeleton />
            <WarzoneSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}