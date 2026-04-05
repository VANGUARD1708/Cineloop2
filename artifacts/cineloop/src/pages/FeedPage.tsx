import { useState, useEffect, useCallback, useRef } from "react";
import FeedCard from "@/components/feed/FeedCard";
import { fetchFeed } from "@/lib/tmdb";

/* shuffle helper */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* remove duplicates */
function uniqueById(items: any[]) {
  const map = new Map();
  items.forEach((i) => map.set(i.episode.id, i));
  return Array.from(map.values());
}

export default function FeedPage() {
  const [feed, setFeed] = useState<any[]>([]);
  const [category, setCategory] = useState("foryou");
  const [loading, setLoading] = useState(false);

  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (cat: string, page: number, reset = false) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const items = await fetchFeed(cat, page);

      setFeed((prev) => {
        const merged = reset ? items : [...prev, ...items];
        const unique = uniqueById(merged);
        return reset ? shuffleArray(unique) : unique;
      });

      pageRef.current = page + 1;
    } catch (e) {
      console.error(e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  /* category change */
  useEffect(() => {
    setFeed([]);
    pageRef.current = 1;
    load(category, 1, true);

    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    localStorage.removeItem("cine_last_scroll");
  }, [category]);

  /* restore scroll */
  useEffect(() => {
    const saved = localStorage.getItem("cine_last_scroll");
    if (saved && containerRef.current && feed.length > 0) {
      containerRef.current.scrollTop = Number(saved);
    }
  }, [feed]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;

    localStorage.setItem("cine_last_scroll", String(el.scrollTop));

    const nearBottom =
      el.scrollTop + el.clientHeight >=
      el.scrollHeight - el.clientHeight * 1.5;

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
      {/* header */}
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
              onClick={() => setCategory(c.id)}
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

      {/* feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {feed.map((item) => (
          <FeedCard key={item.episode.id} item={item} />
        ))}

        {loading && (
          <div className="h-16 flex items-center justify-center text-white/40 text-sm">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}