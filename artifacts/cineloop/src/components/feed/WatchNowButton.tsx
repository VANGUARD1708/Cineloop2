import { useEffect, useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";

interface Props {
  filmId: number;
  type: "movie" | "tv";
  title: string;
}

interface WatchData {
  link: string | null;
  flatrate: any[];
  rent: any[];
  buy: any[];
}

export default function WatchNowButton({ filmId, type, title }: Props) {
  const [data, setData] = useState<WatchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/tmdb/watch/${type}/${filmId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setData(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [filmId, type]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data?.link) return;
    /*
      AFFILIATE MONETIZATION:
      JustWatch links can be wrapped with your affiliate ID via Impact
      Radius or Skimlinks. Once approved, transform `data.link` here:
        const url = `https://go.skimresources.com/?id=YOUR_ID&url=${encodeURIComponent(data.link)}`
    */
    window.open(data.link, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <button
        disabled
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold text-white/60"
      >
        <Loader2 size={12} className="animate-spin" />
        Finding stream...
      </button>
    );
  }

  if (!data?.link) {
    return null;
  }

  const provider =
    data.flatrate?.[0] || data.rent?.[0] || data.buy?.[0] || null;

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 rounded-full text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(220,20,60,0.4)]"
      aria-label={`Watch ${title} now`}
    >
      <PlayCircle size={14} />
      Watch Now
      {provider?.logo_path && (
        <img
          src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
          alt={provider.provider_name}
          className="w-4 h-4 rounded-sm ml-1"
        />
      )}
    </button>
  );
}
