import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, watchHistoryTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const RecordBody = z.object({
  mediaType: z.enum(["movie", "tv", "trailer"]),
  mediaId: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  posterPath: z.string().max(500).nullable().optional(),
  backdropPath: z.string().max(500).nullable().optional(),
  progressPct: z.number().min(0).max(100),
  watchTimeSeconds: z.number().int().min(0).max(60 * 60 * 12).optional(),
  completed: z.boolean().optional(),
});

/* POST /api/watch-history — upsert a media's progress for current user */
router.post("/watch-history", async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Sign in to track watch history" });
  }
  const parsed = RecordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const data = parsed.data;
  const completed = data.completed ?? data.progressPct >= 90;

  try {
    await db
      .insert(watchHistoryTable)
      .values({
        userId: req.userId,
        mediaType: data.mediaType,
        mediaId: data.mediaId,
        title: data.title,
        posterPath: data.posterPath ?? null,
        backdropPath: data.backdropPath ?? null,
        progressPct: data.progressPct,
        watchTimeSeconds: data.watchTimeSeconds ?? 0,
        completed,
        lastWatchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [watchHistoryTable.userId, watchHistoryTable.mediaType, watchHistoryTable.mediaId],
        set: {
          title: data.title,
          posterPath: data.posterPath ?? null,
          backdropPath: data.backdropPath ?? null,
          progressPct: sql`GREATEST(${watchHistoryTable.progressPct}, ${data.progressPct})`,
          watchTimeSeconds: sql`GREATEST(${watchHistoryTable.watchTimeSeconds}, ${data.watchTimeSeconds ?? 0})`,
          // completion can never regress — once true, stays true
          completed: sql`${watchHistoryTable.completed} OR ${completed}`,
          lastWatchedAt: new Date(),
        },
      });
    res.json({ ok: true });
  } catch (err) {
    req.log?.error({ err: String(err) }, "watch-history record failed");
    res.status(500).json({ error: "Failed to record" });
  }
});

/* GET /api/watch-history/continue — recent partially-watched items */
router.get("/watch-history/continue", async (req, res) => {
  if (!req.userId) return res.json({ items: [] });
  const rows = await db
    .select()
    .from(watchHistoryTable)
    .where(and(eq(watchHistoryTable.userId, req.userId), eq(watchHistoryTable.completed, false)))
    .orderBy(desc(watchHistoryTable.lastWatchedAt))
    .limit(12);

  res.json({
    items: rows.map((r) => ({
      mediaType: r.mediaType,
      mediaId: r.mediaId,
      title: r.title,
      posterPath: r.posterPath,
      backdropPath: r.backdropPath,
      progressPct: r.progressPct,
      lastWatchedAt: r.lastWatchedAt.toISOString(),
    })),
  });
});

/* GET /api/watch-history — full history */
router.get("/watch-history", async (req, res) => {
  if (!req.userId) return res.json({ items: [] });
  const rows = await db
    .select()
    .from(watchHistoryTable)
    .where(eq(watchHistoryTable.userId, req.userId))
    .orderBy(desc(watchHistoryTable.lastWatchedAt))
    .limit(50);

  res.json({
    items: rows.map((r) => ({
      mediaType: r.mediaType,
      mediaId: r.mediaId,
      title: r.title,
      posterPath: r.posterPath,
      backdropPath: r.backdropPath,
      progressPct: r.progressPct,
      completed: r.completed,
      lastWatchedAt: r.lastWatchedAt.toISOString(),
    })),
  });
});

export default router;
