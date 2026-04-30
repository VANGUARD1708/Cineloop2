import { Link } from "wouter";
import { Sparkles, RefreshCw, ArrowLeft, Film, Calendar, Tag } from "lucide-react";
import { useTasteProfile, useRefreshDirectorMode } from "@/hooks/useDirectorMode";
import { useIdentity } from "@/hooks/useIdentity";

export default function TastePage() {
  const { user, loading: identLoading } = useIdentity();
  const { data, isLoading } = useTasteProfile(!!user);
  const refresh = useRefreshDirectorMode();

  if (identLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-white p-6 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Sparkles size={32} className="text-amber-300 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">Sign in to see your taste</h1>
          <p className="text-sm text-zinc-400 mb-5">
            Your AI director needs to know who's watching before it can read your taste.
          </p>
          <Link
            href="/account"
            className="inline-block px-5 py-2.5 rounded-md bg-white text-black font-bold text-sm"
          >
            Go to account
          </Link>
        </div>
      </div>
    );
  }

  const profile = data?.profile ?? null;
  const needsHistory = data?.needsHistory ?? false;

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      {/* Hero */}
      <header className="relative px-4 md:px-8 pt-6 pb-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(800px 400px at 80% 0%, rgba(245,158,11,0.18), transparent 60%), radial-gradient(600px 300px at 10% 100%, rgba(244,63,94,0.18), transparent 60%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4"
          >
            <ArrowLeft size={14} />
            Back to discover
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-amber-300" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-amber-300/90 uppercase">
              Director's Read
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-3">
            Your Cinematic Taste
          </h1>
          {profile?.vibe && (
            <p
              className="text-lg md:text-xl text-zinc-300 italic leading-snug max-w-2xl"
              data-testid="text-taste-vibe"
            >
              "{profile.vibe}"
            </p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8">
        {isLoading && (
          <div className="space-y-4">
            <div className="h-32 rounded-xl bg-zinc-900/60 animate-pulse" />
            <div className="h-24 rounded-xl bg-zinc-900/60 animate-pulse" />
            <div className="h-24 rounded-xl bg-zinc-900/60 animate-pulse" />
          </div>
        )}

        {!isLoading && (needsHistory || !profile || profile.historyCount === 0) && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 text-center">
            <Film size={32} className="text-amber-300/70 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-1">Watch something first</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Press play on a few films and your AI director will start reading your taste.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-md bg-white text-black font-bold text-sm"
            >
              Open the feed
            </Link>
          </div>
        )}

        {!isLoading && profile && profile.historyCount > 0 && (
          <div className="space-y-6">
            {/* Summary */}
            <section
              className="rounded-xl border border-white/10 bg-zinc-900/40 p-5"
              data-testid="card-taste-summary"
            >
              <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2">
                Summary
              </h2>
              <p className="text-base leading-relaxed text-zinc-100">
                {profile.summary}
              </p>
            </section>

            {/* Genres */}
            {profile.topGenres.length > 0 && (
              <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
                <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3 flex items-center gap-1.5">
                  <Film size={12} /> Top genres
                </h2>
                <div className="flex flex-wrap gap-2" data-testid="list-taste-genres">
                  {profile.topGenres.map((g) => (
                    <span
                      key={g}
                      className="px-3 py-1.5 rounded-full text-sm bg-amber-500/10 border border-amber-500/30 text-amber-200"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Themes */}
            {profile.themes.length > 0 && (
              <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
                <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3 flex items-center gap-1.5">
                  <Tag size={12} /> Themes you gravitate toward
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.themes.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1.5 rounded-full text-sm bg-rose-500/10 border border-rose-500/30 text-rose-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Decades */}
            {profile.topDecades.length > 0 && (
              <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
                <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3 flex items-center gap-1.5">
                  <Calendar size={12} /> Eras
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.topDecades.map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1.5 rounded-full text-sm bg-violet-500/10 border border-violet-500/30 text-violet-200"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Refresh */}
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
              <span>
                Built from {profile.historyCount} watched item
                {profile.historyCount === 1 ? "" : "s"} · last refreshed{" "}
                {new Date(profile.lastRefreshedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <button
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
                data-testid="button-refresh-taste"
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={refresh.isPending ? "animate-spin" : ""}
                />
                {refresh.isPending ? "Re-reading…" : "Refresh"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
