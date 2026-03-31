import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { votePollsTable, voteOptionsTable, episodesTable, filmsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/votes", async (req, res) => {
  const polls = await db.select().from(votePollsTable).where(eq(votePollsTable.isActive, true));
  const result = await Promise.all(polls.map(async (poll) => {
    const options = await db.select().from(voteOptionsTable).where(eq(voteOptionsTable.pollId, poll.id));
    return serializePoll(poll, options, false, undefined);
  }));
  res.json(result);
});

router.post("/votes/:id/cast", async (req, res) => {
  const pollId = Number(req.params.id);
  const { optionId } = req.body as { optionId: number };
  if (!optionId) {
    res.status(400).json({ error: "optionId is required" });
    return;
  }
  const [poll] = await db.select().from(votePollsTable).where(eq(votePollsTable.id, pollId));
  if (!poll) {
    res.status(404).json({ error: "Poll not found" });
    return;
  }
  await db
    .update(voteOptionsTable)
    .set({ voteCount: sql`${voteOptionsTable.voteCount} + 1` })
    .where(eq(voteOptionsTable.id, optionId));
  const [updatedPoll] = await db
    .update(votePollsTable)
    .set({ totalVotes: sql`${votePollsTable.totalVotes} + 1` })
    .where(eq(votePollsTable.id, pollId))
    .returning();
  const options = await db.select().from(voteOptionsTable).where(eq(voteOptionsTable.pollId, pollId));
  const xpEarned = 15;
  res.json({
    poll: serializePoll(updatedPoll, options, true, optionId),
    xpEarned,
    newTotal: 340 + xpEarned,
  });
});

router.get("/votes/:id/results", async (req, res) => {
  const pollId = Number(req.params.id);
  const [poll] = await db.select().from(votePollsTable).where(eq(votePollsTable.id, pollId));
  if (!poll) {
    res.status(404).json({ error: "Poll not found" });
    return;
  }
  const options = await db.select().from(voteOptionsTable).where(eq(voteOptionsTable.pollId, pollId));
  res.json(serializePoll(poll, options, false, undefined));
});

function serializePoll(
  poll: typeof votePollsTable.$inferSelect,
  options: (typeof voteOptionsTable.$inferSelect)[],
  userVoted: boolean,
  userChoice: number | undefined,
) {
  const total = options.reduce((sum, o) => sum + o.voteCount, 0) || 1;
  return {
    id: poll.id,
    episodeId: poll.episodeId,
    filmTitle: poll.filmTitle,
    question: poll.question,
    totalVotes: poll.totalVotes,
    isActive: poll.isActive,
    endsAt: poll.endsAt?.toISOString() ?? undefined,
    userVoted,
    userChoice,
    options: options.map((o) => ({
      id: o.id,
      text: o.text,
      voteCount: o.voteCount,
      percentage: Math.round((o.voteCount / total) * 100),
    })),
  };
}

export default router;
