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

export default router;
