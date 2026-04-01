import { Router, type IRouter } from "express";

const router: IRouter = Router();

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string) {
  if (!TMDB_KEY) {
    throw new Error("TMDB_API_KEY is not configured");
  }
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

router.get("/tmdb/trending-tv", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await tmdbFetch(`/trending/tv/week?page=${page}`);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/tmdb/anime", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await tmdbFetch(
      `/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=${page}`
    );
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/tmdb/trending/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { page = "1" } = req.query as Record<string, string>;
    const mediaType = ["movie", "tv", "all"].includes(type) ? type : "movie";
    const data = await tmdbFetch(`/trending/${mediaType}/week?page=${page}`);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/tmdb/search", async (req, res) => {
  try {
    const { q = "", page = "1" } = req.query as Record<string, string>;
    const data = await tmdbFetch(
      `/search/multi?query=${encodeURIComponent(q)}&page=${page}`
    );
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Returns the first YouTube trailer embed URL for a movie or TV show
router.get("/tmdb/trailer/:mediaType/:id", async (req, res) => {
  try {
    const { mediaType, id } = req.params;
    const safeType = ["movie", "tv"].includes(mediaType) ? mediaType : "movie";
    const data = await tmdbFetch(`/${safeType}/${id}/videos`);
    const trailer = data.results?.find(
      (v: any) =>
        v.site === "YouTube" &&
        (v.type === "Trailer" || v.type === "Teaser" || v.type === "Clip")
    );
    if (!trailer) {
      res.status(404).json({ error: "No trailer found" });
      return;
    }
    res.json({ key: trailer.key, url: `https://www.youtube.com/embed/${trailer.key}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
