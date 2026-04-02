import { useState, useEffect, useRef } from "react";
import {
  Heart,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Play,
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
  const [playInline, setPlayInline] = useState(false);
  const [unlocked, setUnlocked] = useState(false); // ✅ moved here
  const [trailer, setTrailer] = useState<TrailerState>({
    status: "idle",
    url: null,
    ytKey: null,
  });

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.likes ?? 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  /* visibility */
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

  /* auto play after unlock */
  useEffect(() => {
    if (unlocked && isVisible && trailer.status === "ready") {
      setPlayInline(true);
    }
  }, [unlocked, isVisible, trailer.status]);

  /* reset */
  useEffect(() => {
    if (!isVisible) {
      setIframeLoaded(false);
      setPlayInline(false);
    }
  }, [isVisible]);

  /* fetch trailer */
  useEffect(() => {
    if (!isVisible || trailer.status !== "idle") return;

    setTrailer((t) => ({ ...t, status: "loading" }));
    const mediaType = film.type === "tv" ? "tv" : "movie";

    fetch(`/api/tmdb/trailer/${mediaType}/${episode.trailerId}`)
      .then((r) => r.json())
      .then((data) =>
        setTrailer({
          status: "ready",
          url: data.url,
          ytKey: data.key,
        })
      )
      .catch(() =>
        setTrailer({
          status: "error",
          url: null,
          ytKey: null,
        })
      );
  }, [isVisible, trailer.status, episode.trailerId, film.type]);

  const iframeSrc =
    isVisible && playInline && trailer.status === "ready" && trailer.url
      ? `${trailer.url}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&controls=0&rel=0&loop=1&playlist=${trailer.ytKey}`
      : undefined;

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 350) triggerLike();
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

  const backgroundImage = film.backdrop || film.poster;

  return (
    <div
      ref={cardRef}
      className="relative h-screen snap-start bg-black text-white overflow-hidden"
      onClick={handleDoubleTap}
    >
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt={film.title}
          className={`absolute inset-0 w-full h-full object-cover ${
            iframeLoaded ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={() => setIframeLoaded(true)}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

      {/* FIRST TAP UNLOCK */}
      {!unlocked && trailer.status === "ready" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setUnlocked(true);
            setPlayInline(true);
          }}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          <div className="bg-[#DC143C] w-16 h-16 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* right actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        <button onClick={(e)=>{e.stopPropagation();triggerLike();}}>
          <Heart className={`w-7 h-7 ${liked ? "text-[#DC143C] fill-[#DC143C]" : "text-white"}`} />
          <span className="text-xs">{likeCount}</span>
        </button>

        <button>
          <Bookmark className="w-7 h-7 text-white" />
        </button>

        <button>
          <Share2 className="w-7 h-7 text-white" />
        </button>

        <button onClick={(e)=>{e.stopPropagation();onMuteToggle();}}>
          {muted ? <VolumeX className="w-7 h-7"/> : <Volume2 className="w-7 h-7"/>}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-20 p-4 pb-6 z-20">
        <h2 className="text-xl font-black">{film.title}</h2>
      </div>
    </div>
  );
}