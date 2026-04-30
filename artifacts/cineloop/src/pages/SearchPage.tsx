import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Search as SearchIcon, Star } from "lucide-react";
import { getImage } from "@/lib/tmdb";

type Filter = "all" | "movie" | "tv";

interface RawResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  media_type?: string;
}

interface Result {
  id: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  poster: string;
  rating: number;
  overview: string;
}

function getQuery(): string {
  if (typeof window === "undefined") return "";
  const u = new URL(window.location.href);
  return u.searchParams.get("q") || "";
}

export default function SearchPage() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState(getQuery());
  const [filter, setFilter] = useState<Filter>("all");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  /* keep textbox in sync if URL changes */
  useEffect(() => {
    const onPop = () => setQ(getQuery());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* fetch */
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.BASE_URL}api/tmdb/search?q=${encodeURIComponent(term)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        const mapped: Result[] = (data.results || [])
          .filter((r: RawResult) => r.media_type === "movie" || r.media_type === "tv" || r.title || r.name)
          .map((r: RawResult): Result => {
            const isTV = r.media_type === "tv" || (!r.title && !!r.name);
            return {
              id: r.id,
              type: isTV ? "tv" : "movie",
              title: r.title || r.name || "Untitled",
              year: (r.release_date || r.first_air_date || "").slice(0, 4),
              poster: getImage(r.poster_path, "w342"),
              rating: r.vote_average || 0,
              overview: r.overview || "",
            };
          });
        setResults(mapped);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  const filtered = useMemo(() => {
    if (filter === "all") return results;
    return results.filter((r) => r.type === filter);
  }, [results, filter]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    const url = term ? `/search?q=${encodeURIComponent(term)}` : "/search";
    navigate(url);
  }

  const empty = !loading && q.trim() && filtered.length === 0;

  return (
    <div className="min-h-screen w-full bg-background text-white p-4 md:p-10 overflow-y-auto pb-20">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Search</h1>
        <p className="text-sm text-zinc-500 mb-6">Movies, TV series, and trailers from across the catalog.</p>

        <form onSubmit={onSubmit} className="relative mb-6">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder="Try 'Dune', 'Succession', 'Christopher Nolan'…"
            className="w-full bg-card border border-white/10 rounded-md py-3.5 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none"
            data-testid="input-search-query"
          />
        </form>

        {/* filter chips */}
        <div className="flex gap-2 mb-6">
          {(["all", "movie", "tv"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? "bg-white text-black"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
              data-testid={`chip-filter-${f}`}
            >
              {f === "all" ? "All" : f === "movie" ? "Movies" : "TV Series"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Searching…
          </div>
        )}

        {!loading && !q.trim() && (
          <div className="text-center py-20 text-zinc-500">
            <SearchIcon size={40} className="mx-auto mb-3 opacity-40" />
            <p>Type to start searching.</p>
          </div>
        )}

        {empty && (
          <div className="text-center py-20 text-zinc-500" data-testid="text-empty-results">
            <p>Nothing found for "{q}". Try a different title.</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((r) => (
            <a
              key={`${r.type}-${r.id}`}
              href={`https://www.themoviedb.org/${r.type}/${r.id}`}
              target="_blank"
              rel="noreferrer"
              className="group block"
              data-testid="card-search-result"
            >
              <div className="aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden border border-white/5 group-hover:border-white/20 transition-all relative">
                {r.poster ? (
                  <img src={r.poster} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">No poster</div>
                )}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-black/70 text-white">
                  {r.type === "tv" ? "Series" : "Film"}
                </div>
                {r.rating > 0 && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-amber-400 text-[11px] font-bold flex items-center gap-1">
                    <Star size={10} fill="currentColor" />
                    {r.rating.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-semibold text-white line-clamp-1 group-hover:text-rose-300 transition-colors">{r.title}</div>
                <div className="text-xs text-zinc-500">{r.year || "—"}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
