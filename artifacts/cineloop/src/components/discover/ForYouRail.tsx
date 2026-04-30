import { Sparkles, Star } from "lucide-react";
import { useForYou } from "@/hooks/useDirectorMode";
import { useIdentity } from "@/hooks/useIdentity";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

export default function ForYouRail() {
  const { user } = useIdentity();
  const { data, isLoading, error } = useForYou(!!user);

  if (!user) return null;

  if (isLoading) {
    return (
      <section className="px-4 md:px-8 mb-8" data-testid="rail-for-you-loading">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-amber-300" />
          <h2 className="text-lg font-bold text-white">For You</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[160px] md:w-[180px] aspect-[2/3] rounded-lg bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !data) return null;

  if (data.needsHistory || data.picks.length === 0) {
    return (
      <section className="px-4 md:px-8 mb-8" data-testid="rail-for-you-empty">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-amber-300" />
          <h2 className="text-lg font-bold text-white">For You</h2>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 p-5 text-sm text-zinc-400">
          Watch a few titles and your AI director will start picking films for you.
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 md:px-8 mb-10" data-testid="rail-for-you">
      <div className="flex items-end justify-between mb-3 pr-2">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-300" />
          <h2 className="text-lg font-bold text-white">For You</h2>
        </div>
        {data.intro && (
          <p className="hidden md:block text-xs text-zinc-500 italic max-w-md text-right line-clamp-1">
            {data.intro}
          </p>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
        {data.picks.map((pick) => (
          <article
            key={`${pick.mediaType}:${pick.tmdbId}`}
            data-testid="card-for-you-pick"
            className="group flex-shrink-0 w-[160px] md:w-[180px] snap-start"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-amber-300/40 transition-all">
              {pick.posterPath ? (
                <img
                  src={`${TMDB_IMG}${pick.posterPath}`}
                  alt={pick.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center text-zinc-700 text-xs px-2 text-center">
                  {pick.title}
                </div>
              )}
              {pick.voteAverage != null && pick.voteAverage > 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-300">
                  <Star size={10} fill="currentColor" />
                  {pick.voteAverage.toFixed(1)}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[11px] leading-snug text-zinc-200 line-clamp-4">
                  {pick.take}
                </p>
              </div>
            </div>
            <div className="mt-2 px-0.5">
              <h3 className="text-sm font-semibold text-white truncate">
                {pick.title}
              </h3>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                <span>{pick.mediaType === "tv" ? "Series" : "Film"}</span>
                {pick.year && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span>{pick.year}</span>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
