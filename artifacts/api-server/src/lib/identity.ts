import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=cineloop1",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=cineloop2",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=cineloop3",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=cineloop4",
];

function usernameFromEmail(email: string): string {
  const base = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 14) || "viewer";
  return `${base}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function findOrCreateUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Invalid email");
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalized))
    .limit(1);

  if (existing) return existing;

  const username = usernameFromEmail(normalized);
  const avatarUrl = AVATARS[Math.floor(Math.random() * AVATARS.length)];

  const [created] = await db
    .insert(usersTable)
    .values({
      username,
      email: normalized,
      avatarUrl,
      displayName: normalized.split("@")[0],
      lastClaimedAt: new Date(),
    })
    .returning();

  return created;
}

export async function getUserById(id: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return user || null;
}

export function isProActive(user: { proUntil: Date | null }): boolean {
  return !!user.proUntil && user.proUntil.getTime() > Date.now();
}

export async function grantProToEmail(email: string, plan: "monthly" | "annual"): Promise<number | null> {
  const user = await findOrCreateUserByEmail(email);
  const now = Date.now();
  const currentEnd = user.proUntil && user.proUntil.getTime() > now ? user.proUntil.getTime() : now;
  const days = plan === "annual" ? 365 : 30;
  const newEnd = new Date(currentEnd + days * 24 * 60 * 60 * 1000);

  await db
    .update(usersTable)
    .set({
      proUntil: newEnd,
      proPlan: plan,
      proCancelAtPeriodEnd: false,
    })
    .where(eq(usersTable.id, user.id));

  return user.id;
}
