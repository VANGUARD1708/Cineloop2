import { useEffect, useState } from "react";
import { Play, Clock } from "lucide-react";
import { getImage } from "@/lib/tmdb";
import { useIdentity } from "@/hooks/useIdentity";

interface Item {
  mediaType: string;
  mediaId: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  progressPct: number;
  lastWatchedAt: string;
}

const BASE = import.meta.env.BASE_URL;

export default function ContinueWatchingStrip() {
  const { user } = useIdentity();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    fetch(`${BASE}api/watch-history/continue`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, [user]);

  if (!user || items.length === 0) return null;

  return (
    <div className="px-4 py-5 border-b border-white/5" data-testid="strip-continue-watching">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-rose-400" />
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Continue watching</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scroll-smooth">
        {items.map((it) => {
          const img = getImage(it.backdropPath || it.posterPath || undefined, "w500");
          return (
            <a
              key={`${it.mediaType}-${it.mediaId}`}
              href={`https://www.themoviedb.org/${it.mediaType === "tv" ? "tv" : "movie"}/${it.mediaId}`}
              target="_blank"
              rel="noreferrer"
              className="group relative flex-shrink-0 w-48 aspect-video rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all"
              data-testid="card-continue-item"
            >
              {img ? (
                <img src={img} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play size={18} className="text-black ml-0.5" fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <div className="text-xs font-semibold text-white truncate">{it.title}</div>
                <div className="mt-1.5 h-0.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${Math.min(100, Math.max(2, it.progressPct))}%` }}
                  />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
