import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VolumeControlProps {
  muted: boolean;
  volume: number; // 0..1
  playing?: boolean;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  className?: string;
}

const COLLAPSE_DELAY_MS = 1400;

/**
 * Cinematic mute / volume control for the feed.
 * - Tap = mute toggle
 * - Hover (desktop) or long-press (touch) reveals a vertical slider
 * - Animated equalizer bars when audio is on + playing
 * - Soft amber glow ring when unmuted, signalling "sound on"
 */
export default function VolumeControl({
  muted,
  volume,
  playing,
  onToggleMute,
  onVolumeChange,
  className,
}: VolumeControlProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const collapseTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  // Set when long-press has fired so we can swallow the synthetic click
  // that follows touchend (otherwise long-press would also toggle mute).
  const longPressTriggered = useRef(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const armCollapse = useCallback(() => {
    if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
    collapseTimer.current = window.setTimeout(() => {
      setExpanded(false);
    }, COLLAPSE_DELAY_MS);
  }, []);

  const cancelCollapse = useCallback(() => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    };
  }, []);

  const Icon = useMemo(() => {
    if (muted || volume === 0) return VolumeX;
    if (volume < 0.34) return Volume1;
    return Volume2;
  }, [muted, volume]);

  const audible = !muted && volume > 0;

  const computeFromPointerY = useCallback((clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    // top of track = volume 1, bottom = volume 0
    const ratio = 1 - (clientY - rect.top) / rect.height;
    onVolumeChange(Math.max(0, Math.min(1, ratio)));
  }, [onVolumeChange]);

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      cancelCollapse();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      computeFromPointerY(e.clientY);
    },
    [cancelCollapse, computeFromPointerY],
  );

  const onTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      computeFromPointerY(e.clientY);
    },
    [dragging, computeFromPointerY],
  );

  const onTrackPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setDragging(false);
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      armCollapse();
    },
    [armCollapse],
  );

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Suppress the synthetic click that follows a long-press touchend.
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onToggleMute();
    // Briefly flash the slider so the user knows they can fine-tune.
    setExpanded(true);
    armCollapse();
  };

  // Hover (desktop)
  const handleMouseEnter = () => {
    cancelCollapse();
    setExpanded(true);
  };
  const handleMouseLeave = () => {
    if (!dragging) armCollapse();
  };

  // Long-press (touch) opens the slider without toggling mute.
  const handleTouchStart = () => {
    longPressTriggered.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setExpanded(true);
      cancelCollapse();
    }, 400);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Note: longPressTriggered stays true until handleButtonClick consumes it.
  };

  // 'M' key on the toggle button mutes/unmutes; arrow keys live on the slider
  // (proper a11y semantics — see handleSliderKeyDown).
  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      onToggleMute();
    }
  };

  // Slider arrow / Home / End / PageUp / PageDown handling per WAI-ARIA APG.
  const handleSliderKeyDown = (e: React.KeyboardEvent) => {
    let next = volume;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        next = Math.min(1, volume + 0.05);
        break;
      case "ArrowDown":
      case "ArrowLeft":
        next = Math.max(0, volume - 0.05);
        break;
      case "PageUp":
        next = Math.min(1, volume + 0.1);
        break;
      case "PageDown":
        next = Math.max(0, volume - 0.1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    onVolumeChange(next);
    cancelCollapse();
    setExpanded(true);
    armCollapse();
  };

  const handleSliderFocus = () => {
    cancelCollapse();
    setExpanded(true);
  };
  const handleSliderBlur = () => {
    if (!dragging) armCollapse();
  };

  const fillPct = audible ? Math.round(volume * 100) : 0;

  return (
    <div
      className={cn("absolute top-6 right-4 z-50 flex items-center gap-2", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="volume-control"
    >
      {/* Animated equalizer bars when audio is on & playing */}
      <div
        className={cn(
          "flex items-end gap-[3px] h-5 transition-opacity duration-200",
          audible && playing ? "opacity-90" : "opacity-0",
        )}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.6)]"
            style={{
              animation: audible && playing ? `cl-eq 900ms ease-in-out ${i * 120}ms infinite` : "none",
              height: "30%",
            }}
          />
        ))}
      </div>

      {/* Vertical slider — slides in from the right */}
      <div
        className={cn(
          "relative overflow-visible transition-all duration-200 ease-out",
          expanded
            ? "w-9 opacity-100 translate-x-0 pointer-events-auto"
            : "w-0 opacity-0 translate-x-2 pointer-events-none",
        )}
      >
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerCancel={onTrackPointerUp}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleSliderKeyDown}
          onFocus={handleSliderFocus}
          onBlur={handleSliderBlur}
          className="relative mx-auto h-24 w-1.5 rounded-full bg-white/20 backdrop-blur-sm cursor-pointer touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
          role="slider"
          aria-label="Volume"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPct}
          aria-valuetext={`${fillPct}% volume${muted ? ", muted" : ""}`}
          tabIndex={expanded ? 0 : -1}
          data-testid="volume-slider"
        >
          {/* Filled portion */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.5)]"
            style={{ height: `${fillPct}%` }}
          />
          {/* Knob */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-transform",
              dragging && "scale-125",
            )}
            style={{ bottom: `calc(${fillPct}% - 6px)` }}
          />
        </div>
        {/* Volume number badge */}
        <div
          className={cn(
            "absolute -left-1 -top-6 -translate-x-full px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums tracking-wider text-amber-100 bg-black/70 backdrop-blur-sm border border-amber-500/30 transition-opacity",
            dragging || expanded ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          {fillPct}
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={handleButtonClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onKeyDown={handleButtonKeyDown}
        aria-label={muted ? "Unmute (long-press to adjust volume)" : "Mute"}
        aria-pressed={!muted}
        data-testid="button-volume-toggle"
        className={cn(
          "relative h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200",
          "border",
          audible
            ? "bg-gradient-to-br from-amber-500/20 to-rose-500/10 border-amber-400/60 shadow-[0_0_16px_-2px_rgba(252,211,77,0.55)]"
            : "bg-black/55 border-white/15 hover:border-white/30 hover:bg-black/70",
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] transition-colors",
            audible ? "text-amber-200" : "text-white",
          )}
        />
        {/* Pulse ring when audio is on */}
        {audible && (
          <span
            className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping pointer-events-none"
            aria-hidden
          />
        )}
      </button>

      {/* Local keyframes for the equalizer */}
      <style>{`
        @keyframes cl-eq {
          0%, 100% { height: 25%; }
          50% { height: 95%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="volume-control"] [aria-hidden] span {
            animation: none !important;
            height: 60% !important;
          }
          [data-testid="button-volume-toggle"] .animate-ping {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
