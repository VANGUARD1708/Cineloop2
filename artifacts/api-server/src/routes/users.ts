import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  userBadgesTable,
  xpEventsTable
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { isProActive } from "../lib/identity";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

/* ------------------ CURRENT USER ------------------ */
router.get("/users/me", async (req, res) => {
  const id = req.userId ?? DEFAULT_USER_ID;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const badges = await db
    .select()
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, user.id));

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl,
    level: user.level,
    xp: user.xp,
    xpToNextLevel: user.xpToNextLevel,
    streakDays: user.streakDays,
    totalVotes: user.totalVotes,
    totalWatched: user.totalWatched,
    totalLikes: user.totalLikes,
    badges: badges.map((b) => b.badge),
    followedCharacters: [] as number[],
    isPro: isProActive(user),
    proUntil: user.proUntil?.toISOString() ?? null,
    proPlan: user.proPlan,
    proCancelAtPeriodEnd: user.proCancelAtPeriodEnd,
    isClaimedAccount: !!req.userId,
  });
});

/* ------------------ XP HISTORY ------------------ */
router.get("/users/me/xp-history", async (req, res) => {
  const id = req.userId ?? DEFAULT_USER_ID;
  const events = await db
    .select()
    .from(xpEventsTable)
    .where(eq(xpEventsTable.userId, id))
    .orderBy(desc(xpEventsTable.createdAt))
    .limit(20);

  res.json(
    events.map((e) => ({
      id: e.id,
      action: e.action,
      xpAmount: e.xpAmount,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    }))
  );
});

/* ------------------ STREAK ------------------ */
router.get("/users/me/streak", async (req, res) => {
  const id = req.userId ?? DEFAULT_USER_ID;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    currentStreak: user.streakDays,
    longestStreak: user.longestStreak,
    lastActiveDate:
      user.lastActiveDate?.toISOString() ??
      new Date().toISOString(),
    streakBonusXp: user.streakDays * 5,
    isStreakAlive: true,
  });
});

/* ------------------ LEADERBOARD ------------------ */
router.get("/leaderboard", async (_req, res) => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.xp))
    .limit(20);

  res.json(
    users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      level: u.level,
      xp: u.xp,
      streakDays: u.streakDays,
      isPro: isProActive(u),
    }))
  );
});

export default router;
