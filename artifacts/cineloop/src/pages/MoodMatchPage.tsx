import { useState, useRef, useEffect } from "react";
import { Sparkles, Wand2, Loader2, Star, Calendar, Film, Tv } from "lucide-react";

type Pick = {
  title: string;
  year: number | null;
  mediaType: "movie" | "tv";
  reason: string;
  vibe: string;
  tmdbId: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  voteAverage: number | null;
  releaseDate: string | null;
};

type MoodResponse = {
  prompt: string;
  picks: Pick[];
  generatedAt: string;
};

const SUGGESTION_CHIPS = [
  "Slow-burn neo-noir with a melancholic ending",
  "Mind-bending sci-fi like Annihilation or Arrival",
  "Cozy Sunday rewatch — comfort food cinema",
  "A24 horror that lingers for days",
  "Foreign-language gems from the last 5 years",
  "Cyberpunk dystopia with a soul",
  "Coming-of-age story that hits like a freight train",
  "Heist film with style and swagger",
];

const TMDB_IMG = "https://image.tmdb.org/t/p";

function formatYear(p: Pick): string {
  if (p.releaseDate) return p.releaseDate.slice(0, 4);
  if (p.year) return String(p.year);
  return "";
}

export default function MoodMatchPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MoodResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Cancel any in-flight request on unmount */
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function submit(p?: string) {
    const text = (p ?? prompt).trim();
    if (!text) return;

    /* Cancel any prior in-flight request so only the latest result is shown */
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPrompt(text);
    setLoading(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL;
      const r = await fetch(`${base}api/mood/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
        signal: controller.signal,
      });
      const data = await r.json();
      if (controller.signal.aborted) return;
      if (!r.ok) throw new Error(data?.error || "Failed");
      setResults(data as MoodResponse);
    } catch (e: any) {
      if (e?.name === "AbortError" || controller.signal.aborted) return;
      setError(e?.message || "Something went wrong");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

  return (
    <div className="w-full min-h-screen bg-background overflow-y-auto pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(220,20,60,0.35), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 30%, rgba(120,40,200,0.25), transparent 60%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles size={14} />
            CineLoop Pro · AI Concierge
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight tracking-tight mb-4">
            What are you in the
            <br />
            <span className="bg-gradient-to-r from-primary via-rose-400 to-violet-400 bg-clip-text text-transparent">
              mood for tonight?
            </span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mb-8">
            Describe a vibe, an actor, a director, a feeling — anything. Our AI
            curates 8 films and series with the reasoning behind every pick.
          </p>

          {/* Prompt input */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Something visually stunning with a quiet, devastating ending..."
              maxLength={500}
              rows={3}
              className="w-full bg-card/80 backdrop-blur border border-white/10 rounded-xl p-5 pr-36 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none text-base"
              data-testid="input-mood-prompt"
            />
            <button
              onClick={() => submit()}
              disabled={loading || !prompt.trim()}
              className="absolute right-3 bottom-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-rose-500 text-white font-semibold shadow-[0_0_20px_rgba(220,20,60,0.4)] hover:shadow-[0_0_28px_rgba(220,20,60,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="button-mood-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Curating
                </>
              ) : (
                <>
                  <Wand2 size={16} /> Match
                </>
              )}
            </button>
            <div className="absolute right-3 top-3 text-xs text-zinc-600">
              {prompt.length}/500
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => submit(chip)}
                className="px-3 py-1.5 rounded-full text-xs text-zinc-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all"
                data-testid={`chip-suggestion`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !results && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-xl bg-card/60 border border-white/5 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.picks.length > 0 && (
        <div ref={resultsRef} className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                Curated for you
              </p>
              <p className="text-zinc-200 text-sm md:text-base italic">
                "{results.prompt}"
              </p>
            </div>
            <span className="text-xs text-zinc-500 hidden md:block">
              {results.picks.length} picks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.picks.map((pick, i) => (
              <PickCard key={`${pick.tmdbId}-${i}`} pick={pick} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state intro */}
      {!loading && !results && !error && (
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4 text-center text-zinc-500 text-sm">
          Tap a suggestion above or type your own to begin.
        </div>
      )}
    </div>
  );
}

function PickCard({ pick, index }: { pick: Pick; index: number }) {
  const poster = pick.posterPath
    ? `${TMDB_IMG}/w500${pick.posterPath}`
    : null;
  const backdrop = pick.backdropPath
    ? `${TMDB_IMG}/w780${pick.backdropPath}`
    : poster;
  const year = formatYear(pick);

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-white/10 bg-card/60 hover:border-primary/40 transition-all"
      style={{ animation: `fadeUp 0.5s ease-out ${index * 60}ms both` }}
      data-testid="card-mood-pick"
    >
      {/* Backdrop */}
      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
        {backdrop && (
          <img
            src={backdrop}
            alt={pick.title}
            loading="lazy"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

        {/* Vibe badge */}
        {pick.vibe && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur border border-white/10 text-[10px] uppercase tracking-wider font-semibold text-rose-300">
            {pick.vibe}
          </div>
        )}

        {/* Media type badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur border border-white/10 text-[10px] uppercase tracking-wider font-semibold text-zinc-300 inline-flex items-center gap-1">
          {pick.mediaType === "tv" ? <Tv size={10} /> : <Film size={10} />}
          {pick.mediaType === "tv" ? "Series" : "Film"}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 -mt-8 relative">
        <div className="flex items-start gap-4">
          {poster && (
            <img
              src={`${TMDB_IMG}/w185${pick.posterPath}`}
              alt=""
              loading="lazy"
              className="w-16 h-24 rounded-md object-cover border border-white/20 shadow-xl flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-serif font-bold text-lg leading-tight mb-1 line-clamp-2">
              {pick.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
              {year && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} /> {year}
                </span>
              )}
              {pick.voteAverage != null && pick.voteAverage > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Star size={11} fill="currentColor" />{" "}
                  {pick.voteAverage.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed mt-3 italic">
          "{pick.reason}"
        </p>

        {pick.overview && (
          <p className="text-xs text-zinc-500 leading-relaxed mt-3 line-clamp-3">
            {pick.overview}
          </p>
        )}

        {pick.tmdbId && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <a
              href={`https://www.themoviedb.org/${pick.mediaType}/${pick.tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              View on TMDB →
            </a>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                `${pick.title} ${year} trailer`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-rose-300 hover:text-rose-200 transition-colors font-semibold"
            >
              Watch trailer →
            </a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
