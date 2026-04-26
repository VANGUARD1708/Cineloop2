import { ExternalLink, Sparkles } from "lucide-react";

interface Props {
  variant?: "house" | "sponsored";
  sponsor?: {
    title: string;
    tagline: string;
    cta: string;
    href: string;
    image?: string;
  };
}

const HOUSE_AD = {
  title: "Go ad-free with CineLoop Pro",
  tagline: "Unlimited swipes · HD trailers · Custom themes",
  cta: "Upgrade to Pro",
  href: "/pricing",
  image:
    "https://image.tmdb.org/t/p/w1280/9nzfyiYbmTUXWC4B2kwjl4NAlqO.jpg",
};

export default function AdCard({ variant = "house", sponsor }: Props) {
  const ad = sponsor || HOUSE_AD;

  return (
    <div className="relative h-screen snap-start bg-black text-white overflow-hidden">
      {ad.image && (
        <img
          src={ad.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40 z-10" />

      <div className="absolute top-6 left-4 z-30 flex items-center gap-2 px-2.5 py-1 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
          {variant === "sponsored" ? "Sponsored" : "Ad"}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-24">
        <h2 className="text-2xl md:text-3xl font-black leading-tight mb-2">
          {ad.title}
        </h2>
        <p className="text-sm text-white/80 mb-5">{ad.tagline}</p>

        <a
          href={ad.href}
          target={ad.href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-full font-bold text-sm transition-all shadow-[0_0_20px_rgba(220,20,60,0.5)]"
        >
          {ad.cta}
          <ExternalLink size={14} />
        </a>
      </div>

      {/*
        AdSense / AdMob slot:
        Replace this placeholder with an <ins class="adsbygoogle"> tag
        once your AdSense account is approved. Keep the same wrapper
        height (h-screen snap-start) so the feed flow stays smooth.
      */}
    </div>
  );
}
