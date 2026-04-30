import { Router, type IRouter } from "express";
import { z } from "zod";
import fetch from "node-fetch";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, watchHistoryTable, tasteProfilesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { chatRateLimit } from "../lib/rate-limit";
import { loadUserIfPresent } from "../lib/auth-guards";

const router: IRouter = Router();

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

const paramsSchema = z.object({
  type: z.enum(["movie", "tv"]),
  id: z.string().regex(/^\d+$/).max(12),
});

function parseParams(req: import("express").Request, res: import("express").Response) {
  const p = paramsSchema.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: "invalid_params" });
    return null;
  }
  return p.data;
}

/* ============================================================
 * CO-PILOT CHAT — /api/director/chat
 * Streams quick recommendations grounded in the user's history.
 * ============================================================ */
const chatBodySchema = z.object({
  message: z.string().trim().min(1).max(800),
  context: z
    .object({
      mediaType: z.enum(["movie", "tv"]).optional(),
      mediaId: z.string().max(12).optional(),
      title: z.string().max(200).optional(),
    })
    .optional(),
});

interface QuickPick {
  title: string;
  year: number | null;
  mediaType: "movie" | "tv";
  reason: string;
}

const chatResponseSchema = z.object({
  reply: z.string().min(1).max(800),
  picks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        year: z.number().int().nullable().optional(),
        mediaType: z.enum(["movie", "tv"]).default("movie"),
        reason: z.string().min(1).max(280),
      }),
    )
    .max(6)
    .default([]),
});

async function tmdbSearchMinimal(title: string, year: number | null, mediaType: "movie" | "tv") {
  if (!TMDB_KEY) return null;
  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    query: title,
    include_adult: "false",
  });
  if (year && mediaType === "movie") params.set("year", String(year));
  if (year && mediaType === "tv") params.set("first_air_date_year", String(year));
  try {
    const r = await fetch(`${TMDB_BASE}/search/${mediaType}?${params.toString()}`);
    if (!r.ok) return null;
    const data = (await r.json()) as { results?: Array<Record<string, unknown>> };
    const top = data.results?.[0];
    if (!top) return null;
    return {
      tmdbId: top.id as number,
      poster: top.poster_path ? `https://image.tmdb.org/t/p/w500${top.poster_path}` : null,
      backdrop: top.backdrop_path ? `https://image.tmdb.org/t/p/w780${top.backdrop_path}` : null,
      voteAverage: typeof top.vote_average === "number" ? top.vote_average : null,
    };
  } catch {
    return null;
  }
}

