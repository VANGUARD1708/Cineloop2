import { Moon, Sun, Sparkles } from "lucide-react";
import { useDailyMood } from "@/hooks/useDirectorMode";
import { useIdentity } from "@/hooks/useIdentity";

const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

export default function DailyMoodBanner() {
  const { user } = useIdentity();
  const { data, isLoading, error } = useDailyMood(!!user);

  if (!user) return null;

  if (isLoading) {
    return (
      <section className="px-4 md:px-8 mb-6" data-testid="banner-mood-loading">
        <div className="rounded-2xl bg-gradient-to-br from-violet-950/40 via-zinc-900 to-black border border-white/10 h-[140px] md:h-[160px] animate-pulse" />
      </section>
    );
  }

  if (error || !data) return null;

  const hour = new Date().getHours();
  const Icon = hour >= 18 || hour < 6 ? Moon : Sun;

  return (
    <section className="px-4 md:px-8 mb-8" data-testid="banner-mood">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950/60 via-zinc-900 to-rose-950/40 border border-white/10 p-5 md:p-7">
        {/* Background poster collage, very subtle */}
        <div className="absolute inset-0 flex opacity-10 pointer-events-none select-none">
          {data.picks.slice(0, 6).map((p) =>
            p.backdropPath ? (
              <img
                key={p.tmdbId}
                src={`https://image.tmdb.org/t/p/w300${p.backdropPath}`}
                alt=""
                className="flex-1 object-cover"
              />
            ) : (
              <div key={p.tmdbId} className="flex-1 bg-zinc-800" />
            ),
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Icon size={14} className="text-amber-300" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-amber-300/90 uppercase">
              Today's Mood
            </span>
          </div>
          <h2
            className="text-2xl md:text-3xl font-serif font-bold text-white mb-1.5"
            data-testid="text-mood-title"
          >
            {data.title}
          </h2>
          <p className="text-sm text-zinc-300 max-w-xl mb-4 leading-relaxed">
            {data.tagline}
          </p>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {data.picks.map((p) => (
              <div
                key={p.tmdbId}
                className="group flex-shrink-0 w-[80px] md:w-[90px]"
                data-testid="card-mood-pick"
                title={p.take}
              >
                <div className="aspect-[2/3] rounded-md overflow-hidden bg-zinc-800 border border-white/10 group-hover:border-amber-300/40 transition-colors">
                  {p.posterPath ? (
                    <img
                      src={`${TMDB_IMG}${p.posterPath}`}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[9px] text-zinc-600 px-1 text-center">
                      {p.title}
                    </div>
                  )}
                </div>
                <div className="mt-1 text-[10px] font-medium text-zinc-300 truncate">
                  {p.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Sparkles
          size={120}
          className="absolute -right-6 -top-6 text-amber-300/5 pointer-events-none"
        />
      </div>
    </section>
  );
}
