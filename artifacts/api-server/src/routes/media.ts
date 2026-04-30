import { Router, type IRouter } from "express";
import { z } from "zod";
import fetch from "node-fetch";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  mediaReactionsTable,
  mediaCommentsTable,
  usersTable,
} from "@workspace/db";

const router: IRouter = Router();

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

const paramsSchema = z.object({
  type: z.enum(["movie", "tv"]),
  id: z.string().regex(/^\d+$/).max(12),
});

function requireAuth(req: import("express").Request, res: import("express").Response): number | null {
  if (!req.userId) {
    res.status(401).json({ error: "Sign in required" });
    return null;
  }
  return req.userId;
}

function parseParams(req: import("express").Request, res: import("express").Response) {
  const p = paramsSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: "invalid_params" });
    return null;
  }
  return p.data;
}

/* ============================================================
 * Details (TMDB proxy, lightweight — for the feed card chrome)
 * ============================================================ */
router.get("/media/:type/:id/details", async (req, res) => {
  const p = parseParams(req, res);
  if (!p) return;
  if (!TMDB_KEY) {
    res.status(503).json({ error: "tmdb_unconfigured" });
    return;
  }
  try {
    const url = `${TMDB_BASE}/${p.type}/${p.id}?api_key=${TMDB_KEY}&language=en-US`;
    const r = await fetch(url);
    if (!r.ok) {
      res.status(r.status).json({ error: "tmdb_failed" });
      return;
    }
    const data = (await r.json()) as Record<string, unknown> & {
      genres?: Array<{ name: string }>;
      runtime?: number;
      episode_run_time?: number[];
      release_date?: string;
      first_air_date?: string;
      number_of_seasons?: number;
      number_of_episodes?: number;
    };
    const dateStr = data.release_date || data.first_air_date || "";
    const year = dateStr ? Number(dateStr.slice(0, 4)) : null;
    const runtime =
      typeof data.runtime === "number"
        ? data.runtime
        : Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0
          ? data.episode_run_time[0]
          : null;
    res.json({
      title: (data.title as string) || (data.name as string) || "",
      year,
      runtime,
      overview: (data.overview as string) || "",
      genres: (data.genres ?? []).map((g) => g.name).slice(0, 4),
      voteAverage: typeof data.vote_average === "number" ? data.vote_average : null,
      voteCount: typeof data.vote_count === "number" ? data.vote_count : null,
      tagline: (data.tagline as string) || null,
      seasons: data.number_of_seasons ?? null,
      episodes: data.number_of_episodes ?? null,
    });
  } catch (e) {
    req.log?.error({ err: String(e) }, "media details failed");
    res.status(500).json({ error: "fetch_failed" });
  }
});

/* ============================================================
 * Reactions (like + bookmark)
 * ============================================================ */
async function getReactionState(mediaType: string, mediaId: string, userId: number | null) {
  const [counts, [commentRow]] = await Promise.all([
    db
      .select({ kind: mediaReactionsTable.kind, c: sql<number>`count(*)::int` })
      .from(mediaReactionsTable)
      .where(and(eq(mediaReactionsTable.mediaType, mediaType), eq(mediaReactionsTable.mediaId, mediaId)))
      .groupBy(mediaReactionsTable.kind),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(mediaCommentsTable)
      .where(and(eq(mediaCommentsTable.mediaType, mediaType), eq(mediaCommentsTable.mediaId, mediaId))),
  ]);

  const counts_by_kind = Object.fromEntries(counts.map((row) => [row.kind, Number(row.c)]));

  let liked = false;
  let saved = false;
  if (userId) {
    const mine = await db
      .select({ kind: mediaReactionsTable.kind })
      .from(mediaReactionsTable)
      .where(
        and(
          eq(mediaReactionsTable.userId, userId),
          eq(mediaReactionsTable.mediaType, mediaType),
          eq(mediaReactionsTable.mediaId, mediaId),
        ),
      );
    for (const r of mine) {
      if (r.kind === "like") liked = true;
      if (r.kind === "bookmark") saved = true;
    }
  }
  return {
    liked,
    saved,
    likeCount: counts_by_kind.like ?? 0,
    bookmarkCount: counts_by_kind.bookmark ?? 0,
    commentCount: Number(commentRow?.c ?? 0),
  };
}

router.get("/media/:type/:id/reactions", async (req, res) => {
  const p = parseParams(req, res);
  if (!p) return;
  try {
    const state = await getReactionState(p.type, p.id, req.userId ?? null);
    res.json(state);
  } catch (e) {
    req.log?.error({ err: String(e) }, "reactions read failed");
    res.status(500).json({ error: "read_failed" });
  }
});

