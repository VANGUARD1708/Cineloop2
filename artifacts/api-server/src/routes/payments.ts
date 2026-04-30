import { Router, type IRouter, raw } from "express";
import crypto from "crypto";
import { db, paymentsTable, webhookEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createStripeCheckout,
  isStripeEnabled,
  verifyStripe,
} from "../lib/payments/stripe";
import {
  createPaystackCheckout,
  isPaystackEnabled,
  verifyPaystack,
} from "../lib/payments/paystack";
import {
  createFlutterwaveCheckout,
  isFlutterwaveEnabled,
  verifyFlutterwave,
} from "../lib/payments/flutterwave";
import type {
  CheckoutRequest,
  PaymentProvider,
  PaymentType,
  VerifyResult,
} from "../lib/payments/types";
import { grantProToEmail } from "../lib/identity";
import { setIdentityCookie } from "../middlewares/identity";

const router: IRouter = Router();

const PRO_PRICES = {
  monthly: { amountCents: 499, label: "CineLoop Pro · Monthly" },
  annual: { amountCents: 4999, label: "CineLoop Pro · Annual" },
} as const;

const PROVIDER_DEFAULT_CURRENCY: Record<PaymentProvider, string> = {
  stripe: "USD",
  paystack: "NGN",
  flutterwave: "USD",
};

const USD_TO_NGN = 1600;

function convertAmount(amountCents: number, currency: string): number {
  if (currency === "NGN") {
    return Math.round((amountCents / 100) * USD_TO_NGN * 100);
  }
  return amountCents;
}

router.get("/providers", (_req, res) => {
  res.json({
    providers: {
      stripe: isStripeEnabled(),
      paystack: isPaystackEnabled(),
      flutterwave: isFlutterwaveEnabled(),
    },
    proPrices: {
      monthly: { amountUsd: 4.99 },
      annual: { amountUsd: 49.99 },
    },
  });
});

interface CheckoutBody {
  provider?: PaymentProvider;
  type?: PaymentType;
  plan?: "monthly" | "annual";
  amountCents?: number;
  currency?: string;
  email?: string;
  username?: string;
}

router.post("/checkout", async (req, res) => {
  const body = req.body as CheckoutBody;
  const provider = body.provider;
  const type = body.type;

  if (!provider || !["stripe", "paystack", "flutterwave"].includes(provider)) {
    return res.status(400).json({ error: "Invalid provider" });
  }
  if (!type || !["subscription", "tip"].includes(type)) {
    return res.status(400).json({ error: "Invalid type" });
  }

  const email = body.email?.trim() || `guest_${Date.now()}@cineloop.app`;
  const currency = (body.currency || PROVIDER_DEFAULT_CURRENCY[provider]).toUpperCase();

  let usdCents: number;
  let description: string;
  let plan: "monthly" | "annual" | null = null;

  if (type === "subscription") {
    plan = body.plan === "annual" ? "annual" : "monthly";
    usdCents = PRO_PRICES[plan].amountCents;
    description = PRO_PRICES[plan].label;
  } else {
    usdCents = Math.max(100, Math.floor(body.amountCents || 1000));
    description = `Tip for ${body.username || "CineLoop"}`;
  }

  const amountCents = convertAmount(usdCents, currency);

  const origin =
    req.get("origin") ||
    `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}`;
  const successUrl = `${origin}/pay/return?provider=${provider}&type=${type}`;
  const cancelUrl = `${origin}/pricing?cancelled=1`;

  const checkoutReq: CheckoutRequest = {
    provider,
    type,
    plan,
    amountCents,
    currency,
    customerEmail: email,
    description,
    successUrl,
    cancelUrl,
  };

  try {
    let result;
    if (provider === "stripe") {
      if (!isStripeEnabled()) return res.status(503).json({ error: "Stripe not configured" });
      result = await createStripeCheckout(checkoutReq);
    } else if (provider === "paystack") {
      if (!isPaystackEnabled()) return res.status(503).json({ error: "Paystack not configured" });
      result = await createPaystackCheckout(checkoutReq);
    } else {
      if (!isFlutterwaveEnabled()) return res.status(503).json({ error: "Flutterwave not configured" });
      result = await createFlutterwaveCheckout(checkoutReq);
    }

    await db.insert(paymentsTable).values({
      provider,
      providerReference: result.reference,
      type,
      plan,
      amountCents,
      currency,
      status: "pending",
      customerEmail: email,
      metadata: JSON.stringify({ description }),
    });

    res.json({ checkoutUrl: result.checkoutUrl, reference: result.reference });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    req.log?.error({ err: msg, provider }, "checkout failed");
    res.status(500).json({ error: msg });
  }
});

