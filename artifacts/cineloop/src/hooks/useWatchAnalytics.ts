import { useEffect, useRef } from "react";

interface Args {
  isVisible: boolean;
  filmId?: number | string;
  filmType?: string;
  title?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
}

const BASE = import.meta.env.BASE_URL;

/**
 * Fires watch-progress POSTs as the user lingers on a feed card.
 * - 2s visible  -> 10% progress
 * - 8s visible  -> 35% progress
 * - 20s visible -> 70% progress
 * Each milestone fires once per mount.
 */
export function useWatchAnalytics({ isVisible, filmId, filmType, title, posterPath, backdropPath }: Args) {
  const fired = useRef<Set<number>>(new Set());
  const start = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!isVisible || !filmId) {
      start.current = null;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      return;
    }
    start.current = Date.now();

    const send = (pct: number) => {
      if (fired.current.has(pct)) return;
      fired.current.add(pct);
      fetch(`${BASE}api/watch-history`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: filmType || "movie",
          mediaId: String(filmId),
          title: title || "Untitled",
          posterPath: posterPath ?? null,
          backdropPath: backdropPath ?? null,
          progressPct: pct,
          completed: pct >= 90,
        }),
      }).catch(() => {});
    };

    timers.current.push(window.setTimeout(() => send(10), 2000));
    timers.current.push(window.setTimeout(() => send(35), 8000));
    timers.current.push(window.setTimeout(() => send(70), 20000));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [isVisible, filmId, filmType, title, posterPath, backdropPath]);
}
