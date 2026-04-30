import { Router, type IRouter } from "express";
import fetch from "node-fetch";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

const MAX_PROMPT_LEN = 500;
const TARGET_PICKS = 8;
const MIN_VALID_PICKS = 4;

/* === Schema for the AI's structured output === */
const aiPickSchema = z.object({
  title: z.string().min(1).max(200),
  year: z.number().int().gte(1880).lte(2100).nullable().optional(),
  mediaType: z.enum(["movie", "tv"]).default("movie"),
  reason: z.string().min(1).max(600),
  vibe: z.string().min(1).max(60),
});

const aiResponseSchema = z.object({
  picks: z.array(aiPickSchema).min(1),
});

type AiPick = z.infer<typeof aiPickSchema>;

type EnrichedPick = {
  title: string;
  year: number | null;
  mediaType: "movie" | "tv";
  reason: string;
  vibe: string;
  tmdbId: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  voteAverage: number | null;
  releaseDate: string | null;
};

const SYSTEM_PROMPT = `You are CineLoop's AI film concierge. You curate movies and TV shows based on a viewer's mood, vibe, or specific request.

Rules:
- Return EXACTLY 8 picks — never fewer, never more
- Mix well-known and lesser-known titles unless the user asks for blockbusters only
- Prefer titles that actually exist in TMDB's database (real, released titles)
- For each pick, give the EXACT title (English) and release year so it can be looked up
- Reasons are 1-2 vivid sentences, no clichés, written like a discerning critic
- Vibes are 1-3 word taglines (e.g. "neon-soaked melancholy", "slow-burn dread")
- mediaType must be "movie" or "tv"

Output STRICT JSON ONLY in this shape:
{
  "picks": [
    { "title": "string", "year": 1999, "mediaType": "movie", "reason": "string", "vibe": "string" }
  ]
}`;

async function tmdbSearch(
  title: string,
  year: number | null,
  mediaType: "movie" | "tv",
): Promise<Record<string, any> | null> {
  if (!TMDB_KEY) return null;
  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    query: title,
    include_adult: "false",
  });
  if (year && mediaType === "movie") params.set("year", String(year));
  if (year && mediaType === "tv")
    params.set("first_air_date_year", String(year));

  const url = `${TMDB_BASE}/search/${mediaType}?${params.toString()}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = (await r.json()) as { results?: Array<Record<string, unknown>> };
    return (data.results && data.results[0]) || null;
  } catch {
    return null;
  }
}

async function generatePicks(prompt: string): Promise<AiPick[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw Object.assign(new Error("AI_INVALID_OUTPUT"), { cause: e });
  }

  const parsed = aiResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw Object.assign(new Error("AI_INVALID_OUTPUT"), {
      cause: parsed.error.flatten(),
    });
  }
  return parsed.data.picks.map((p) => ({
    ...p,
    mediaType: p.mediaType ?? "movie",
    year: p.year ?? null,
  }));
}

async function enrichPicks(picks: AiPick[]): Promise<EnrichedPick[]> {
  return Promise.all(
    picks.map(async (p) => {
      const mediaType = p.mediaType === "tv" ? "tv" : "movie";
      const tmdb = await tmdbSearch(p.title, p.year ?? null, mediaType);
      return {
        title: p.title,
        year: p.year ?? null,
        mediaType,
        reason: p.reason,
        vibe: p.vibe,
        tmdbId: tmdb?.id ?? null,
        posterPath: tmdb?.poster_path ?? null,
        backdropPath: tmdb?.backdrop_path ?? null,
        overview: tmdb?.overview ?? null,
        voteAverage: tmdb?.vote_average ?? null,
        releaseDate:
          mediaType === "movie"
            ? tmdb?.release_date ?? null
            : tmdb?.first_air_date ?? null,
      };
    }),
  );
}

/* === Route === */
const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LEN),
});

router.post("/recommend", async (req, res) => {
  const log = req.log;

  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parseResult.error.flatten().fieldErrors,
    });
  }
  const { prompt } = parseResult.data;

  try {
    log.info({ promptLen: prompt.length }, "mood: requesting picks");

    /* Up to 2 attempts — retry once if the AI returns fewer than the target */
    let picks: AiPick[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const got = await generatePicks(prompt);
        picks = got.slice(0, TARGET_PICKS);
        if (picks.length >= TARGET_PICKS) break;
      } catch (e: any) {
        if (attempt === 1) throw e;
        log.warn({ attempt, err: e?.message }, "mood: AI attempt failed, retrying");
      }
    }

    if (picks.length < MIN_VALID_PICKS) {
      log.warn({ got: picks.length }, "mood: AI returned too few picks");
      return res
        .status(502)
        .json({ error: "Failed to generate recommendations. Please try again." });
    }

    /* Enrichment is best-effort — picks themselves are the source of truth.
       Cards on the frontend gracefully handle null poster/backdrop/overview. */
    const enriched = await enrichPicks(picks);

    res.json({
      prompt,
      picks: enriched,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    /* Log the full error server-side; return a single generic message to client */
    log.error(
      { err: e?.message, cause: e?.cause },
      "mood: failed to generate recommendations",
    );
    const isInvalid = e?.message === "AI_INVALID_OUTPUT";
    res.status(isInvalid ? 502 : 500).json({
      error: "Failed to generate recommendations. Please try again.",
    });
  }
});

export default router;
