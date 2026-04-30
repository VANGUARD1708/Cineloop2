import fetch from "node-fetch";
import { z } from "zod";
import { and, count, desc, eq, sql } from "drizzle-orm";
import {
  db,
  watchHistoryTable,
  tasteProfilesTable,
  recommendationsCacheTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

/* ============================================================
 * Types
 * ============================================================ */

export interface DirectorPick {
  mediaType: "movie" | "tv";
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  voteAverage: number | null;
  take: string; // AI-written one-line "Director's take"
}

export interface ForYouPayload {
  picks: DirectorPick[];
  intro: string;
  generatedAt: string;
}

export interface DailyMoodPayload {
  title: string;
  tagline: string;
  picks: DirectorPick[];
  generatedAt: string;
}

export interface TasteProfileView {
  topGenres: string[];
  topDecades: string[];
  themes: string[];
  vibe: string;
  summary: string;
  historyCount: number;
  lastRefreshedAt: string;
}

/* ============================================================
 * TMDB helpers
 * ============================================================ */

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
  genre_ids?: number[];
  popularity?: number;
}

const MOVIE_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 10762: "Kids", 9648: "Mystery",
  10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics", 37: "Western",
};

function genreNamesFor(item: TmdbItem, mediaType: "movie" | "tv"): string[] {
  const map = mediaType === "tv" ? TV_GENRES : MOVIE_GENRES;
  return (item.genre_ids ?? []).map((id) => map[id]).filter(Boolean) as string[];
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!TMDB_KEY) return null;
  const qs = new URLSearchParams({ api_key: TMDB_KEY, ...params });
  try {
    const r = await fetch(`${TMDB_BASE}${path}?${qs.toString()}`);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/* Pull the canonical year from an item */
function yearOf(item: TmdbItem, mediaType: "movie" | "tv"): number | null {
  const d = mediaType === "tv" ? item.first_air_date : item.release_date;
  if (!d) return null;
  const y = parseInt(d.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function decadeOf(year: number | null): string | null {
  if (!year) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

function tmdbToDirectorPickBase(item: TmdbItem, mediaType: "movie" | "tv"): Omit<DirectorPick, "take"> {
  return {
    mediaType,
    tmdbId: item.id,
    title: (mediaType === "tv" ? item.name : item.title) ?? "Untitled",
    year: yearOf(item, mediaType),
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    overview: item.overview ?? null,
    voteAverage: item.vote_average ?? null,
  };
}

/* ============================================================
 * Cache helpers
 * ============================================================ */

async function readCache<T>(userId: number, key: string): Promise<T | null> {
  const [row] = await db
    .select()
    .from(recommendationsCacheTable)
    .where(
      and(
        eq(recommendationsCacheTable.userId, userId),
        eq(recommendationsCacheTable.cacheKey, key),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row.payload as T;
}

async function writeCache<T>(userId: number, key: string, payload: T, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await db
    .insert(recommendationsCacheTable)
    .values({ userId, cacheKey: key, payload: payload as object, expiresAt })
    .onConflictDoUpdate({
      target: [recommendationsCacheTable.userId, recommendationsCacheTable.cacheKey],
      set: { payload: payload as object, expiresAt, generatedAt: new Date() },
    });
}

export async function invalidateUserCache(userId: number): Promise<void> {
  await db
    .delete(recommendationsCacheTable)
    .where(eq(recommendationsCacheTable.userId, userId));
}

/* ============================================================
 * Taste profile
 * ============================================================ */

const tasteAiSchema = z.object({
  topGenres: z.array(z.string().min(1).max(40)).max(8),
  topDecades: z.array(z.string().min(2).max(8)).max(6),
  themes: z.array(z.string().min(1).max(60)).max(8),
  vibe: z.string().min(1).max(200),
  summary: z.string().min(1).max(400),
});

const TASTE_SYSTEM_PROMPT = `You are CineLoop's AI taste analyst. You read a viewer's recent watch history and infer their cinematic taste.

Rules:
- topGenres: 3-6 genre labels (e.g. "Neo-noir", "Slow cinema", "A24 horror", "Korean thrillers"). Specific is better than generic.
- topDecades: 1-4 decade labels like "1970s", "2010s", "Contemporary"
- themes: 3-6 short thematic phrases (e.g. "moral ambiguity", "found family", "urban loneliness")
- vibe: ONE sentence capturing the overall aesthetic ("You like films that feel like rainy 3am drives.")
- summary: 1-2 sentences describing the viewer as if you're their personal critic. Confident, vivid, not generic.

If history is sparse, infer cautiously and say so in the summary.

Output STRICT JSON ONLY:
{ "topGenres": [...], "topDecades": [...], "themes": [...], "vibe": "...", "summary": "..." }`;

export async function buildTasteProfile(userId: number, log?: (m: object, msg: string) => void): Promise<TasteProfileView> {
  const history = await db
    .select({
      mediaType: watchHistoryTable.mediaType,
      mediaId: watchHistoryTable.mediaId,
      title: watchHistoryTable.title,
      progressPct: watchHistoryTable.progressPct,
      completed: watchHistoryTable.completed,
      lastWatchedAt: watchHistoryTable.lastWatchedAt,
    })
    .from(watchHistoryTable)
    .where(eq(watchHistoryTable.userId, userId))
    .orderBy(desc(watchHistoryTable.lastWatchedAt))
    .limit(50);

  // Sample size for the prompt is capped at 50, but we persist the TRUE total
  // history count so drift detection in getOrBuildTasteProfile remains correct
  // for users with more than 50 watched items.
  const totalRows = await db
    .select({ c: count() })
    .from(watchHistoryTable)
    .where(eq(watchHistoryTable.userId, userId));
  const historyCount = Number(totalRows[0]?.c ?? history.length);

  if (history.length === 0) {
    const empty: TasteProfileView = {
      topGenres: [],
      topDecades: [],
      themes: [],
      vibe: "",
      summary: "Watch a few titles and I'll start learning your taste.",
      historyCount: 0,
      lastRefreshedAt: new Date().toISOString(),
    };
    return empty;
  }

  const compactList = history
    .map((h) => `- ${h.title} (${h.mediaType}, ${Math.round(h.progressPct)}%${h.completed ? ", completed" : ""})`)
    .join("\n");

  const userPrompt = `Watch history (most recent first):\n${compactList}\n\nProduce the JSON.`;

  let parsed: z.infer<typeof tasteAiSchema>;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TASTE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw);
    parsed = tasteAiSchema.parse(json);
  } catch (err) {
    log?.({ err: String(err) }, "buildTasteProfile: AI failed, returning fallback");
    parsed = {
      topGenres: [],
      topDecades: [],
      themes: [],
      vibe: "",
      summary: "Still learning your taste — keep watching.",
    };
  }

  await db
    .insert(tasteProfilesTable)
    .values({
      userId,
      topGenres: parsed.topGenres,
      topDecades: parsed.topDecades,
      themes: parsed.themes,
      vibe: parsed.vibe,
      summary: parsed.summary,
      historyCount,
      lastRefreshedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tasteProfilesTable.userId,
      set: {
        topGenres: parsed.topGenres,
        topDecades: parsed.topDecades,
        themes: parsed.themes,
        vibe: parsed.vibe,
        summary: parsed.summary,
        historyCount,
        lastRefreshedAt: new Date(),
      },
    });

  return {
    ...parsed,
    historyCount,
    lastRefreshedAt: new Date().toISOString(),
  };
}

export async function getOrBuildTasteProfile(
  userId: number,
  log?: (m: object, msg: string) => void,
): Promise<TasteProfileView> {
  const [row] = await db
    .select()
    .from(tasteProfilesTable)
    .where(eq(tasteProfilesTable.userId, userId))
    .limit(1);

  // current count
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(watchHistoryTable)
    .where(eq(watchHistoryTable.userId, userId));

  const drifted = !row || Math.abs((row.historyCount ?? 0) - cnt) >= 3;
  const stale = row && Date.now() - row.lastRefreshedAt.getTime() > 7 * 24 * 60 * 60 * 1000;

  if (!row || drifted || stale) {
    return await buildTasteProfile(userId, log);
  }
  return {
    topGenres: row.topGenres,
    topDecades: row.topDecades,
    themes: row.themes,
    vibe: row.vibe,
    summary: row.summary,
    historyCount: row.historyCount,
    lastRefreshedAt: row.lastRefreshedAt.toISOString(),
  };
}

/* ============================================================
 * Director's takes
 * ============================================================ */

const takesAiSchema = z.object({
  takes: z.array(
    z.object({
      tmdbId: z.number().int(),
      take: z.string().min(1).max(280),
    }),
  ),
});

const TAKES_SYSTEM_PROMPT = `You are CineLoop's AI critic writing one-line "Director's takes" for a viewer.

Given a list of candidate films/series and the viewer's taste profile, write a single vivid sentence per pick — written as if you, the curator, are personally pitching it to them.

Rules:
- Reference the viewer's taste subtly when natural (don't be sycophantic)
- One sentence, max 25 words
- No clichés ("a wild ride", "a must-watch")
- Output JSON only:
  { "takes": [ { "tmdbId": 123, "take": "string" } ] }`;

async function writeTakes(
  picks: Array<Omit<DirectorPick, "take">>,
  taste: TasteProfileView,
  log?: (m: object, msg: string) => void,
): Promise<DirectorPick[]> {
  if (picks.length === 0) return [];

  const candidateText = picks
    .map((p) => `- [${p.tmdbId}] ${p.title} (${p.year ?? "n/a"}, ${p.mediaType}) — ${p.overview?.slice(0, 200) ?? "no overview"}`)
    .join("\n");

  const tasteText =
    taste.summary ||
    [
      taste.topGenres.length ? `Genres: ${taste.topGenres.join(", ")}` : "",
      taste.themes.length ? `Themes: ${taste.themes.join(", ")}` : "",
      taste.vibe,
    ]
      .filter(Boolean)
      .join(". ") ||
    "Viewer is new — write neutrally.";

  const userPrompt = `Viewer taste: ${tasteText}\n\nCandidates:\n${candidateText}\n\nWrite one take per candidate. Output the JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TAKES_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw);
    const parsed = takesAiSchema.parse(json);
    const byId = new Map(parsed.takes.map((t) => [t.tmdbId, t.take]));
    return picks.map((p) => ({ ...p, take: byId.get(p.tmdbId) ?? p.overview?.slice(0, 140) ?? "" }));
  } catch (err) {
    log?.({ err: String(err) }, "writeTakes: AI failed, using overview as fallback");
    return picks.map((p) => ({ ...p, take: p.overview?.slice(0, 140) ?? "" }));
  }
}

/* ============================================================
 * For You
 * ============================================================ */

const FOR_YOU_TTL_MS = 60 * 60 * 1000; // 1 hour

const GENRE_NAME_TO_ID: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  "science fiction": 878, "sci-fi": 878, thriller: 53, war: 10752, western: 37,
};

function tasteToGenreIds(taste: TasteProfileView): number[] {
  const ids = new Set<number>();
  for (const g of taste.topGenres) {
    const lower = g.toLowerCase();
    for (const [name, id] of Object.entries(GENRE_NAME_TO_ID)) {
      if (lower.includes(name)) ids.add(id);
    }
  }
  return [...ids];
}

export async function generateForYou(
  userId: number,
  log?: (m: object, msg: string) => void,
): Promise<ForYouPayload | null> {
  const cached = await readCache<ForYouPayload>(userId, "for_you");
  if (cached) return cached;

  const taste = await getOrBuildTasteProfile(userId, log);
  if (taste.historyCount === 0) return null;

  // Build set of already-watched TMDB IDs to exclude
  const watched = await db
    .select({ mediaType: watchHistoryTable.mediaType, mediaId: watchHistoryTable.mediaId })
    .from(watchHistoryTable)
    .where(eq(watchHistoryTable.userId, userId));
  const watchedKey = new Set(watched.map((w) => `${w.mediaType}:${w.mediaId}`));

  // Discover candidates from TMDB based on inferred genres
  const genreIds = tasteToGenreIds(taste);
  const params: Record<string, string> = {
    sort_by: "popularity.desc",
    "vote_count.gte": "200",
    language: "en-US",
    page: String(1 + Math.floor(Math.random() * 3)), // small variety
  };
  if (genreIds.length) params.with_genres = genreIds.slice(0, 4).join(",");

  const [movieRes, tvRes] = await Promise.all([
    tmdbFetch<{ results: TmdbItem[] }>("/discover/movie", params),
    tmdbFetch<{ results: TmdbItem[] }>("/discover/tv", params),
  ]);

  const movieCandidates: Array<Omit<DirectorPick, "take">> =
    (movieRes?.results ?? [])
      .filter((m) => !watchedKey.has(`movie:${m.id}`))
      .slice(0, 14)
      .map((m) => tmdbToDirectorPickBase(m, "movie"));

  const tvCandidates: Array<Omit<DirectorPick, "take">> =
    (tvRes?.results ?? [])
      .filter((t) => !watchedKey.has(`tv:${t.id}`))
      .slice(0, 8)
      .map((t) => tmdbToDirectorPickBase(t, "tv"));

  const merged = [...movieCandidates, ...tvCandidates].slice(0, 12);
  if (merged.length === 0) return null;

  const withTakes = await writeTakes(merged, taste, log);

  const payload: ForYouPayload = {
    picks: withTakes,
    intro: taste.vibe || taste.summary || "Picked for tonight.",
    generatedAt: new Date().toISOString(),
  };
  await writeCache(userId, "for_you", payload, FOR_YOU_TTL_MS);
  return payload;
}

/* ============================================================
 * Daily mood
 * ============================================================ */

const DAILY_MOOD_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const moodAiSchema = z.object({
  title: z.string().min(1).max(60),
  tagline: z.string().min(1).max(140),
  picks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        year: z.number().int().gte(1880).lte(2100).nullable().optional(),
        mediaType: z.enum(["movie", "tv"]).default("movie"),
      }),
    )
    .min(4)
    .max(8),
});

const MOOD_SYSTEM_PROMPT = `You are CineLoop's AI mood curator. Pick today's cinematic theme for this viewer.

Given the day-of-week, season, and the viewer's taste, propose ONE mood theme:
- title: 2-5 words, evocative ("Sunday Slow Burn", "Rain-Soaked Heists")
- tagline: 1 sentence describing the mood
- picks: 6 specific REAL films or shows that fit the theme. For each, give the EXACT English title and release year so TMDB can look them up. Mix well-known and lesser-known. mediaType is "movie" or "tv".

Output strict JSON only:
{ "title": "...", "tagline": "...", "picks": [ { "title": "...", "year": 1999, "mediaType": "movie" } ] }`;

export async function generateDailyMood(
  userId: number,
  log?: (m: object, msg: string) => void,
): Promise<DailyMoodPayload | null> {
  const cached = await readCache<DailyMoodPayload>(userId, "daily_mood");
  if (cached) return cached;

  const taste = await getOrBuildTasteProfile(userId, log);

  const day = new Date().toLocaleDateString(undefined, { weekday: "long" });
  const month = new Date().toLocaleDateString(undefined, { month: "long" });

  const userPrompt = `Day: ${day}. Month: ${month}.
Viewer taste:
- Genres: ${taste.topGenres.join(", ") || "unknown yet"}
- Themes: ${taste.themes.join(", ") || "unknown yet"}
- Decades: ${taste.topDecades.join(", ") || "any"}
- Summary: ${taste.summary || "new viewer"}

Pick today's mood.`;

  let mood: z.infer<typeof moodAiSchema> | null = null;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MOOD_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw);
    mood = moodAiSchema.parse(json);
  } catch (err) {
    log?.({ err: String(err) }, "dailyMood: AI failed, using TMDB fallback");
  }

  let title = mood?.title ?? `${day} Reel`;
  let tagline =
    mood?.tagline ??
    `A handful of ${taste.topGenres[0]?.toLowerCase() || "cinematic"} picks for tonight.`;

  let candidates: Array<Omit<DirectorPick, "take">> = [];

  if (mood) {
    // Look up each AI-suggested pick on TMDB to get poster + metadata
    const enriched = await Promise.all(
      mood.picks.map(async (p) => {
        const mediaType = p.mediaType === "tv" ? ("tv" as const) : ("movie" as const);
        const params: Record<string, string> = { query: p.title, include_adult: "false" };
        if (p.year && mediaType === "movie") params.year = String(p.year);
        if (p.year && mediaType === "tv") params.first_air_date_year = String(p.year);
        const r = await tmdbFetch<{ results: TmdbItem[] }>(`/search/${mediaType}`, params);
        const hit = r?.results?.[0];
        if (!hit) return null;
        return tmdbToDirectorPickBase(hit, mediaType);
      }),
    );
    candidates = enriched.filter((x): x is Omit<DirectorPick, "take"> => x !== null).slice(0, 6);
  }

  // Deterministic fallback: TMDB discover seeded by taste genres + day of year.
  // Used when AI failed entirely OR when TMDB lookups all missed.
  if (candidates.length === 0) {
    const genreIds = tasteToGenreIds(taste);
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const params: Record<string, string> = {
      sort_by: "popularity.desc",
      "vote_count.gte": "300",
      language: "en-US",
      page: String(1 + (dayOfYear % 5)),
    };
    if (genreIds.length) params.with_genres = genreIds.slice(0, 3).join(",");
    const r = await tmdbFetch<{ results: TmdbItem[] }>("/discover/movie", params);
    candidates = (r?.results ?? [])
      .slice(0, 6)
      .map((m) => tmdbToDirectorPickBase(m, "movie"));
    if (candidates.length === 0) return null;
  }

  const withTakes = await writeTakes(candidates, taste, log);

  const payload: DailyMoodPayload = {
    title,
    tagline,
    picks: withTakes,
    generatedAt: new Date().toISOString(),
  };
  await writeCache(userId, "daily_mood", payload, DAILY_MOOD_TTL_MS);
  return payload;
}

/* ============================================================
 * Because You Watched
 * ============================================================ */

const BYW_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function generateBecauseYouWatched(
  userId: number | null,
  mediaType: "movie" | "tv",
  mediaId: string,
  log?: (m: object, msg: string) => void,
): Promise<{ picks: DirectorPick[]; sourceTitle: string | null } | null> {
  const cacheUserId = userId ?? 0; // 0 = anonymous bucket
  const cacheKey = `byw:${mediaType}:${mediaId}`;
  const cached = await readCache<{ picks: DirectorPick[]; sourceTitle: string | null }>(cacheUserId, cacheKey);
  if (cached) return cached;

  const numId = parseInt(mediaId, 10);
  if (!Number.isFinite(numId)) return null;

  const [details, similar, recs] = await Promise.all([
    tmdbFetch<TmdbItem>(`/${mediaType}/${numId}`),
    tmdbFetch<{ results: TmdbItem[] }>(`/${mediaType}/${numId}/similar`),
    tmdbFetch<{ results: TmdbItem[] }>(`/${mediaType}/${numId}/recommendations`),
  ]);

  const sourceTitle = (mediaType === "tv" ? details?.name : details?.title) ?? null;
  const seen = new Set<number>();
  const merged: TmdbItem[] = [];
  for (const list of [recs?.results ?? [], similar?.results ?? []]) {
    for (const item of list) {
      if (item.id === numId) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
      if (merged.length >= 8) break;
    }
    if (merged.length >= 8) break;
  }
  if (merged.length === 0) return null;

  const candidates = merged.map((m) => tmdbToDirectorPickBase(m, mediaType));
  const taste = userId
    ? await getOrBuildTasteProfile(userId, log).catch(() => ({
        topGenres: [], topDecades: [], themes: [], vibe: "", summary: "", historyCount: 0,
        lastRefreshedAt: new Date().toISOString(),
      }) as TasteProfileView)
    : ({
        topGenres: [], topDecades: [], themes: [], vibe: "", summary: "", historyCount: 0,
        lastRefreshedAt: new Date().toISOString(),
      } as TasteProfileView);

  const withTakes = await writeTakes(candidates, taste, log);

  const payload = { picks: withTakes, sourceTitle };
  await writeCache(cacheUserId, cacheKey, payload, BYW_TTL_MS);
  return payload;
}

/* ============================================================
 * Decade-from-history helper (unused export reserved for future)
 * ============================================================ */
export const __helpers = { decadeOf, genreNamesFor };
