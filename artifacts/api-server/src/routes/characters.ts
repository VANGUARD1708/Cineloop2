import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, characterFollowsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

router.get("/characters", async (req, res) => {
  const characters = await db.select().from(charactersTable);
  const follows = await db
    .select()
    .from(characterFollowsTable)
    .where(eq(characterFollowsTable.userId, DEFAULT_USER_ID));
  const followedIds = new Set(follows.map((f) => f.characterId));
  res.json(characters.map((c) => ({
    id: c.id,
    name: c.name,
    filmTitle: c.filmTitle,
    avatarUrl: c.avatarUrl,
    bio: c.bio,
    followerCount: c.followerCount,
    isFollowed: followedIds.has(c.id),
    latestUpdate: c.latestUpdate,
  })));
});

router.post("/characters/:id/follow", async (req, res) => {
  const characterId = Number(req.params.id);
  const [character] = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.id, characterId));
  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  const [existingFollow] = await db
    .select()
    .from(characterFollowsTable)
    .where(and(
      eq(characterFollowsTable.userId, DEFAULT_USER_ID),
      eq(characterFollowsTable.characterId, characterId),
    ));
  if (existingFollow) {
    await db.delete(characterFollowsTable).where(eq(characterFollowsTable.id, existingFollow.id));
    const [updated] = await db
      .update(charactersTable)
      .set({ followerCount: Math.max(0, character.followerCount - 1) })
      .where(eq(charactersTable.id, characterId))
      .returning();
    res.json({ following: false, followerCount: updated.followerCount });
  } else {
    await db.insert(characterFollowsTable).values({ userId: DEFAULT_USER_ID, characterId });
    const [updated] = await db
      .update(charactersTable)
      .set({ followerCount: character.followerCount + 1 })
      .where(eq(charactersTable.id, characterId))
      .returning();
    res.json({ following: true, followerCount: updated.followerCount });
  }
});

export default router;