async function addReaction(
  uid: number,
  mediaType: string,
  mediaId: string,
  kind: "like" | "bookmark",
) {
  await db
    .insert(mediaReactionsTable)
    .values({ userId: uid, mediaType, mediaId, kind })
    .onConflictDoNothing({
      target: [
        mediaReactionsTable.userId,
        mediaReactionsTable.mediaType,
        mediaReactionsTable.mediaId,
        mediaReactionsTable.kind,
      ],
    });
}

async function removeReaction(
  uid: number,
  mediaType: string,
  mediaId: string,
  kind: "like" | "bookmark",
) {
  await db
    .delete(mediaReactionsTable)
    .where(
      and(
        eq(mediaReactionsTable.userId, uid),
        eq(mediaReactionsTable.mediaType, mediaType),
        eq(mediaReactionsTable.mediaId, mediaId),
        eq(mediaReactionsTable.kind, kind),
      ),
    );
}

router.post("/media/:type/:id/like", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  const p = parseParams(req, res);
  if (!p) return;
  await addReaction(uid, p.type, p.id, "like");
  res.json(await getReactionState(p.type, p.id, uid));
});

router.delete("/media/:type/:id/like", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  const p = parseParams(req, res);
  if (!p) return;
  await removeReaction(uid, p.type, p.id, "like");
  res.json(await getReactionState(p.type, p.id, uid));
});

router.post("/media/:type/:id/bookmark", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  const p = parseParams(req, res);
  if (!p) return;
  await addReaction(uid, p.type, p.id, "bookmark");
  res.json(await getReactionState(p.type, p.id, uid));
});

router.delete("/media/:type/:id/bookmark", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  const p = parseParams(req, res);
  if (!p) return;
  await removeReaction(uid, p.type, p.id, "bookmark");
  res.json(await getReactionState(p.type, p.id, uid));
});

/* ============================================================
 * Comments
 * ============================================================ */
const commentBodySchema = z.object({
  text: z.string().trim().min(1).max(500),
});

router.get("/media/:type/:id/comments", async (req, res) => {
  const p = parseParams(req, res);
  if (!p) return;
  try {
    const rows = await db
      .select({
        id: mediaCommentsTable.id,
        userId: mediaCommentsTable.userId,
        text: mediaCommentsTable.text,
        createdAt: mediaCommentsTable.createdAt,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(mediaCommentsTable)
      .leftJoin(usersTable, eq(usersTable.id, mediaCommentsTable.userId))
      .where(
        and(
          eq(mediaCommentsTable.mediaType, p.type),
          eq(mediaCommentsTable.mediaId, p.id),
        ),
      )
      .orderBy(desc(mediaCommentsTable.createdAt))
      .limit(100);
    res.json(
      rows.map((r) => ({
        id: String(r.id),
        userId: r.userId,
        user: r.displayName || r.username || "Viewer",
        avatar: r.avatarUrl ?? null,
        text: r.text,
        createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
        mine: req.userId === r.userId,
      })),
    );
  } catch (e) {
    req.log?.error({ err: String(e) }, "comments read failed");
    res.status(500).json({ error: "read_failed" });
  }
});

router.post("/media/:type/:id/comments", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  const p = parseParams(req, res);
  if (!p) return;
  const body = commentBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const [inserted] = await db
      .insert(mediaCommentsTable)
      .values({
        userId: uid,
        mediaType: p.type,
        mediaId: p.id,
        text: body.data.text,
      })
      .returning();
    const [author] = await db
      .select({
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, uid));
    res.status(201).json({
      id: String(inserted.id),
      userId: uid,
      user: author?.displayName || author?.username || "Viewer",
      avatar: author?.avatarUrl ?? null,
      text: inserted.text,
      createdAt: inserted.createdAt instanceof Date ? inserted.createdAt.getTime() : Number(inserted.createdAt),
      mine: true,
    });
  } catch (e) {
    req.log?.error({ err: String(e) }, "comment insert failed");
    res.status(500).json({ error: "write_failed" });
  }
});

router.delete("/media/comments/:commentId", async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;
  const cid = Number(req.params.commentId);
  if (!Number.isFinite(cid) || cid <= 0) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  try {
    const result = await db
      .delete(mediaCommentsTable)
      .where(and(eq(mediaCommentsTable.id, cid), eq(mediaCommentsTable.userId, uid)))
      .returning({ id: mediaCommentsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "not_found_or_not_owner" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    req.log?.error({ err: String(e) }, "comment delete failed");
    res.status(500).json({ error: "delete_failed" });
  }
});

export { router as mediaRouter };
