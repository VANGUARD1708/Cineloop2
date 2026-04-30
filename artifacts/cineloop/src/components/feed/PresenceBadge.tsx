import { useEffect, useState } from "react";
import { Eye, Share2, Check } from "lucide-react";
import usePresence from "@/hooks/usePresence";

interface Props {
  mediaType: string;
  mediaId: string;
  rgb: string;
  title: string;
  enabled?: boolean;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function PresenceBadge({ mediaType, mediaId, rgb, title, enabled }: Props) {
  const { viewersNow } = usePresence(mediaType, mediaId, { enabled });
  const [copied, setCopied] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Tiny pulse every time the count changes
  useEffect(() => {
    if (!viewersNow) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [viewersNow]);

  const shareWatchParty = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const token = Math.random().toString(36).slice(2, 10);
      const url = new URL(window.location.href);
      url.pathname = "/";
      url.searchParams.set("watch", `${mediaType}:${mediaId}`);
      url.searchParams.set("party", token);
      const link = url.toString();
      const shareData = {
        title: `Watch "${title}" together on CineLoop`,
        text: `Watch party: ${title}`,
        url: link,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // fall through to clipboard
        }
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  if (viewersNow <= 0) return null;

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1.5"
      data-testid="presence-strip"
    >
      <div
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md"
        style={{ boxShadow: `0 0 18px rgba(${rgb}, 0.25)` }}
      >
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${pulse ? "scale-125" : ""}`}
          style={{
            background: `rgb(${rgb})`,
            transition: "transform 600ms ease-out",
          }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: `rgb(${rgb})`,
              animation: "cineloop-presence-ping 1.6s ease-out infinite",
            }}
          />
        </span>
        <Eye className="h-3 w-3 text-white/80" />
        <span data-testid="text-presence-count">{formatCount(viewersNow)} watching</span>
      </div>
      <button
        type="button"
        onClick={shareWatchParty}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md transition hover:bg-white/15"
        data-testid="button-watch-party"
        title="Start a watch party"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Share2 className="h-3 w-3" />}
        <span>{copied ? "Link copied" : "Watch party"}</span>
      </button>
      <style>{`
        @keyframes cineloop-presence-ping {
          0% { transform: scale(1); opacity: 0.8; }
          80%, 100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
