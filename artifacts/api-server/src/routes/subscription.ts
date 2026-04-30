import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserById, isProActive } from "../lib/identity";

const router: IRouter = Router();

/* GET /api/subscription — status for current user */
router.get("/subscription", async (req, res) => {
  if (!req.userId) {
    return res.json({
      isPro: false,
      proUntil: null,
      proPlan: null,
      cancelAtPeriodEnd: false,
      daysRemaining: 0,
    });
  }
  const user = await getUserById(req.userId);
  if (!user) return res.json({ isPro: false, proUntil: null, proPlan: null, cancelAtPeriodEnd: false, daysRemaining: 0 });

  const active = isProActive(user);
  const daysRemaining = active && user.proUntil
    ? Math.max(0, Math.ceil((user.proUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  res.json({
    isPro: active,
    proUntil: user.proUntil?.toISOString() ?? null,
    proPlan: user.proPlan,
    cancelAtPeriodEnd: user.proCancelAtPeriodEnd,
    daysRemaining,
  });
});

/* POST /api/subscription/cancel — mark to not renew (current period stays active) */
router.post("/subscription/cancel", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Sign in required" });
  await db
    .update(usersTable)
    .set({ proCancelAtPeriodEnd: true })
    .where(eq(usersTable.id, req.userId));
  res.json({ ok: true });
});

/* POST /api/subscription/resume — undo cancel */
router.post("/subscription/resume", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Sign in required" });
  await db
    .update(usersTable)
    .set({ proCancelAtPeriodEnd: false })
    .where(eq(usersTable.id, req.userId));
  res.json({ ok: true });
});

export default router;
