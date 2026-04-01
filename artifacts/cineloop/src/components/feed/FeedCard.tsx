"use client";

import { useState, useEffect, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share,
  Volume2,
  VolumeX,
} from "lucide-react";

interface Props {
  item: any;
  isActive: boolean;
  muted: boolean;
  setMuted: (v: boolean) => void;
  onWatch: (t: number) => void;
  resume: number;
  onLike: () => void;
}

export default function FeedCard({
  item,
  isActive,
  muted,
  setMuted,
  onWatch,
  resume,
  onLike,
}: Props) {
  const { episode, film } = item;

  const holdTimeout = useRef<any>(null);

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(resume);
  const [showComments, setShowComments] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [loaded, setLoaded] = useState(false);

  /* restore bookmark */
  useEffect(() => {
    const saved = localStorage.getItem("bookmark-" + episode.id);
    if (saved) setBookmarked(true);
  }, []);

  /* resume playback */
  useEffect(() => {
    if (isActive) setProgress(resume);
  }, [isActive, resume]);

  /* progress tracking */
  useEffect(() => {
    if (!isActive || paused) return;

    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + 0.4;
        onWatch(next);
        return next > 100 ? 100 : next;
      });
    }, 400);

    return () => clearInterval(id);
  }, [isActive, paused]);

  /* hide swipe hint */
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);

    if (next) {
      localStorage.setItem("bookmark-" + episode.id, "1");
    } else {
      localStorage.removeItem("bookmark-" + episode.id);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: film.title,
        text: "Check this out",
        url: window.location.href,
      });
    } catch {}
  };

  const src =
    episode.videoUrl && isActive && !paused
      ? `${episode.videoUrl}?autoplay=1&mute=${
          muted ? 1 : 0
        }&playsinline=1&controls=0`
      : null;

  return (
    <div
      onDoubleClick={() => {
        setLiked(!liked);
        onLike();
      }}
      onMouseDown={() => {
        holdTimeout.current = setTimeout(() => setPaused(true), 200);
      }}
      onMouseUp={() => {
        clearTimeout(holdTimeout.current);
        setPaused(false);
      }}
      onClick={() => setPaused((p) => !p)}
      className="relative h-screen snap-start bg-black text-white"
    >
      {/* loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
      )}

      {src && (
        <iframe
          src={src}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full"
          allow="autoplay"
        />
      )}

      {/* swipe hint */}
      {showHint && (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm pointer-events-none">
          Swipe up
        </div>
      )}

      {/* actions */}
      <div className="absolute right-3 bottom-32 flex flex-col gap-6 z-10">
        <button>
          <Heart
            className={`w-7 h-7 ${
              liked ? "text-red-500 fill-red-500" : ""
            }`}
          />
        </button>

        <button onClick={() => setShowComments(true)}>
          <MessageCircle />
        </button>

        <button onClick={toggleBookmark}>
          <Bookmark
            className={bookmarked ? "fill-white" : ""}
          />
        </button>

        <button onClick={handleShare}>
          <Share />
        </button>

        <button onClick={() => setMuted(!muted)}>
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
      </div>

      {/* text */}
      <div className="absolute bottom-24 left-4 right-20 z-10">
        <h2 className="text-xl font-bold">{film.title}</h2>
        <p className="text-xs opacity-60">
          {episode.createdAt}
        </p>
      </div>

      {/* progress */}
      {isActive && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* comments sheet */}
      {showComments && (
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-black border-t border-white/20 p-4 z-20">
          <button
            onClick={() => setShowComments(false)}
            className="mb-3"
          >
            Close
          </button>

          <div className="overflow-y-auto h-full">
            <p className="text-sm opacity-60">
              Comments coming soon...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}