router.post("/director/chat", loadUserIfPresent, async (req, res) => {
  const body = chatBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  // Banned users can't chat at all.
  if (req.authUser?.isBanned) {
    res.status(403).json({ error: "account_banned" });
    return;
  }

  const uid = req.userId ?? null;
  const isPro = req.authUser?.isPro ?? false;
  const quota = await chatRateLimit(req, { userId: uid, ip: req.ip, isPro });
  res.setHeader("x-ratelimit-limit", String(quota.limit));
  res.setHeader("x-ratelimit-remaining", String(quota.remaining));
  res.setHeader("x-ratelimit-reset", String(Math.floor(quota.resetAt / 1000)));
  if (!quota.allowed) {
    res.status(429).json({
      error: "rate_limited",
      message: isPro
        ? "Daily chat limit reached. Resets at midnight UTC."
        : uid
        ? `Free plan: ${quota.limit} chats / day. Upgrade to Pro for unlimited.`
        : `Anonymous limit: ${quota.limit} chats / day. Sign in or upgrade to Pro for more.`,
      quota: { used: quota.used, limit: quota.limit, resetAt: quota.resetAt },
      upgrade: !isPro,
    });
    return;
  }

  let historyHints: string[] = [];
  let vibeHint: string | null = null;

  if (uid) {
    try {
      const recent = await db
        .select({ title: watchHistoryTable.title })
        .from(watchHistoryTable)
        .where(eq(watchHistoryTable.userId, uid))
        .orderBy(desc(watchHistoryTable.lastWatchedAt))
        .limit(8);
      historyHints = recent.map((r) => r.title).filter(Boolean);

      const [profile] = await db
        .select({ vibe: tasteProfilesTable.vibe })
        .from(tasteProfilesTable)
        .where(eq(tasteProfilesTable.userId, uid));
      vibeHint = profile?.vibe ?? null;
    } catch (e) {
      req.log?.warn({ err: String(e) }, "co-pilot history lookup failed");
    }
  }

  const ctx = body.data.context;
  const systemPrompt = `You are CineLoop's AI Director — a sharp, witty film concierge who answers like a discerning critic friend.

You can:
- Recommend specific titles (always real, lookup-able via TMDB)
- Riff on the user's current pick or watch history
- Answer in a conversational tone — never stiff, never preachy
- Keep "reply" under 3 sentences

Rules:
- ALWAYS return strict JSON in this shape: { "reply": "string", "picks": [ { "title": "...", "year": 1999, "mediaType": "movie", "reason": "1 short sentence" } ] }
- Include 0–4 picks ONLY when actually recommending titles. If the user is just chatting, picks can be [].
- Each "reason" is 1 short sentence, vivid.
- If unsure of a year, use null.
- mediaType MUST be "movie" or "tv".`;

  const userParts: string[] = [];
  if (vibeHint) userParts.push(`Viewer's taste vibe: ${vibeHint}`);
  if (historyHints.length > 0)
    userParts.push(`Recently watched: ${historyHints.slice(0, 8).join(", ")}`);
  if (ctx?.title) userParts.push(`Currently looking at: ${ctx.title}`);
  userParts.push(`User: ${body.data.message}`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userParts.join("\n") },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: z.infer<typeof chatResponseSchema>;
    try {
      parsed = chatResponseSchema.parse(JSON.parse(raw));
    } catch {
      res.json({
        reply: "Hmm — my brain glitched. Try rephrasing?",
        picks: [],
      });
      return;
    }

    const picks: QuickPick[] = parsed.picks ?? [];
    const enriched = await Promise.all(
      picks.slice(0, 4).map(async (p) => {
        const meta = await tmdbSearchMinimal(p.title, p.year ?? null, p.mediaType);
        return {
          title: p.title,
          year: p.year ?? null,
          mediaType: p.mediaType,
          reason: p.reason,
          tmdbId: meta?.tmdbId ?? null,
          poster: meta?.poster ?? null,
          backdrop: meta?.backdrop ?? null,
          voteAverage: meta?.voteAverage ?? null,
        };
      }),
    );

    res.json({ reply: parsed.reply, picks: enriched });
  } catch (e) {
    req.log?.error({ err: String(e) }, "co-pilot chat failed");
    res.status(500).json({ error: "ai_failed" });
  }
});

/* ============================================================
 * BEST-CLIP — /api/director/best-clip/:type/:id
 * AI ranks all available YouTube videos and picks the best hook.
 * Falls back to first Trailer if AI fails.
 * ============================================================ */
interface BestClipResult {
  youtubeId: string | null;
  kind: string | null;
  name: string | null;
  reason: string | null;
  aiCurated?: boolean;
}

// Server-side cache for best-clip — keeps OpenAI + TMDB cost flat at feed scale.
// 7-day TTL matches the client-side staleTime in useBestClip.
const BEST_CLIP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BEST_CLIP_MAX_ENTRIES = 5_000;
const bestClipCache = new Map<string, { value: BestClipResult; expiresAt: number }>();

function bestClipCacheGet(key: string): BestClipResult | null {
  const hit = bestClipCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    bestClipCache.delete(key);
    return null;
  }
  return hit.value;
}

function bestClipCacheSet(key: string, value: BestClipResult): void {
  // Cheap LRU-ish eviction: drop the oldest insertion when full.
  if (bestClipCache.size >= BEST_CLIP_MAX_ENTRIES) {
    const oldest = bestClipCache.keys().next().value;
    if (oldest) bestClipCache.delete(oldest);
  }
  bestClipCache.set(key, { value, expiresAt: Date.now() + BEST_CLIP_TTL_MS });
}

