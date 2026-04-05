import { useState, useEffect, useRef } from "react";
import {
  Heart,
  Bookmark,
  Share2,
  Play,
  Volume2
} from "lucide-react";

interface Props {
  item: any;
}

interface TrailerState {
  status: "idle" | "loading" | "ready" | "error";
  url: string | null;
  ytKey: string | null;
}

export default function FeedCard({ item }: Props) {
  const { episode, film } = item;
  const cardRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [burst, setBurst] = useState(false);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [showSoundHint, setShowSoundHint] = useState(true);

  const [trailer, setTrailer] = useState<TrailerState>({
    status: "idle",
    url: null,
    ytKey: null,
  });

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.likes ?? 0);
  const lastTap = useRef(0);

  const sendCommand = (func: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func,
      }),
      "*"
    );
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.intersectionRatio >= 0.8),
      { threshold: 0.8 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setPaused(true);
      sendCommand("pauseVideo");
    } else {
      setPaused(false);
      sendCommand("playVideo");

      if (soundUnlocked) {
        setTimeout(() => sendCommand("unMute"), 200);
      }
    }
  }, [isVisible, soundUnlocked]);

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
  }, [isVisible]);

  const iframeSrc =
    trailer.status === "ready" && trailer.url
      ? `${trailer.url}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${trailer.ytKey}&enablejsapi=1&origin=${window.location.origin}`
      : undefined;

  const unlockSound = () => {
    if (!soundUnlocked) {
      setSoundUnlocked(true);
      sendCommand("unMute");
      sendCommand("playVideo");

      setTimeout(() => {
        setShowSoundHint(false);
      }, 400);
    }
  };

  const handleTap = () => {
    unlockSound();

    if (paused) {
      sendCommand("playVideo");
    } else {
      sendCommand("pauseVideo");
    }

    setPaused(!paused);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) triggerLike();
    lastTap.current = now;
  };

  const triggerLike = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount((c: number) => c + 1);
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
  };

  const handleShare = async (e:any) => {
    e.stopPropagation();
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: film.title,
        text: `Watch ${film.title}`,
        url
      });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative h-screen snap-start bg-black text-white overflow-hidden"
      onClick={() => {
        handleTap();
        handleDoubleTap();
      }}
    >
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="absolute inset-0 w-full h-full object-cover border-0 pointer-events-none"
        />
      )}

      {/* Cinematic tap for sound */}
      {showSoundHint && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className={`flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full text-white text-sm font-medium transition-all duration-500 ${soundUnlocked ? "opacity-0 scale-90" : "opacity-100 scale-100"}`}>
            <Volume2 className="w-5 h-5" />
            Tap for sound
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/70" />

      {burst && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <Heart className="w-24 h-24 text-[#DC143C] fill-[#DC143C] animate-ping" />
        </div>
      )}

      {paused && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black/50 w-16 h-16 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerLike();
          }}
        >
          <Heart
            className={`w-7 h-7 ${
              liked ? "text-[#DC143C] fill-[#DC143C]" : "text-white"
            }`}
          />
          <span className="text-xs">{likeCount}</span>
        </button>

        <button onClick={(e)=>{e.stopPropagation(); setSaved(!saved);}}>
          <Bookmark className={`w-7 h-7 ${saved ? "text-yellow-400 fill-yellow-400":"text-white"}`} />
        </button>

        <button onClick={handleShare}>
          <Share2 className="w-7 h-7 text-white" />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-20 p-4 pb-6 z-20">
        <h2 className="text-xl font-black">{film.title}</h2>
      </div>
    </div>
  );
}