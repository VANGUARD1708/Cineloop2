import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  db,
  paymentsTable,
  usersTable,
  abuseEventsTable,
} from "@workspace/db";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-guards";
import { recordAbuse } from "../lib/abuse";

const router: IRouter = Router();

router.use("/admin", requireAdmin);

/* GET /api/admin/overview — headline revenue & engagement stats. */
router.get("/admin/overview", async (_req, res) => {
  try {
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [revenueAllTime] = await db
      .select({
        totalCents: sql<number>`COALESCE(SUM(${paymentsTable.amountCents}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "success"));

    const [revenueLast30] = await db
      .select({
        totalCents: sql<number>`COALESCE(SUM(${paymentsTable.amountCents}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.status, "success"),
          gte(paymentsTable.createdAt, since30),
        ),
      );

    const byProvider = await db
      .select({
        provider: paymentsTable.provider,
        totalCents: sql<number>`COALESCE(SUM(${paymentsTable.amountCents}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "success"))
      .groupBy(paymentsTable.provider);

    const [activePro] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(usersTable)
      .where(gte(usersTable.proUntil, new Date()));

    const [signups30] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, since30));

    const [totalUsers] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(usersTable);

    const [bannedCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(usersTable)
      .where(eq(usersTable.isBanned, true));

    const [abuse30] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(abuseEventsTable)
      .where(gte(abuseEventsTable.createdAt, since30));

    res.json({
      revenue: {
        lifetime: { cents: Number(revenueAllTime.totalCents), count: Number(revenueAllTime.count) },
        last30Days: { cents: Number(revenueLast30.totalCents), count: Number(revenueLast30.count) },
        byProvider: byProvider.map((p) => ({
          provider: p.provider,
          cents: Number(p.totalCents),
          count: Number(p.count),
        })),
      },
      users: {
        total: Number(totalUsers.count),
        activePro: Number(activePro.count),
        signupsLast30Days: Number(signups30.count),
        banned: Number(bannedCount.count),
      },
      abuse: {
        last30Days: Number(abuse30.count),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    _req.log?.error({ err: String(err) }, "admin overview failed");
    res.status(500).json({ error: "overview_failed" });
  }
});

/* GET /api/admin/payments — most recent payments with linked user. */
router.get("/admin/payments", async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  try {
    const rows = await db
      .select({
        id: paymentsTable.id,
        userId: paymentsTable.userId,
        userEmail: usersTable.email,
        username: usersTable.username,
        provider: paymentsTable.provider,
        type: paymentsTable.type,
        plan: paymentsTable.plan,
        amountCents: paymentsTable.amountCents,
        currency: paymentsTable.currency,
        status: paymentsTable.status,
        customerEmail: paymentsTable.customerEmail,
        createdAt: paymentsTable.createdAt,
        completedAt: paymentsTable.completedAt,
      })
      .from(paymentsTable)
      .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(limit);
    res.json({ payments: rows });
  } catch (err) {
    req.log?.error({ err: String(err) }, "admin payments failed");
    res.status(500).json({ error: "payments_failed" });
  }
});

/* GET /api/admin/users — list users with pro + abuse stats. */
router.get("/admin/users", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

  try {
    const baseQuery = db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        proUntil: usersTable.proUntil,
        proPlan: usersTable.proPlan,
        isAdmin: usersTable.isAdmin,
        isBanned: usersTable.isBanned,
        bannedReason: usersTable.bannedReason,
        bannedAt: usersTable.bannedAt,
        createdAt: usersTable.createdAt,
        abuseCount: sql<number>`(
          SELECT COUNT(*) FROM ${abuseEventsTable}
          WHERE ${abuseEventsTable.userId} = ${usersTable.id}
        )`,
      })
      .from(usersTable);

    const filtered = q
      ? baseQuery.where(
          or(
            ilike(usersTable.username, `%${q}%`),
            ilike(usersTable.email, `%${q}%`),
            ilike(usersTable.displayName, `%${q}%`),
          ),
        )
      : baseQuery;

    const rows = await filtered.orderBy(desc(usersTable.createdAt)).limit(limit);

    const now = Date.now();
    res.json({
      users: rows.map((u) => ({
        ...u,
        abuseCount: Number(u.abuseCount),
        isPro: !!u.proUntil && new Date(u.proUntil).getTime() > now,
      })),
    });
  } catch (err) {
    req.log?.error({ err: String(err) }, "admin users failed");
    res.status(500).json({ error: "users_failed" });
  }
});

/* GET /api/admin/abuse — recent abuse events with linked user. */
router.get("/admin/abuse", async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  try {
    const rows = await db
      .select({
        id: abuseEventsTable.id,
        userId: abuseEventsTable.userId,
        username: usersTable.username,
        userEmail: usersTable.email,
        ip: abuseEventsTable.ip,
        eventType: abuseEventsTable.eventType,
        severity: abuseEventsTable.severity,
        metadata: abuseEventsTable.metadata,
        createdAt: abuseEventsTable.createdAt,
      })
      .from(abuseEventsTable)
      .leftJoin(usersTable, eq(abuseEventsTable.userId, usersTable.id))
      .orderBy(desc(abuseEventsTable.createdAt))
      .limit(limit);
    res.json({ events: rows });
  } catch (err) {
    req.log?.error({ err: String(err) }, "admin abuse failed");
    res.status(500).json({ error: "abuse_failed" });
  }
});

const BanBody = z.object({
  banned: z.boolean(),
  reason: z.string().max(500).nullable().optional(),
});

/* POST /api/admin/users/:id/ban — toggle account ban. */
router.post("/admin/users/:id/ban", async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isFinite(targetId) || targetId <= 0) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  // Don't let admins ban themselves out of the system.
  if (req.authUser?.id === targetId) {
    res.status(400).json({ error: "cannot_ban_self" });
    return;
  }

  const parsed = BanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set({
        isBanned: parsed.data.banned,
        bannedReason: parsed.data.banned ? parsed.data.reason ?? null : null,
        bannedAt: parsed.data.banned ? new Date() : null,
      })
      .where(eq(usersTable.id, targetId))
      .returning({ id: usersTable.id, isBanned: usersTable.isBanned });

    if (!updated) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    void recordAbuse({
      req,
      userId: targetId,
      type: parsed.data.banned ? "admin_ban_set" : "admin_ban_lifted",
      severity: "medium",
      metadata: { adminId: req.authUser?.id, reason: parsed.data.reason ?? null },
    });

    res.json({ ok: true, userId: updated.id, isBanned: updated.isBanned });
  } catch (err) {
    req.log?.error({ err: String(err) }, "admin ban toggle failed");
    res.status(500).json({ error: "ban_failed" });
  }
});

export default router;
