"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import FeedCard from "@/components/feed/FeedCard";
import { fetchTrending, mapToFeedItem, getTrailer } from "@/lib/tmdb";

import type { FeedItem } from "@workspace/api-client-react/src/generated/api.schemas";

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("foryou");
  const [loading, setLoading] = useState(false);

  /* AI learning refs */
  const watchTime = useRef<Map<string, number>>(new Map());
  const liked = useRef<Set<string>>(new Set());
  const skipCount = useRef<Map<string, number>>(new Map());

  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = useRef(0);

  /* LOAD DATA */
  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    let data;

    if (category === "trending" || category === "foryou") {
      data = await fetchTrending(page);
    }

    if (category === "movies") {
      data = await fetchTrending(page);
    }

    if (category === "series") {
      data = await fetch(
        `/api/tmdb/trending-tv?page=${page}`
      ).then((r) => r.json());
    }

    if (category === "anime") {
      data = await fetch(
        `/api/tmdb/anime?page=${page}`
      ).then((r) => r.json());
    }

    const mapped = (
      await Promise.all(
        data.results.map(async (movie: any) => {
          const trailer = await getTrailer(movie.id);
          if (!trailer) return null;

          const item = mapToFeedItem(movie);

          return {
            ...item,
            episode: {
              ...item.episode,
              videoUrl: trailer,
            },
          };
        })
      )
    ).filter(Boolean);

    setFeed((p) => [...p, ...mapped]);
    setPage((p) => p + 1);
    setLoading(false);
  }, [page, category, loading]);

  /* INITIAL LOAD */
  useEffect(() => {
    loadMore();
  }, [category]);

  /* SCROLL TRACKING */
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const index = Math.round(el.scrollTop / window.innerHeight);
    const prev = activeIndex.current;

    if (prev !== index) {
      const prevItem = feed[prev];
      if (prevItem) {
        const id = prevItem.episode.id;
        const watched = watchTime.current.get(id) || 0;

        if (watched < 10) {
          skipCount.current.set(
            id,
            (skipCount.current.get(id) || 0) + 1
          );
        }
      }
    }

    activeIndex.current = index;

    if (index > feed.length - 3) {
      loadMore();
    }
  };

  /* AI RANKING */
  const rankedFeed = useMemo(() => {
    if (category !== "foryou") return feed;

    return [...feed].sort((a, b) => {
      const aWatch = watchTime.current.get(a.episode.id) || 0;
      const bWatch = watchTime.current.get(b.episode.id) || 0;

      const aSkip = skipCount.current.get(a.episode.id) || 0;
      const bSkip = skipCount.current.get(b.episode.id) || 0;

      const aLike = liked.current.has(a.episode.id) ? 30 : 0;
      const bLike = liked.current.has(b.episode.id) ? 30 : 0;

      const aScore = aWatch + aLike - aSkip * 10;
      const bScore = bWatch + bLike - bSkip * 10;

      return bScore - aScore;
    });
  }, [feed, category]);

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden">

      {/* CATEGORY TABS */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-6 px-4 py-3 bg-black/80 backdrop-blur">
        {["foryou", "trending", "movies", "series", "anime"].map((c) => (
          <button
            key={c}
            onClick={() => {
              setFeed([]);
              setPage(1);
              setCategory(c);
            }}
            className={`capitalize ${
              category === c ? "text-white" : "text-white/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* FEED */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
      >
        {rankedFeed.map((item, i) => (
          <FeedCard
            key={item.episode.id}
            item={item}
            isActive={i === activeIndex.current}
            muted={false}
            setMuted={() => {}}
            resume={watchTime.current.get(item.episode.id) || 0}
            onWatch={(t) =>
              watchTime.current.set(item.episode.id, t)
            }
            onLike={() => liked.current.add(item.episode.id)}
          />
        ))}

        {loading && (
          <div className="text-center py-6 text-white/60">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}