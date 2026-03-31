import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { filmsTable, episodesTable, insertFilmSchema } from "@workspace/db";
import { eq, ilike, desc, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/films", async (req, res) => {
  const { genre, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const conditions = [];
  if (genre) {
    conditions.push(ilike(filmsTable.genre, `%${genre}%`));
  }
  const films = await db
    .select()
    .from(filmsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(filmsTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));
  res.json(films.map(serializeFilm));
});

router.post("/films", async (req, res) => {
  const parse = insertFilmSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.issues });
    return;
  }
  const [film] = await db.insert(filmsTable).values(parse.data).returning();
  res.status(201).json(serializeFilm(film));
});

router.get("/films/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [film] = await db.select().from(filmsTable).where(eq(filmsTable.id, id));
  if (!film) {
    res.status(404).json({ error: "Film not found" });
    return;
  }
  res.json(serializeFilm(film));
});

router.get("/films/:id/episodes", async (req, res) => {
  const filmId = Number(req.params.id);
  const episodes = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.filmId, filmId))
    .orderBy(episodesTable.episodeNumber);
  res.json(episodes.map(serializeEpisode));
});

router.post("/episodes/:id/like", async (req, res) => {
  const id = Number(req.params.id);
  const [episode] = await db.select().from(episodesTable).where(eq(episodesTable.id, id));
  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }
  const [updated] = await db
    .update(episodesTable)
    .set({ likes: episode.likes + 1 })
    .where(eq(episodesTable.id, id))
    .returning();
  res.json({ liked: true, totalLikes: updated.likes, xpEarned: 5 });
});

function serializeFilm(film: typeof filmsTable.$inferSelect) {
  return {
    ...film,
    createdAt: film.createdAt.toISOString(),
  };
}

function serializeEpisode(ep: typeof episodesTable.$inferSelect) {
  return {
    ...ep,
    createdAt: ep.createdAt.toISOString(),
    unlockCondition: ep.unlockCondition ?? undefined,
    cliffhangerText: ep.cliffhangerText ?? undefined,
  };
}

export default router;
