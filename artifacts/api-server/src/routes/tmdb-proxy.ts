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

  const res = await fetch(
    `${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}`
  );

  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status}`);
  }

  return res.json();
}

/* videos */
router.get("/videos", async (req, res) => {
  try {
    const { id, type = "movie" } = req.query as Record<string, string>;

    if (!id) {
      return res.json({ results: [] });
    }

    const data = await tmdbFetch(`/${type}/${id}/videos`);

    const youtube = (data.results || []).filter(
      (v: any) => v.site === "YouTube"
    );

    const priority = [
      "Trailer",
      "Official Trailer",
      "Clip",
      "Teaser",
      "Featurette",
    ];

    let best =
      priority
        .map((p) => youtube.find((v: any) => v.type === p))
        .find(Boolean) || youtube[0];

    if (!best) {
      return res.json({ results: [] });
    }

    res.json({
      results: [best], // return only best video
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;