import fetch from "node-fetch";
import { Router } from "express";

const router = Router();

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string) {
  if (!TMDB_KEY) {
    throw new Error("TMDB_API_KEY is not configured");
  }

  const sep = path.includes("?") ? "&" : "?";

  const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}`);

  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status}`);
  }

  return res.json();
}

/* trending — all media types */
router.get("/trending/all", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await tmdbFetch(`/trending/all/week?page=${page}`);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* trending — movies */
router.get("/trending/movie", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await tmdbFetch(`/trending/movie/week?page=${page}`);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* trending — tv (used as "series" tab) */
router.get("/trending-tv", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await tmdbFetch(`/trending/tv/week?page=${page}`);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* anime — animation genre, from Japan */
router.get("/anime", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await tmdbFetch(
      `/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=${page}`,
    );
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* search */
router.get("/search", async (req, res) => {
  try {
    const { q = "", page = "1" } = req.query as Record<string, string>;
    if (!q) {
      return res.json({ results: [] });
    }
    const data = await tmdbFetch(
      `/search/multi?query=${encodeURIComponent(q)}&page=${page}`,
    );
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* trailer for a single item — used by FeedCard lazy fetch */
router.get("/trailer/:mediaType/:id", async (req, res) => {
  try {
    const { mediaType, id } = req.params;
    const type = mediaType === "tv" ? "tv" : "movie";
    const data = await tmdbFetch(`/${type}/${id}/videos`);

    const youtube = (data.results || []).filter(
      (v: any) => v.site === "YouTube",
    );

    const priority = [
      "Trailer",
      "Official Trailer",
      "Teaser",
      "Clip",
      "Featurette",
    ];

    const best =
      priority.map((p) => youtube.find((v: any) => v.type === p)).find(Boolean) ||
      youtube[0] ||
      null;

    res.json({ key: best?.key || null, name: best?.name || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message, key: null });
  }
});

/* watch providers — for "Watch Now" deep links */
router.get("/watch/:mediaType/:id", async (req, res) => {
  try {
    const { mediaType, id } = req.params;
    const type = mediaType === "tv" ? "tv" : "movie";
    const data: any = await tmdbFetch(`/${type}/${id}/watch/providers`);

    const region = (req.query.region as string) || "US";
    const regionData = data?.results?.[region] || data?.results?.GB || null;

    res.json({
      link: regionData?.link || null,
      flatrate: regionData?.flatrate || [],
      rent: regionData?.rent || [],
      buy: regionData?.buy || [],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message, link: null });
  }
});

/* legacy /videos endpoint kept for backward compat */
router.get("/videos", async (req, res) => {
  try {
    const { id, type = "movie" } = req.query as Record<string, string>;

    if (!id) {
      return res.json({ results: [] });
    }

    const data = await tmdbFetch(`/${type}/${id}/videos`);

    const youtube = (data.results || []).filter(
      (v: any) => v.site === "YouTube",
    );

    const priority = [
      "Trailer",
      "Official Trailer",
      "Clip",
      "Teaser",
      "Featurette",
    ];

    const best =
      priority.map((p) => youtube.find((v: any) => v.type === p)).find(Boolean) ||
      youtube[0];

    if (!best) {
      return res.json({ results: [] });
    }

    res.json({ results: [best] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Image proxy — CORS-safe re-emission of TMDB poster/backdrop bytes so the
 * client palette extractor can read pixels via Canvas without taint errors.
 * Strictly scoped to image.tmdb.org with hard guardrails:
 *   - host allowlist (pre and post redirect)
 *   - 8s upstream timeout
 *   - 6 MiB response body cap
 *   - image/* content-type only
 * These prevent SSRF, redirect-laundering, and bandwidth/memory DoS.
 */
const IMG_PROXY_ALLOWED_HOST = "image.tmdb.org";
const IMG_PROXY_MAX_BYTES = 6 * 1024 * 1024;
const IMG_PROXY_TIMEOUT_MS = 8_000;

router.get("/img", async (req, res) => {
  const url = String(req.query.url || "");
  if (!url) {
    res.status(400).json({ error: "url required" });
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: "invalid url" });
    return;
  }
  if (parsed.host !== IMG_PROXY_ALLOWED_HOST || parsed.protocol !== "https:") {
    res.status(400).json({ error: "host not allowed" });
    return;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), IMG_PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(parsed.toString(), {
      // Re-validate the final host after any redirects. node-fetch follows by default;
      // we re-parse upstream.url and bail if it leaves the allowlist.
      signal: ac.signal as any,
      redirect: "follow",
    });
    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status || 502).end();
      return;
    }
    let finalHost = parsed.host;
    try {
      finalHost = new URL((upstream as any).url || parsed.toString()).host;
    } catch {
      // ignore — finalHost stays as the validated original
    }
    if (finalHost !== IMG_PROXY_ALLOWED_HOST) {
      res.status(400).json({ error: "redirect to disallowed host" });
      return;
    }

    const ct = upstream.headers.get("content-type") || "image/jpeg";
    if (!/^image\//i.test(ct)) {
      res.status(415).json({ error: "non-image content-type" });
      return;
    }

    // Pre-flight size check — trust content-length if present.
    const declaredLen = Number(upstream.headers.get("content-length") || "0");
    if (declaredLen > IMG_PROXY_MAX_BYTES) {
      res.status(413).json({ error: "image too large" });
      return;
    }

    res.setHeader("content-type", ct);
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("cache-control", "public, max-age=86400, immutable");

    // Stream with a running byte cap — abort if upstream lies about size.
    let total = 0;
    let aborted = false;
    const stream: any = upstream.body;
    stream.on("data", (chunk: Buffer) => {
      if (aborted) return;
      total += chunk.length;
      if (total > IMG_PROXY_MAX_BYTES) {
        aborted = true;
        try {
          ac.abort();
        } catch {
          /* noop */
        }
        if (!res.headersSent) res.status(413);
        res.end();
        return;
      }
      res.write(chunk);
    });
    stream.on("end", () => {
      if (!aborted) res.end();
    });
    stream.on("error", () => {
      if (!aborted && !res.headersSent) res.status(502);
      res.end();
    });
  } catch (e: any) {
    if (!res.headersSent) res.status(e?.name === "AbortError" ? 504 : 500);
    res.end();
  } finally {
    clearTimeout(timer);
  }
});

export default router;
