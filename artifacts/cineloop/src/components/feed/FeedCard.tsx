import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Star,
  Play,
  ExternalLink,
} from "lucide-react";

interface Props {
  item: any;
  muted: boolean;
  onMuteToggle: () => void;
}

interface TrailerState {
  status: "idle" | "loading" | "ready" | "error";
  url: string | null;
  ytKey: string | null;
}

export default function FeedCard({ item, muted, onMuteToggle }: Props) {
  const { episode, film } = item;
  const cardRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [trailer, setTrailer] = useState<TrailerState>({ status: "idle", url: null, ytKey: null });
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.likes ?? 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Self-detect visibility via IntersectionObserver
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.intersectionRatio >= 0.6),
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch trailer lazily only when this card is first visible
  useEffect(() => {
    if (!isVisible || trailer.status !== "idle") return;

    setTrailer((t) => ({ ...t, status: "loading" }));
    const mediaType = film.type === "tv" ? "tv" : "movie";

    fetch(`/api/tmdb/trailer/${mediaType}/${episode.trailerId}`)
      .then((r) => {
        if (!r.ok) throw new Error("no trailer");
        return r.json();
      })
      .then((data) => {
        setTrailer({ status: "ready", url: data.url, ytKey: data.key });
      })
      .catch(() => {
        setTrailer({ status: "error", url: null, ytKey: null });
      });
  }, [isVisible, trailer.status, episode.trailerId, film.type]);

  // Build YouTube embed URL
  const iframeSrc =
    isVisible && trailer.status === "ready" && trailer.url
      ? `${trailer.url}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${trailer.ytKey}`
      : undefined;

  // When card goes invisible, reset loaded state so iframe re-loads clean on return
  useEffect(() => {
    if (!isVisible) setIframeLoaded(false);
  }, [isVisible]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      triggerLike();
    }
    lastTap.current = now;
  };

  const triggerLike = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount((c: number) => c + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
  };

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
      await navigator.share({ title: film.title, url: window.location.href });
    } catch {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  };

  const openOnYouTube = () => {
    if (trailer.ytKey) {
      window.open(`https://www.youtube.com/watch?v=${trailer.ytKey}`, "_blank");
    }
  };

  const backgroundImage = film.backdrop || film.poster;

  return (
    <div
      ref={cardRef}
      className="relative h-screen snap-start bg-black text-white overflow-hidden"
      onClick={handleDoubleTap}
    >
      {/* POSTER BACKGROUND — always visible */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt={film.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            iframeLoaded ? "opacity-0" : "opacity-100"
          }`}
          loading="lazy"
        />
      )}

      {/* YOUTUBE IFRAME — only when active + trailer ready */}
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          key={iframeSrc}
          src={iframeSrc}
          onLoad={() => setIframeLoaded(true)}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* LOADING SPINNER — while fetching trailer */}
      {isVisible && trailer.status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* GRADIENT OVERLAYS */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />

      {/* DOUBLE-TAP HEART */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Heart
            className="w-24 h-24 text-[#DC143C] fill-[#DC143C] animate-ping"
            style={{ animationIterationCount: 1, animationDuration: "0.6s" }}
          />
        </div>
      )}

      {/* RIGHT ACTIONS */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerLike();
          }}
          className="flex flex-col items-center gap-1"
        >
          <Heart
            className={`w-7 h-7 transition-colors ${
              liked ? "text-[#DC143C] fill-[#DC143C]" : "text-white drop-shadow"
            }`}
          />
          <span className="text-xs font-semibold drop-shadow">{formatCount(likeCount)}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark();
          }}
          className="flex flex-col items-center gap-1"
        >
          <Bookmark
            className={`w-7 h-7 transition-colors drop-shadow ${
              bookmarked ? "fill-[#F59E0B] text-[#F59E0B]" : "text-white"
            }`}
          />
          <span className="text-xs font-semibold drop-shadow">Save</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="flex flex-col items-center gap-1"
        >
          <Share2 className="w-7 h-7 text-white drop-shadow" />
          <span className="text-xs font-semibold drop-shadow">Share</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onMuteToggle();
          }}
          className="flex flex-col items-center gap-1"
        >
          {muted ? (
            <VolumeX className="w-7 h-7 text-white drop-shadow" />
          ) : (
            <Volume2 className="w-7 h-7 text-white drop-shadow" />
          )}
        </button>
      </div>

      {/* BOTTOM INFO */}
      <div className="absolute bottom-0 left-0 right-20 p-4 pb-6 z-20">
        {/* Type + Rating */}
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-[#DC143C] text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm uppercase">
            {film.type === "tv" ? "Series" : "Movie"}
          </span>
          {film.rating > 0 && (
            <span className="flex items-center gap-1 text-[#F59E0B] text-xs font-bold">
              <Star className="w-3 h-3 fill-[#F59E0B]" />
              {film.rating.toFixed(1)}
            </span>
          )}
          {film.year && (
            <span className="text-white/40 text-xs">{film.year}</span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-black leading-tight mb-1 drop-shadow-lg">
          {film.title}
        </h2>

        {/* Overview */}
        {film.overview && (
          <p className="text-xs text-white/70 line-clamp-2 mb-3 leading-relaxed">
            {film.overview}
          </p>
        )}

        {/* Tags */}
        {episode.tags?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {episode.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] text-white/60 border border-white/20 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Watch on YouTube button */}
        {trailer.status === "ready" && trailer.ytKey && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openOnYouTube();
            }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all backdrop-blur-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Watch on YouTube
          </button>
        )}

        {/* No trailer fallback */}
        {trailer.status === "error" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `https://www.youtube.com/results?search_query=${encodeURIComponent(film.title + " trailer")}`,
                "_blank"
              );
            }}
            className="flex items-center gap-2 bg-[#DC143C]/80 hover:bg-[#DC143C] text-white text-sm font-semibold px-4 py-2 rounded-full transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            Find Trailer
          </button>
        )}
      </div>

      {/* PROGRESS BAR — plays while video is active */}
      {isVisible && (
        <ProgressBar active={isVisible && iframeLoaded} />
      )}
    </div>
  );
}

function ProgressBar({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 0; // loop
        return p + 100 / 150; // ~150 ticks = ~60s estimated trailer
      });
    }, 400);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-30">
      <div
        className="h-full bg-[#DC143C] transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
