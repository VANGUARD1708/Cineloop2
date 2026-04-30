import { useEffect, useState } from "react";

export interface Palette {
  primary: string;
  primaryRGB: string;
  isDark: boolean;
}

const cache = new Map<string, Palette>();

const DEFAULT_PALETTE: Palette = {
  primary: "#DC143C",
  primaryRGB: "220, 20, 60",
  isDark: true,
};

function relLum(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Extract a vivid dominant color from an image URL using the Canvas API.
 * Buckets pixels into 64-color cells, scores each cell by saturation × pixel-count,
 * and returns the winner. Cached per-URL across the session.
 */
export default function usePalette(imageUrl: string | null | undefined): Palette {
  const [palette, setPalette] = useState<Palette>(() => {
    if (imageUrl && cache.has(imageUrl)) return cache.get(imageUrl)!;
    return DEFAULT_PALETTE;
  });

  useEffect(() => {
    if (!imageUrl) {
      setPalette(DEFAULT_PALETTE);
      return;
    }
    const cached = cache.get(imageUrl);
    if (cached) {
      setPalette(cached);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    // TMDB image CDN doesn't send CORS headers, so route through the api-server
    // image proxy to make the bytes Canvas-readable. Other origins are passed through.
    const isTmdb = /^https?:\/\/image\.tmdb\.org\//.test(imageUrl);
    const src = isTmdb
      ? `/api/tmdb/img?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;
    img.onload = () => {
      if (cancelled) return;
      try {
        const W = 32;
        const H = 32;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, W, H);
        const { data } = ctx.getImageData(0, 0, W, H);

        const buckets = new Map<number, { r: number; g: number; b: number; n: number; score: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          // Skip near-black, near-white, and gray pixels (low saturation)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (max < 24 || min > 240) continue;
          if (sat < 0.18) continue;

          // Bucket into 4×4×4 = 64 cells
          const key = ((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6);
          const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, score: 0 };
          cur.r += r;
          cur.g += g;
          cur.b += b;
          cur.n += 1;
          cur.score += 1 + sat * 2;
          buckets.set(key, cur);
        }

        if (buckets.size === 0) {
          const result = DEFAULT_PALETTE;
          cache.set(imageUrl, result);
          setPalette(result);
          return;
        }

        let best: { r: number; g: number; b: number; n: number; score: number } | null = null;
        for (const v of buckets.values()) {
          if (!best || v.score > best.score) best = v;
        }
        if (!best) return;
        const r = Math.round(best.r / best.n);
        const g = Math.round(best.g / best.n);
        const b = Math.round(best.b / best.n);
        const lum = relLum(r, g, b);
        const result: Palette = {
          primary: `rgb(${r}, ${g}, ${b})`,
          primaryRGB: `${r}, ${g}, ${b}`,
          isDark: lum < 0.4,
        };
        cache.set(imageUrl, result);
        setPalette(result);
      } catch {
        setPalette(DEFAULT_PALETTE);
      }
    };
    img.onerror = () => setPalette(DEFAULT_PALETTE);
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return palette;
}
