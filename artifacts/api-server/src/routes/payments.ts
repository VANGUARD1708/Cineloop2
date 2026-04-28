import { Router, type IRouter } from "express";
import { db, paymentsTable } from "@workspace/db";
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

const router: IRouter = Router();

const PRO_PRICES = {
  monthly: { amountCents: 499, label: "CineLoop Pro · Monthly" },
  annual: { amountCents: 4999, label: "CineLoop Pro · Annual" },
} as const;

/* Per-provider default currency. Paystack test accounts typically only
   support NGN; Flutterwave & Stripe support USD globally. */
const PROVIDER_DEFAULT_CURRENCY: Record<PaymentProvider, string> = {
  stripe: "USD",
  paystack: "NGN",
  flutterwave: "USD",
};

/* Approx exchange rate USD → NGN for Paystack pricing.
   Adjust as needed; keeps round numbers for users. */
const USD_TO_NGN = 1600;

function convertAmount(amountCents: number, currency: string): number {
  if (currency === "NGN") {
    /* amountCents is USD cents → convert to NGN kobo (NGN cents) */
    return Math.round((amountCents / 100) * USD_TO_NGN * 100);
  }
  return amountCents;
}

/* GET /api/payments/providers — which providers are configured */
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

/* POST /api/payments/checkout */
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
  const currency = (
    body.currency || PROVIDER_DEFAULT_CURRENCY[provider]
  ).toUpperCase();

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
      if (!isStripeEnabled())
        return res.status(503).json({ error: "Stripe not configured" });
      result = await createStripeCheckout(checkoutReq);
    } else if (provider === "paystack") {
      if (!isPaystackEnabled())
        return res.status(503).json({ error: "Paystack not configured" });
      result = await createPaystackCheckout(checkoutReq);
    } else {
      if (!isFlutterwaveEnabled())
        return res.status(503).json({ error: "Flutterwave not configured" });
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

    res.json({
      checkoutUrl: result.checkoutUrl,
      reference: result.reference,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    req.log?.error({ err: msg, provider }, "checkout failed");
    res.status(500).json({ error: msg });
  }
});

/* GET /api/payments/verify — used by /pay/return page */
router.get("/verify", async (req, res) => {
  const provider = req.query.provider as PaymentProvider | undefined;
  const reference = (req.query.reference || req.query.transaction_id) as
    | string
    | undefined;
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

    /* Update local payment record */
    const lookupRef = result.reference;
    const existing = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.providerReference, lookupRef))
      .limit(1);

    if (existing[0]) {
      await db
        .update(paymentsTable)
        .set({
          status: result.status,
          completedAt: result.status === "success" ? new Date() : null,
        })
        .where(eq(paymentsTable.id, existing[0].id));
    }

    res.json({
      status: result.status,
      amountCents: result.amountCents,
      currency: result.currency,
      type: existing[0]?.type,
      plan: existing[0]?.plan,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verify failed";
    req.log?.error({ err: msg, provider }, "verify failed");
    res.status(500).json({ error: msg });
  }
});

/* Webhooks — minimal handlers (signature verification simplified for MVP) */
router.post("/webhook/stripe", async (req, res) => {
  try {
    const evt = req.body;
    if (evt?.type === "checkout.session.completed") {
      const session = evt.data?.object;
      if (session?.id) {
        await db
          .update(paymentsTable)
          .set({ status: "success", completedAt: new Date() })
          .where(eq(paymentsTable.providerReference, session.id));
      }
    }
    res.json({ received: true });
  } catch {
    res.status(200).json({ received: true });
  }
});

router.post("/webhook/paystack", async (req, res) => {
  try {
    const evt = req.body;
    if (evt?.event === "charge.success" && evt?.data?.reference) {
      await db
        .update(paymentsTable)
        .set({ status: "success", completedAt: new Date() })
        .where(eq(paymentsTable.providerReference, evt.data.reference));
    }
    res.json({ received: true });
  } catch {
    res.status(200).json({ received: true });
  }
});

router.post("/webhook/flutterwave", async (req, res) => {
  try {
    const evt = req.body;
    const txRef = evt?.data?.tx_ref || evt?.txRef;
    if (
      txRef &&
      (evt?.data?.status === "successful" || evt?.status === "successful")
    ) {
      await db
        .update(paymentsTable)
        .set({ status: "success", completedAt: new Date() })
        .where(eq(paymentsTable.providerReference, txRef));
    }
    res.json({ received: true });
  } catch {
    res.status(200).json({ received: true });
  }
});

export default router;
