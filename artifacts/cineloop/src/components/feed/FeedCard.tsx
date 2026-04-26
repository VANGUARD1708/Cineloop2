import { useState, useEffect, useRef, useMemo } from "react";
import {
  Heart,
  Bookmark,
  Share2,
  Play,
  Volume2,
  VolumeX
} from "lucide-react";

interface Props {
  item: any;
}

export default function FeedCard({ item }: Props) {
  const { episode, film } = item;

  const cardRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.likes ?? 0);

  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  const lastTap = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.6 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const sendCommand = (func: string) => {
    if (!iframeReady) return;

    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func,
        args: []
      }),
      "*"
    );
  };

  useEffect(() => {
    if (!isVisible) {
      setPaused(true);
      videoRef.current?.pause();
      sendCommand("pauseVideo");
    } else {
      setPaused(false);
      videoRef.current?.play().catch(() => {});
      sendCommand("playVideo");
      sendCommand("mute");
    }
  }, [isVisible, youtubeId, iframeReady]);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        if (!film?.id) return;

        const res = await fetch(
          `/api/tmdb/videos?id=${film.id}&type=${film.type || "movie"}`
        );

        const data = await res.json();

        const video =
          data?.results?.find(
            (v: any) => v.site === "YouTube" && v.type === "Trailer"
          ) ||
          data?.results?.find((v: any) => v.site === "YouTube");

        if (video?.key) setYoutubeId(video.key);
      } catch (e) {
        console.error("video load failed", e);
      }
    };

    loadVideo();
  }, [film?.id]);

  const iframeSrc = useMemo(() => {
    if (!youtubeId || typeof window === "undefined") return null;

    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&rel=0&loop=1&playlist=${youtubeId}&enablejsapi=1&origin=${window.location.origin}`;
  }, [youtubeId]);

  const handleTap = () => {
    if (episode.videoUrl) {
      paused
        ? videoRef.current?.play().catch(() => {})
        : videoRef.current?.pause();
    } else if (youtubeId) {
      paused ? sendCommand("playVideo") : sendCommand("pauseVideo");
    }

    setPaused(!paused);
  };

  const handleSoundToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (episode.videoUrl) {
      const newMuted = !muted;
      if (videoRef.current) videoRef.current.muted = newMuted;
      setMuted(newMuted);
      return;
    }

    muted ? sendCommand("unMute") : sendCommand("mute");
    setMuted(!muted);
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

  const handleShare = async (e: any) => {
    e.stopPropagation();
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: film.title,
        text: `Watch ${film.title}`,
        url,
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
      {episode.videoUrl ? (
        <video
          ref={videoRef}
          src={episode.videoUrl}
          muted
          loop
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : iframeSrc ? (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          loading="lazy"
          onLoad={() => setIframeReady(true)}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="absolute inset-0 w-full h-full object-cover border-0 pointer-events-none"
        />
      ) : (
        <img
          src={film.backdrop || film.poster}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/70 z-10" />

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

      <button
        onClick={handleSoundToggle}
        className="absolute top-6 right-4 z-50 bg-black/50 p-2 rounded-full"
      >
        {muted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

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

        <button
          onClick={(e) => {
            e.stopPropagation();
            setSaved(!saved);
          }}
        >
          <Bookmark
            className={`w-7 h-7 ${
              saved ? "text-yellow-400 fill-yellow-400" : "text-white"
            }`}
          />
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