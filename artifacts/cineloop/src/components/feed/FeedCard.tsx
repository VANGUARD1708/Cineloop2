import { useState, useEffect, useRef, useMemo } from "react";
import {
  Heart,
  Bookmark,
  Share2,
  Play,
  Sparkles,
  MessageCircle,
  Star,
} from "lucide-react";
import WatchNowButton from "./WatchNowButton";
import CommentsSheet from "./CommentsSheet";
import AmbientParticles from "./AmbientParticles";
import PresenceBadge from "./PresenceBadge";
import VolumeControl from "./VolumeControl";
import { useWatchAnalytics } from "@/hooks/useWatchAnalytics";
import useMediaReactions from "@/hooks/useMediaReactions";
import useMediaDetails from "@/hooks/useMediaDetails";
import usePalette from "@/hooks/usePalette";
import useBestClip from "@/hooks/useBestClip";
import useVolumePref from "@/hooks/useVolumePref";

interface Props {
  item: any;
}

function tmdbPath(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/\/t\/p\/[^/]+(\/.+)$/);
  return m ? m[1] : null;
}

function formatRuntime(min: number | null | undefined): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export default function FeedCard({ item }: Props) {
  const { episode, film } = item;

  const cardRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const { muted, volume, setVolume, toggleMuted } = useVolumePref();
  const [burst, setBurst] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [trailerLoaded, setTrailerLoaded] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  const lastTap = useRef(0);

  const mediaType: string = film?.type || "movie";
  const mediaId: string = film?.id ? String(film.id) : "";

  const reactions = useMediaReactions(mediaType, mediaId);
  const details = useMediaDetails(mediaType, mediaId);
  // commentCount is bundled into the /reactions response — no extra fetch per card.
  const commentCount = reactions.commentCount;

  // Adaptive cinematic palette extracted client-side from the poster/backdrop.
  const palette = usePalette(film?.backdrop || film?.poster || null);

  // AI-curated best clip — overrides the default first-trailer pick when the AI
  // re-ranker has weighed in. Server-cached 7d, only fetched when the card is in view.
  const bestClip = useBestClip(mediaType, mediaId, { enabled: isVisible });

  // Spatial 3D tilt — pointer position relative to the card, throttled via rAF.
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const rafRef = useRef<number | null>(null);

  // Once the AI picks a clip we lock it — prevents a late /api/tmdb/videos
  // response from clobbering the AI choice (race fix).
  const aiClipLockedRef = useRef(false);

  // Gate motion effects on prefers-reduced-motion for accessibility.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useWatchAnalytics({
    isVisible,
    filmId: film?.id,
    filmType: film?.type,
    title: film?.title,
    posterPath: tmdbPath(film?.poster),
    backdropPath: tmdbPath(film?.backdrop),
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.6 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const sendCommand = (func: string, args: unknown[] = []) => {
    if (!iframeReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
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
      // Restore the user's persisted preference instead of always force-muting.
      if (muted) {
        sendCommand("mute");
      } else {
        sendCommand("unMute");
        sendCommand("setVolume", [Math.round(volume * 100)]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, youtubeId, iframeReady]);

  // Push muted/volume changes to the active media (HTML video or YouTube iframe).
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = volume;
    }
    if (iframeReady) {
      if (muted) {
        sendCommand("mute");
      } else {
        sendCommand("unMute");
        sendCommand("setVolume", [Math.round(volume * 100)]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, volume, iframeReady]);

  useEffect(() => {
    let cancelled = false;
    const loadVideo = async () => {
      try {
        if (!film?.id) return;
        const res = await fetch(
          `/api/tmdb/videos?id=${film.id}&type=${film.type || "movie"}`,
        );
        const data = await res.json();
        const video =
          data?.results?.find(
            (v: any) => v.site === "YouTube" && v.type === "Trailer",
          ) || data?.results?.find((v: any) => v.site === "YouTube");
        // Skip if (a) the component unmounted, (b) the AI has already locked a pick,
        // or (c) we already have a youtubeId. This makes the AI choice always win.
        if (cancelled || aiClipLockedRef.current) return;
        if (!youtubeId && video?.key) setYoutubeId(video.key);
      } catch {
        // poster fallback handles failure silently
      }
    };
    loadVideo();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film?.id, film?.type]);

  // Once the AI's best-clip arrives, lock it as the source of truth.
  useEffect(() => {
    if (bestClip.youtubeId && bestClip.youtubeId !== youtubeId) {
      aiClipLockedRef.current = true;
      setYoutubeId(bestClip.youtubeId);
      setIframeReady(false);
      setTrailerLoaded(false);
    } else if (bestClip.youtubeId) {
      aiClipLockedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestClip.youtubeId]);

  const iframeSrc = useMemo(() => {
    if (!youtubeId || typeof window === "undefined") return null;
    // youtube-nocookie + a stable origin are friendlier inside proxied iframes
    return (
      `https://www.youtube-nocookie.com/embed/${youtubeId}` +
      `?autoplay=1&mute=1&playsinline=1&controls=0&disablekb=1&fs=0` +
      `&iv_load_policy=3&modestbranding=1&rel=0&loop=1&playlist=${youtubeId}` +
      `&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    );
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

  // Mute/volume changes flow through the persisted hook + the sync effect above,
  // so VolumeControl just calls toggleMuted() and setVolume() directly.

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      reactions.like();
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    lastTap.current = now;
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reactions.liked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    reactions.toggleLike();
  };

  const handleShare = async (e: any) => {
    e.stopPropagation();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: film.title,
          text: `Watch ${film.title}`,
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const detailsData = details.data;
  const year = detailsData?.year ?? film?.year ?? null;
  const runtimeLabel = formatRuntime(detailsData?.runtime ?? null);
  const genres = detailsData?.genres ?? [];
  const rating = detailsData?.voteAverage ?? null;
  const overview = (detailsData?.overview || film?.overview || "").trim();

  const posterFallback = film?.backdrop || film?.poster || null;
  const hasTrailer = Boolean(episode.videoUrl) || Boolean(youtubeId);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (reduceMotion) return;
    if (e.pointerType === "touch") return; // mobile users get motion via scroll
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      // -4..+4 deg tilt — subtle parallax, never disorienting
      const ry = (x - 0.5) * 8;
      const rx = (0.5 - y) * 6;
      setTilt({ rx, ry });
    });
  };
  const handlePointerLeave = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <div
      ref={cardRef}
      className="relative h-screen snap-start bg-black text-white overflow-hidden"
      onClick={() => {
        handleTap();
        handleDoubleTap();
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-testid="feed-card"
      style={{
        perspective: "1400px",
        ["--cl-accent" as any]: palette.primary,
        ["--cl-accent-rgb" as any]: palette.primaryRGB,
      }}
    >
      {/* Spatial 3D layer — all media + overlays parallax together */}
      <div
        className="absolute inset-0 will-change-transform transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.04)`,
          transformStyle: "preserve-3d",
        }}
      >
      {/* Layer 1: poster fallback always rendered as the floor — guarantees we never
          show a black void while the trailer is fetching/blocked. */}
      {posterFallback && (
        <img
          src={posterFallback}
          alt=""
          aria-hidden
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            trailerLoaded ? "opacity-40" : "opacity-100"
          }`}
        />
      )}

      {/* Layer 2: native episode video (highest fidelity if present) */}
      {episode.videoUrl && (
        <video
          ref={videoRef}
          src={episode.videoUrl}
          muted
          loop
          playsInline
          autoPlay
          onLoadedData={() => setTrailerLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Layer 3: YouTube trailer — fades in once loaded so the poster is visible underneath. */}
      {!episode.videoUrl && iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          loading="lazy"
          onLoad={() => {
            setIframeReady(true);
            setTrailerLoaded(true);
          }}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={film?.title || "Trailer"}
          className={`absolute inset-0 w-full h-full object-cover border-0 pointer-events-none transition-opacity duration-700 ${
            iframeReady ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* "No trailer available" tag when truly absent */}
      {!hasTrailer && posterFallback && (
        <div className="absolute top-6 left-4 z-30 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] uppercase tracking-wider text-zinc-400">
          Poster
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 z-10 pointer-events-none" />
      </div>
      {/* /Spatial 3D layer */}

      {/* Adaptive cinematic vignette — palette-tinted, sits above media but below UI */}
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        aria-hidden
        style={{
          background: `radial-gradient(120% 80% at 50% 100%, rgba(${palette.primaryRGB}, 0.38), transparent 60%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Ambient drifting particles — palette-tinted dust, only when card is visible
          and the user hasn't asked for reduced motion. */}
      <AmbientParticles active={isVisible && !reduceMotion} rgb={palette.primaryRGB} />

      {/* Live presence + watch-party share — only fetched when the card is in view. */}
      {mediaId && (
        <PresenceBadge
          mediaType={mediaType}
          mediaId={mediaId}
          rgb={palette.primaryRGB}
          title={film?.title || "this title"}
          enabled={isVisible}
        />
      )}

      {/* AI-curated hook badge — appears when the AI re-ranker picked the trailer */}
      {bestClip.aiCurated && bestClip.youtubeId === youtubeId && bestClip.reason && (
        <div
          className="pointer-events-none absolute bottom-[152px] left-4 z-30 max-w-[260px] rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-md"
          style={{ boxShadow: `0 0 18px rgba(${palette.primaryRGB}, 0.3)` }}
          data-testid="ai-hook-badge"
          title={bestClip.reason}
        >
          <span className="mr-1 text-amber-300">✨ AI hook</span>
          <span className="line-clamp-1 align-middle text-white/70">{bestClip.reason}</span>
        </div>
      )}

      {burst && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <Heart
            className="w-24 h-24 animate-ping"
            style={{ color: palette.primary, fill: palette.primary }}
          />
        </div>
      )}

      {paused && hasTrailer && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-black/50 w-16 h-16 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      <VolumeControl
        muted={muted}
        volume={volume}
        playing={!paused && isVisible}
        onToggleMute={toggleMuted}
        onVolumeChange={setVolume}
      />

      {/* Action rail */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        <button
          onClick={handleLikeClick}
          className="flex flex-col items-center"
          aria-label={reactions.liked ? "Unlike" : "Like"}
          data-testid="feed-like-btn"
        >
          <Heart
            className={`w-7 h-7 transition-transform ${
              reactions.liked
                ? "text-[#DC143C] fill-[#DC143C] scale-110"
                : "text-white drop-shadow-md"
            }`}
          />
          <span className="text-[11px] font-semibold mt-0.5 drop-shadow-md">
            {formatCount(reactions.likeCount)}
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(true);
          }}
          className="flex flex-col items-center"
          aria-label="Open comments"
          data-testid="feed-comment-btn"
        >
          <MessageCircle className="w-7 h-7 text-white drop-shadow-md" />
          <span className="text-[11px] font-semibold mt-0.5 drop-shadow-md">
            {formatCount(commentCount)}
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            reactions.toggleBookmark();
          }}
          className="flex flex-col items-center"
          aria-label={reactions.saved ? "Remove from watchlist" : "Save to watchlist"}
          data-testid="feed-bookmark-btn"
        >
          <Bookmark
            className={`w-7 h-7 ${
              reactions.saved
                ? "text-yellow-400 fill-yellow-400"
                : "text-white drop-shadow-md"
            }`}
          />
        </button>

        <button onClick={handleShare} aria-label="Share" className="flex flex-col items-center">
          <Share2 className="w-7 h-7 text-white drop-shadow-md" />
        </button>
      </div>

      {item.sponsored && (
        <div className="absolute top-6 left-4 z-30 flex items-center gap-1.5 px-2.5 py-1 bg-accent/90 backdrop-blur-sm rounded-full">
          <Sparkles size={12} className="text-black" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-black">
            Sponsored
          </span>
        </div>
      )}

      {/* Bottom info card */}
      <div className="absolute bottom-0 left-0 right-20 p-4 pb-6 z-20">
        <h2
          className="text-xl font-black mb-1 leading-tight drop-shadow-lg"
          data-testid="feed-title"
        >
          {film.title}
        </h2>

        {/* Metadata strip */}
        {(year || runtimeLabel || rating || genres.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-zinc-200 mb-2 drop-shadow">
            {year && <span className="font-medium">{year}</span>}
            {runtimeLabel && (
              <>
                <span className="text-zinc-500">•</span>
                <span>{runtimeLabel}</span>
              </>
            )}
            {rating !== null && rating > 0 && (
              <>
                <span className="text-zinc-500">•</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                </span>
              </>
            )}
            {genres.length > 0 && (
              <>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-300">{genres.slice(0, 2).join(" / ")}</span>
              </>
            )}
          </div>
        )}

        {/* Overview — clamped, expandable */}
        {overview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOverview((s) => !s);
            }}
            className="block text-left text-[13px] text-zinc-300 mb-3 leading-snug drop-shadow"
            data-testid="feed-overview"
          >
            <span className={showOverview ? "" : "line-clamp-2"}>{overview}</span>
            {overview.length > 120 && (
              <span className="text-zinc-500 ml-1 text-[12px]">
                {showOverview ? "less" : "more"}
              </span>
            )}
          </button>
        )}

        <WatchNowButton filmId={film.id} type={film.type} title={film.title} />
      </div>

      <CommentsSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        mediaType={mediaType}
        mediaId={mediaId}
        mediaTitle={film?.title}
      />
    </div>
  );
}
