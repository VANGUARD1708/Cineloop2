import { useState, useEffect, useRef } from "react";
import {
  Heart,
  Bookmark,
  Share2,
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

export default function FeedCard({ item }: Props) {
  const { episode, film } = item;
  const cardRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [playInline, setPlayInline] = useState(false);
  const [paused, setPaused] = useState(false);

  const [unlocked, setUnlocked] = useState(() => {
    return localStorage.getItem("cineloop_unlocked") === "true";
  });

  const [burst, setBurst] = useState(false);

  const [trailer, setTrailer] = useState<TrailerState>({
    status: "idle",
    url: null,
    ytKey: null,
  });

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.likes ?? 0);
  const lastTap = useRef(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const sendCommand = (func: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func,
      }),
      "*"
    );
  };

  /* visibility observer */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.intersectionRatio >= 0.8),
      { threshold: 0.8 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* autoplay */
  useEffect(() => {
    if (isVisible && trailer.status === "ready") {
      setPlayInline(true);
      setPaused(false);
    }
  }, [isVisible, trailer.status]);

  /* pause when not visible */
  useEffect(() => {
    if (!isVisible) {
      setPaused(true);
      setPlayInline(false);
    }
  }, [isVisible]);

  /* preload */
  useEffect(() => {
    if (!isVisible || !trailer.url) return;

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://www.youtube.com";
    document.head.appendChild(preconnect);

    return () => {
      document.head.removeChild(preconnect);
    };
  }, [isVisible, trailer.url]);

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
      ? `${trailer.url}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&loop=1&playlist=${trailer.ytKey}&enablejsapi=1`
      : undefined;

  const handleTap = () => {
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

  const backgroundImage = film.backdrop || film.poster;

  return (
    <div
      ref={cardRef}
      className="relative h-screen snap-start bg-black text-white overflow-hidden"
      onClick={(e) => {
        handleTap();
        handleDoubleTap();
      }}
    >
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt={film.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-[8000ms] ${
            isVisible ? "scale-110" : "scale-100"
          }`}
        />
      )}

      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={() => {
            setIframeLoaded(true);

            setTimeout(() => {
              if (unlocked) sendCommand("unMute");
            }, 300);
          }}
          allow="autoplay; fullscreen"
          allowFullScreen
          className={`absolute inset-0 w-full h-full border-0 transition-transform duration-[7000ms] ${
            isVisible ? "scale-105" : "scale-100"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/70 mix-blend-multiply" />

      {/* film grain */}
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* like burst */}
      {burst && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <Heart className="w-24 h-24 text-[#DC143C] fill-[#DC143C] animate-ping" />
        </div>
      )}

      {/* pause icon */}
      {paused && unlocked && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black/50 w-16 h-16 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* first unlock */}
      {!unlocked && trailer.status === "ready" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setUnlocked(true);
            localStorage.setItem("cineloop_unlocked", "true");
            setPlayInline(true);

            setTimeout(() => {
              sendCommand("unMute");
            }, 300);
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

        <button>
          <Bookmark className="w-7 h-7 text-white" />
        </button>

        <button>
          <Share2 className="w-7 h-7 text-white" />
        </button>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-20 p-4 pb-6 z-20 transition-all duration-700 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <h2 className="text-xl font-black">{film.title}</h2>
      </div>
    </div>
  );
}