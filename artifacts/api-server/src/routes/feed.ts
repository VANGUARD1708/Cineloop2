import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  filmsTable,
  episodesTable,
  votePollsTable,
  voteOptionsTable,
  usersTable
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

/* IMPORTANT — add TMDB router */
import tmdbRouter from "./tmdb-proxy";

const router: IRouter = Router();

/* ------------------ FEED ------------------ */
router.get("/feed", async (req, res) => {
  const { limit = "10", offset = "0" } = req.query as Record<string, string>;

  const episodes = await db
    .select()
    .from(episodesTable)
    .orderBy(desc(episodesTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  const result = await Promise.all(
    episodes.map(async (episode, i) => {
      const [film] = await db
        .select()
        .from(filmsTable)
        .where(eq(filmsTable.id, episode.filmId));

      let activePoll = undefined;

      if (episode.hasActivePoll) {
        const [poll] = await db
          .select()
          .from(votePollsTable)
          .where(eq(votePollsTable.episodeId, episode.id));

        if (poll) {
          const options = await db
            .select()
            .from(voteOptionsTable)
            .where(eq(voteOptionsTable.pollId, poll.id));

          const total =
            options.reduce((sum, o) => sum + o.voteCount, 0) || 1;

          activePoll = {
            id: poll.id,
            episodeId: poll.episodeId,
            filmTitle: poll.filmTitle,
            question: poll.question,
            totalVotes: poll.totalVotes,
            isActive: poll.isActive,
            endsAt: poll.endsAt?.toISOString() ?? undefined,
            userVoted: false,
            options: options.map((o) => ({
              id: o.id,
              text: o.text,
              voteCount: o.voteCount,
              percentage: Math.round(
                (o.voteCount / total) * 100
              ),
            })),
          };
        }
      }

      return {
        id: i + Number(offset) + 1,
        type: "episode",
        episode: serializeEpisode(episode),
        film: film ? serializeFilm(film) : null,
        activePoll,
      };
    })
  );

  res.json(result);
});

/* ------------------ TRENDING ------------------ */
router.get("/feed/trending", async (_req, res) => {
  const topFilms = await db
    .select()
    .from(filmsTable)
    .orderBy(desc(filmsTable.totalLikes))
    .limit(5);

  const hotPolls = await db
    .select()
    .from(votePollsTable)
    .where(eq(votePollsTable.isActive, true))
    .orderBy(desc(votePollsTable.totalVotes))
    .limit(3);

  const pollsWithOptions = await Promise.all(
    hotPolls.map(async (poll) => {
      const options = await db
        .select()
        .from(voteOptionsTable)
        .where(eq(voteOptionsTable.pollId, poll.id));

      const total =
        options.reduce((sum, o) => sum + o.voteCount, 0) || 1;

      return {
        id: poll.id,
        episodeId: poll.episodeId,
        filmTitle: poll.filmTitle,
        question: poll.question,
        totalVotes: poll.totalVotes,
        isActive: poll.isActive,
        endsAt: poll.endsAt?.toISOString() ?? undefined,
        userVoted: false,
        options: options.map((o) => ({
          id: o.id,
          text: o.text,
          voteCount: o.voteCount,
          percentage: Math.round(
            (o.voteCount / total) * 100
          ),
        })),
      };
    })
  );

  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.xp))
    .limit(3);

  const risingCreators = users.map((u) => ({
    name: u.username,
    avatarUrl: u.avatarUrl,
    followerGrowth: Math.floor(Math.random() * 500) + 100,
  }));

  res.json({
    topFilms: topFilms.map(serializeFilm),
    hotPolls: pollsWithOptions,
    risingCreators,
  });
});

/* ------------------ STATS ------------------ */
router.get("/feed/stats", async (_req, res) => {
  const [filmCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(filmsTable);

  const [episodeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(episodesTable);

  const [activePollCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(votePollsTable)
    .where(eq(votePollsTable.isActive, true));

  const [totalVotes] = await db
    .select({
      sum: sql<number>`coalesce(sum(total_votes), 0)::int`,
    })
    .from(votePollsTable);

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const genreRows = await db
    .select({
      genre: filmsTable.genre,
      count: sql<number>`count(*)::int`,
    })
    .from(filmsTable)
    .groupBy(filmsTable.genre)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  res.json({
    totalFilms: filmCount.count,
    totalEpisodes: episodeCount.count,
    activeVotePolls: activePollCount.count,
    totalVotesCast: totalVotes.sum,
    totalUsers: userCount.count,
    topGenres: genreRows.map((r) => ({
      genre: r.genre,
      count: r.count,
    })),
  });
});

/* ------------------ SERIALIZERS ------------------ */
function serializeFilm(film: typeof filmsTable.$inferSelect) {
  return {
    ...film,
    createdAt: film.createdAt.toISOString(),
  };
}

function serializeEpisode(
  ep: typeof episodesTable.$inferSelect
) {
  return {
    ...ep,
    createdAt: ep.createdAt.toISOString(),
    unlockCondition: ep.unlockCondition ?? undefined,
    cliffhangerText: ep.cliffhangerText ?? undefined,
  };
}

/* IMPORTANT — mount TMDB routes */
router.use("/tmdb", tmdbRouter);

export default router;