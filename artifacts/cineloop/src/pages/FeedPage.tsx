import { useState, useEffect, useCallback, useRef } from "react";
import FeedCard from "@/components/feed/FeedCard";
import { fetchFeed } from "@/lib/tmdb";

export default function FeedPage() {
  const [feed, setFeed] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("foryou");
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  const load = useCallback(async (cat: string, pg: number, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const items = await fetchFeed(cat, pg);
      setFeed((prev) => (reset ? items : [...prev, ...items]));
      pageRef.current = pg + 1;
      setPage(pg + 1);
    } catch (e) {
      console.error(e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Reset and load when category changes
  useEffect(() => {
    setFeed([]);
    pageRef.current = 1;
    load(category, 1, true);
  }, [category]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * 2;
    if (nearBottom && !loadingRef.current) {
      load(category, pageRef.current);
    }
  };

  const CATEGORIES = [
    { id: "foryou", label: "For You" },
    { id: "trending", label: "Trending" },
    { id: "movies", label: "Movies" },
    { id: "series", label: "Series" },
    { id: "anime", label: "Anime" },
  ];

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden relative">
      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent pb-4">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-lg font-black tracking-widest">
            CINE<span className="text-[#DC143C]">LOOP</span>
          </span>
        </div>
        <div className="flex gap-1 px-4 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                if (category !== c.id) setCategory(c.id);
              }}
              className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-full transition-all ${
                category === c.id
                  ? "bg-[#DC143C] text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* FEED */}
      <div
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {feed.length === 0 && loading ? (
          // Skeleton cards while first load
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-screen snap-start bg-zinc-900 animate-pulse" />
          ))
        ) : (
          feed.map((item) => (
            <FeedCard
              key={item.episode.id}
              item={item}
              muted={muted}
              onMuteToggle={() => setMuted((m) => !m)}
            />
          ))
        )}

        {feed.length > 0 && loading && (
          <div className="h-16 flex items-center justify-center text-white/40 text-sm snap-start">
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}