router.get("/director/best-clip/:type/:id", loadUserIfPresent, async (req, res) => {
  const p = parseParams(req, res);
  if (!p) return;
  if (!TMDB_KEY) {
    res.status(503).json({ error: "tmdb_unconfigured" });
    return;
  }

  const isPro = req.authUser?.isPro ?? false;
  // Pro users get AI-curated picks; free users get the deterministic heuristic.
  // Cache them under separate keys so they don't bleed into each other.
  const cacheKey = `${p.type}:${p.id}:${isPro ? "ai" : "heur"}`;
  const cached = bestClipCacheGet(cacheKey);
  if (cached) {
    res.setHeader("x-cache", "HIT");
    res.setHeader("x-tier", isPro ? "pro" : "free");
    res.json(cached);
    return;
  }

  try {
    const r = await fetch(`${TMDB_BASE}/${p.type}/${p.id}/videos?api_key=${TMDB_KEY}`);
    if (!r.ok) {
      res.status(r.status).json({ error: "tmdb_failed" });
      return;
    }
    const data = (await r.json()) as { results?: Array<Record<string, any>> };
    const youtube = (data.results ?? []).filter((v) => v.site === "YouTube");
    if (youtube.length === 0) {
      const empty: BestClipResult = { youtubeId: null, kind: null, name: null, reason: null };
      bestClipCacheSet(cacheKey, empty);
      res.setHeader("x-cache", "MISS");
      res.setHeader("x-tier", isPro ? "pro" : "free");
      res.json(empty);
      return;
    }

    // Rank candidates: official trailers > teasers > clips > featurettes; newer first.
    const score = (v: Record<string, any>): number => {
      const t = String(v.type || "").toLowerCase();
      const name = String(v.name || "").toLowerCase();
      let s = 0;
      if (t === "trailer") s += 50;
      if (t === "teaser") s += 30;
      if (t === "clip") s += 25;
      if (t === "featurette") s += 10;
      if (v.official) s += 15;
      if (name.includes("official")) s += 10;
      if (name.includes("opening")) s += 8;
      const year = v.published_at ? new Date(v.published_at).getFullYear() : 0;
      s += Math.min(10, Math.max(0, year - 2010));
      return s;
    };

    const ranked = [...youtube].sort((a, b) => score(b) - score(a));
    const fallback = ranked[0];

    // Try AI re-rank for top 5 — if AI fails, we still have the heuristic winner.
    const candidates = ranked.slice(0, 5).map((v, i) => ({
      idx: i,
      key: v.key as string,
      type: String(v.type || ""),
      name: String(v.name || ""),
    }));

    let aiPick: { idx: number; reason: string } | null = null;
    if (candidates.length > 1 && isPro) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5.4",
          max_completion_tokens: 200,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You pick the single most cinematic 6-second hook for a TikTok-style feed. Return strict JSON: { "idx": <number>, "reason": "<10 words max>" }',
            },
            {
              role: "user",
              content:
                `Pick the candidate that would hook a scroller in the first 6 seconds:\n` +
                candidates.map((c) => `idx=${c.idx} type=${c.type} title="${c.name}"`).join("\n"),
            },
          ],
        });
        const raw = completion.choices[0]?.message?.content ?? "{}";
        const j = JSON.parse(raw) as { idx?: number; reason?: string };
        if (typeof j.idx === "number" && j.idx >= 0 && j.idx < candidates.length) {
          aiPick = { idx: j.idx, reason: String(j.reason ?? "best hook").slice(0, 80) };
        }
      } catch (e) {
        req.log?.warn({ err: String(e) }, "best-clip AI pick failed; using heuristic");
      }
    }

    const winner = aiPick ? candidates[aiPick.idx] : { ...candidates[0] };
    const winnerVideo = ranked.find((v) => v.key === winner.key) ?? fallback;
    const result: BestClipResult = {
      youtubeId: winnerVideo.key,
      kind: String(winnerVideo.type || "").toLowerCase(),
      name: winnerVideo.name ?? null,
      reason: aiPick?.reason ?? "Top-ranked clip",
      aiCurated: Boolean(aiPick),
    };
    bestClipCacheSet(cacheKey, result);
    res.setHeader("x-cache", "MISS");
    res.setHeader("x-tier", isPro ? "pro" : "free");
    res.json(result);
  } catch (e) {
    req.log?.error({ err: String(e) }, "best-clip failed");
    res.status(500).json({ error: "best_clip_failed" });
  }
});

/* ============================================================
 * PRESENCE — /api/director/presence/:type/:id
 * Synthesized "X viewers right now" — deterministic per (mediaId, 5-min bucket)
 * so it feels live and shifts naturally, no fake DB writes needed.
 * ============================================================ */
router.get("/director/presence/:type/:id", async (req, res) => {
  const p = parseParams(req, res);
  if (!p) return;

  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  const seedStr = `${p.type}:${p.id}:${bucket}`;
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 0xffffffff;
  // Long-tail distribution: most titles low, a few hot
  const baseline = Math.floor(8 + u * 220);
  const popular = u > 0.85 ? Math.floor(baseline * (1 + (u - 0.85) * 12)) : baseline;
  const friendsWatching = u > 0.7 ? Math.floor((u - 0.7) * 10) : 0;

  res.json({
    viewersNow: popular,
    friendsWatching,
    bucket,
    refreshIn: 5 * 60 * 1000 - (Date.now() % (5 * 60 * 1000)),
  });
});

export { router as directorRouter };
