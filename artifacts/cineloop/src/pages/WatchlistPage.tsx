import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatchlistItem {
  id: number;
  title: string;
  episodeTitle: string;
  thumbnailUrl?: string;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("watchlist");
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const removeItem = (id: number) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem("watchlist", JSON.stringify(updated));
  };

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Bookmark size={48} className="opacity-20" />
        <p className="text-xl font-serif italic">Your Watchlist is empty</p>
        <p className="text-sm opacity-70">Save videos from the feed to watch later</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">
          Your Watchlist
        </h1>
        <p className="text-zinc-400 text-sm">
          Saved videos to watch later
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group rounded-lg overflow-hidden bg-zinc-900 border border-white/5"
          >
            {/* Thumbnail */}
            <div className="aspect-[9/16] relative">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-black" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Play Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
                  <Play className="text-white ml-1" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="text-white text-sm font-semibold line-clamp-1">
                {item.title}
              </h3>
              <p className="text-zinc-400 text-xs line-clamp-1">
                {item.episodeTitle}
              </p>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => removeItem(item.id)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={14} className="text-white" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}