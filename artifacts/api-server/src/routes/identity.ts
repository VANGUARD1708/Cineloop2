import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  findOrCreateUserByEmail,
  getUserById,
  isProActive,
} from "../lib/identity";
import {
  setIdentityCookie,
  clearIdentityCookie,
} from "../middlewares/identity";

const router: IRouter = Router();

const ClaimBody = z.object({
  email: z.string().email().max(200),
});

function publicUser(user: NonNullable<Awaited<ReturnType<typeof getUserById>>>) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl,
    isPro: isProActive(user),
    proUntil: user.proUntil?.toISOString() ?? null,
    proPlan: user.proPlan,
    proCancelAtPeriodEnd: user.proCancelAtPeriodEnd,
  };
}

/* POST /api/identity/claim — set identity cookie, find-or-create user */
router.post("/identity/claim", async (req, res) => {
  const parsed = ClaimBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Valid email required" });
  }

  try {
    const user = await findOrCreateUserByEmail(parsed.data.email);
    setIdentityCookie(res, user.id);
    res.json(publicUser(user));
  } catch (err) {
    req.log?.error({ err: String(err) }, "claim failed");
    res.status(500).json({ error: "Could not claim identity" });
  }
});

/* GET /api/identity/me — current user from cookie, or null */
router.get("/identity/me", async (req, res) => {
  if (!req.userId) {
    return res.json({ user: null });
  }
  const user = await getUserById(req.userId);
  if (!user) {
    clearIdentityCookie(res);
    return res.json({ user: null });
  }
  res.json({ user: publicUser(user) });
});

/* POST /api/identity/signout */
router.post("/identity/signout", (_req, res) => {
  clearIdentityCookie(res);
  res.json({ ok: true });
});

export default router;