/* Internal: handle a successful payment (verify or webhook), grant Pro */
async function processSuccessfulPayment(opts: {
  provider: PaymentProvider;
  reference: string;
  log?: (m: unknown) => void;
}): Promise<{
  paymentId: number;
  type: string;
  plan: string | null;
  email: string | null;
  userId: number | null;
} | null> {
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.providerReference, opts.reference))
    .limit(1);

  if (!payment) {
    opts.log?.({ ref: opts.reference }, "payment record not found");
    return null;
  }

  if (payment.status !== "success") {
    await db
      .update(paymentsTable)
      .set({ status: "success", completedAt: new Date() })
      .where(eq(paymentsTable.id, payment.id));
  }

  let resolvedUserId: number | null = payment.userId ?? null;
  if (payment.type === "subscription" && payment.plan && payment.customerEmail) {
    const userId = await grantProToEmail(
      payment.customerEmail,
      payment.plan as "monthly" | "annual",
    );
    if (userId) {
      resolvedUserId = userId;
      await db
        .update(paymentsTable)
        .set({ userId })
        .where(eq(paymentsTable.id, payment.id));
    }
  }

  return {
    paymentId: payment.id,
    type: payment.type,
    plan: payment.plan,
    email: payment.customerEmail,
    userId: resolvedUserId,
  };
}

