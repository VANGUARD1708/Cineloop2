import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  buildTasteProfile,
  generateBecauseYouWatched,
  generateDailyMood,
  generateForYou,
  getOrBuildTasteProfile,
  invalidateUserCache,
} from "../lib/recommendations";

const router: IRouter = Router();

function requireAuth(req: import("express").Request, res: import("express").Response): number | null {
  if (!req.userId) {
    res.status(401).json({ error: "Sign in required" });
    return null;
  }
  return req.userId;
}

/* GET /api/recommendations/taste-profile */
router.get("/recommendations/taste-profile", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  try {
    const profile = await getOrBuildTasteProfile(uid, (m, msg) => req.log?.info(m, msg));
    if (profile.historyCount === 0) {
      return res.json({ profile: null, needsHistory: true });
    }
    res.json({ profile, needsHistory: false });
  } catch (err) {
    req.log?.error({ err: String(err) }, "taste-profile failed");
    res.status(500).json({ error: "Failed to load taste profile" });
  }
});

/* POST /api/recommendations/refresh — force-rebuild profile and clear caches */
router.post("/recommendations/refresh", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  try {
    await invalidateUserCache(uid);
    const profile = await buildTasteProfile(uid, (m, msg) => req.log?.info(m, msg));
    res.json({ ok: true, profile });
  } catch (err) {
    req.log?.error({ err: String(err) }, "recommendations refresh failed");
    res.status(500).json({ error: "Failed to refresh" });
  }
});

/* GET /api/recommendations/for-you */
router.get("/recommendations/for-you", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  try {
    const result = await generateForYou(uid, (m, msg) => req.log?.info(m, msg));
    if (!result) return res.json({ picks: [], intro: "", needsHistory: true });
    res.json(result);
  } catch (err) {
    req.log?.error({ err: String(err) }, "for-you failed");
    res.status(500).json({ error: "Failed to load For You" });
  }
});

/* GET /api/recommendations/daily-mood */
router.get("/recommendations/daily-mood", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  try {
    const result = await generateDailyMood(uid, (m, msg) => req.log?.info(m, msg));
    if (!result) return res.status(503).json({ error: "Mood unavailable" });
    res.json(result);
  } catch (err) {
    req.log?.error({ err: String(err) }, "daily-mood failed");
    res.status(500).json({ error: "Failed to load mood" });
  }
});

/* GET /api/recommendations/because-you-watched/:mediaType/:mediaId — public */
const bywParamsSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  mediaId: z.string().min(1).max(20).regex(/^\d+$/),
});
router.get("/recommendations/because-you-watched/:mediaType/:mediaId", async (req, res) => {
  const parsed = bywParamsSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid media reference" });
  try {
    const result = await generateBecauseYouWatched(
      req.userId ?? null,
      parsed.data.mediaType,
      parsed.data.mediaId,
      (m, msg) => req.log?.info(m, msg),
    );
    if (!result) return res.json({ picks: [], sourceTitle: null });
    res.json(result);
  } catch (err) {
    req.log?.error({ err: String(err) }, "because-you-watched failed");
    res.status(500).json({ error: "Failed to load similar picks" });
  }
});

export default router;
