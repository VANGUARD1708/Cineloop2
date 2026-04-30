import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search as SearchIcon, X } from "lucide-react";
import { getImage } from "@/lib/tmdb";

interface RawResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface Suggestion {
  id: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  poster: string;
}

const BASE = import.meta.env.BASE_URL;

export default function SearchBar() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}api/tmdb/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        const mapped: Suggestion[] = (data.results || [])
          .filter((r: RawResult) => r.media_type === "movie" || r.media_type === "tv" || r.title || r.name)
          .slice(0, 6)
          .map((r: RawResult): Suggestion => {
            const isTV = r.media_type === "tv" || (!r.title && !!r.name);
            return {
              id: r.id,
              type: isTV ? "tv" : "movie",
              title: r.title || r.name || "Untitled",
              year: (r.release_date || r.first_air_date || "").slice(0, 4),
              poster: getImage(r.poster_path, "w92"),
            };
          });
        setResults(mapped);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  function gotoResults(term?: string) {
    const t = (term ?? query).trim();
    if (!t) return;
    navigate(`/search?q=${encodeURIComponent(t)}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-full">
      <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") gotoResults();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search films, series…"
        className="w-full bg-black/60 border border-white/10 pl-9 pr-9 py-2 text-sm text-white rounded-md focus:border-white/30 focus:outline-none"
        data-testid="input-header-search"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}

      {open && query && (
        <div className="absolute top-full left-0 right-0 bg-zinc-950 border border-white/10 mt-2 rounded-lg max-h-96 overflow-auto z-50 shadow-2xl">
          {loading && <div className="p-3 text-xs text-zinc-500">Searching…</div>}

          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-zinc-500">No matches.</div>
          )}

          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => {
                setQuery(r.title);
                gotoResults(r.title);
              }}
              className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 text-left transition-colors"
              data-testid="suggestion-item"
            >
              {r.poster ? (
                <img src={r.poster} alt="" className="w-9 h-14 rounded object-cover bg-zinc-900" />
              ) : (
                <div className="w-9 h-14 rounded bg-zinc-900" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm truncate">{r.title}</div>
                <div className="text-[11px] text-zinc-500">{r.year || "—"} · {r.type === "tv" ? "Series" : "Film"}</div>
              </div>
            </button>
          ))}

          {results.length > 0 && (
            <button
              onClick={() => gotoResults()}
              className="w-full p-3 text-center text-xs font-bold text-rose-400 hover:bg-white/5 border-t border-white/5"
            >
              See all results for "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