/* GET /api/payments/verify — used by /pay/return page */
router.get("/verify", async (req, res) => {
  const provider = req.query.provider as PaymentProvider | undefined;
  const reference = (req.query.reference || req.query.transaction_id) as string | undefined;
  const trxref = req.query.trxref as string | undefined;

  if (!provider) return res.status(400).json({ error: "Missing provider" });

  const ref = reference || trxref;
  if (!ref) return res.status(400).json({ error: "Missing reference" });

  try {
    let result: VerifyResult;
    if (provider === "stripe") result = await verifyStripe(ref);
    else if (provider === "paystack") result = await verifyPaystack(ref);
    else if (provider === "flutterwave") result = await verifyFlutterwave(ref);
    else return res.status(400).json({ error: "Invalid provider" });

    let processedInfo = null;
    if (result.status === "success") {
      processedInfo = await processSuccessfulPayment({
        provider,
        reference: result.reference,
        log: (m) => req.log?.info(m as object, "verify-success-process"),
      });
    } else {
      await db
        .update(paymentsTable)
        .set({ status: result.status, completedAt: null })
        .where(eq(paymentsTable.providerReference, result.reference));
    }

    // Auto-claim server-side: if the caller has no identity cookie yet, bind
    // them to the user that paid. We do NOT attach to a different existing
    // session (avoids hijacking someone else's cookie via a stolen reference).
    let claimed = false;
    if (
      processedInfo?.userId &&
      result.status === "success" &&
      !req.userId
    ) {
      setIdentityCookie(res, processedInfo.userId);
      claimed = true;
    }

    // Only return the payer email if the caller is the owner of that account.
    // Otherwise we'd be leaking PII to anyone holding a payment reference.
    const ownsAccount =
      processedInfo?.userId != null && req.userId === processedInfo.userId;
    const emailOut =
      claimed || ownsAccount ? (processedInfo?.email ?? null) : null;

    res.json({
      status: result.status,
      amountCents: result.amountCents,
      currency: result.currency,
      type: processedInfo?.type ?? null,
      plan: processedInfo?.plan ?? null,
      email: emailOut,
      claimed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verify failed";
    req.log?.error({ err: msg, provider }, "verify failed");
    res.status(500).json({ error: msg });
  }
});

/* Idempotency helper — returns true if event already processed.
 *
 * Only PG unique-constraint violations (code 23505) count as duplicates.
 * Any other DB failure (connection, etc.) is propagated so the caller can
 * fail the webhook (HTTP 500) and the provider will retry.
 */
async function alreadyProcessed(provider: string, eventId: string): Promise<boolean> {
  try {
    await db.insert(webhookEventsTable).values({ provider, eventId });
    return false;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return true;
    throw err;
  }
}

/* === STRIPE WEBHOOK with signature verification === */
function verifyStripeSignature(rawBody: Buffer, sigHeader: string, secret: string): boolean {
  // Stripe-Signature: t=timestamp,v1=signature[,v1=signature]
  const parts = sigHeader.split(",").reduce<Record<string, string[]>>((acc, p) => {
    const [k, v] = p.split("=");
    if (!k || !v) return acc;
    if (!acc[k]) acc[k] = [];
    acc[k].push(v);
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) return false;

  // Reject events older than 5 minutes
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  return signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, "hex");
      return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

/* Use raw body parser only on this route so signature can be verified */
router.post(
  "/webhook/stripe",
  raw({ type: "application/json" }),
  async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.header("stripe-signature");
    const rawBody = req.body as Buffer;

    let evt: Record<string, unknown>;

    if (secret) {
      // Secret configured — signature is required and must verify
      if (!sig || !rawBody) {
        req.log?.warn("stripe webhook missing signature header");
        return res.status(400).send("missing signature");
      }
      if (!verifyStripeSignature(rawBody, sig, secret)) {
        req.log?.warn("stripe webhook signature invalid");
        return res.status(400).send("invalid signature");
      }
      try {
        evt = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
      } catch {
        return res.status(400).send("invalid json");
      }
    } else {
      // No webhook secret configured. We refuse to silently accept any payload that
      // *claims* to be signed (could be an attacker probing). Only accept when
      // there is no signature header at all (local/dev probes).
      if (sig) {
        req.log?.warn("stripe webhook signature present but no STRIPE_WEBHOOK_SECRET configured");
        return res.status(400).send("webhook secret not configured");
      }
      if (process.env.NODE_ENV === "production") {
        req.log?.warn("stripe webhook rejected — secret required in production");
        return res.status(400).send("webhook secret required");
      }
      try {
        evt = (rawBody ? JSON.parse(rawBody.toString("utf8")) : req.body) as Record<string, unknown>;
        req.log?.warn("stripe webhook accepted WITHOUT signature verification (dev mode)");
      } catch {
        return res.status(400).send("invalid json");
      }
    }

    const eventId = (evt.id as string) || `stripe_${Date.now()}`;
    const eventType = evt.type as string | undefined;

    if (await alreadyProcessed("stripe", eventId)) {
      return res.json({ received: true, deduped: true });
    }

    try {
      if (eventType === "checkout.session.completed") {
        const session = (evt.data as { object?: { id?: string } })?.object;
        if (session?.id) {
          await processSuccessfulPayment({
            provider: "stripe",
            reference: session.id,
            log: (m) => req.log?.info(m as object, "stripe-webhook"),
          });
        }
      }
      res.json({ received: true });
    } catch (err) {
      req.log?.error({ err: String(err) }, "stripe webhook processing failed");
      res.status(500).json({ error: "processing failed" });
    }
  },
);

/* === PAYSTACK WEBHOOK with signature verification === */
router.post("/webhook/paystack", async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const sig = req.header("x-paystack-signature");
    if (secret) {
      // Secret configured → signature is required and must verify
      if (!sig) {
        req.log?.warn("paystack webhook missing signature header");
        return res.status(400).send("missing signature");
      }
      const expected = crypto
        .createHmac("sha512", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (expected !== sig) {
        req.log?.warn("paystack webhook signature invalid");
        return res.status(400).send("invalid signature");
      }
    } else {
      // No secret. Reject anything that *claims* to be signed.
      if (sig) {
        req.log?.warn("paystack webhook signed but PAYSTACK_SECRET_KEY missing");
        return res.status(400).send("webhook secret not configured");
      }
      if (process.env.NODE_ENV === "production") {
        req.log?.warn("paystack webhook rejected — secret required in production");
        return res.status(400).send("webhook secret required");
      }
      req.log?.warn("paystack webhook accepted WITHOUT signature verification (dev mode)");
    }

    const evt = req.body as { event?: string; data?: { reference?: string; id?: number } };
    const eventId = `paystack_${evt.data?.id ?? evt.data?.reference ?? Date.now()}`;
    if (await alreadyProcessed("paystack", eventId)) {
      return res.json({ received: true, deduped: true });
    }

    if (evt.event === "charge.success" && evt.data?.reference) {
      await processSuccessfulPayment({
        provider: "paystack",
        reference: evt.data.reference,
        log: (m) => req.log?.info(m as object, "paystack-webhook"),
      });
    }
    res.json({ received: true });
  } catch (err) {
    req.log?.error({ err: String(err) }, "paystack webhook failed");
    // Fail with 5xx so Paystack retries instead of marking as delivered.
    res.status(500).json({ error: "processing failed" });
  }
});

/* === FLUTTERWAVE WEBHOOK with hash verification === */
router.post("/webhook/flutterwave", async (req, res) => {
  try {
    const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const incoming = req.header("verif-hash");
    if (expectedHash) {
      if (!incoming) {
        req.log?.warn("flutterwave webhook missing verif-hash");
        return res.status(400).send("missing hash");
      }
      if (incoming !== expectedHash) {
        req.log?.warn("flutterwave webhook hash invalid");
        return res.status(400).send("invalid hash");
      }
    } else {
      if (incoming) {
        req.log?.warn("flutterwave webhook hashed but FLUTTERWAVE_WEBHOOK_HASH missing");
        return res.status(400).send("webhook hash not configured");
      }
      if (process.env.NODE_ENV === "production") {
        req.log?.warn("flutterwave webhook rejected — hash required in production");
        return res.status(400).send("webhook hash required");
      }
      req.log?.warn("flutterwave webhook accepted WITHOUT hash verification (dev mode)");
    }

    const evt = req.body as { data?: { tx_ref?: string; status?: string; id?: number }; status?: string; txRef?: string };
    const txRef = evt?.data?.tx_ref || evt?.txRef;
    const eventId = `flutterwave_${evt?.data?.id ?? txRef ?? Date.now()}`;

    if (await alreadyProcessed("flutterwave", eventId)) {
      return res.json({ received: true, deduped: true });
    }

    if (txRef && (evt?.data?.status === "successful" || evt?.status === "successful")) {
      await processSuccessfulPayment({
        provider: "flutterwave",
        reference: txRef,
        log: (m) => req.log?.info(m as object, "flutterwave-webhook"),
      });
    }
    res.json({ received: true });
  } catch (err) {
    req.log?.error({ err: String(err) }, "flutterwave webhook failed");
    res.status(500).json({ error: "processing failed" });
  }
});

export default router;
