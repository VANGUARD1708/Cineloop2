import type { CheckoutRequest, CheckoutResponse, VerifyResult } from "./types";

const STRIPE_API = "https://api.stripe.com/v1";

function getKey(): string | null {
  return process.env.STRIPE_SECRET_KEY || null;
}

export function isStripeEnabled(): boolean {
  return !!getKey();
}

function form(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.append(k, String(v));
  }
  return usp.toString();
}

export async function createStripeCheckout(
  req: CheckoutRequest,
): Promise<CheckoutResponse> {
  const key = getKey();
  if (!key) throw new Error("Stripe not configured");

  const params: Record<string, string | number> = {
    mode: "payment",
    success_url: req.successUrl,
    cancel_url: req.cancelUrl,
    customer_email: req.customerEmail,
    "line_items[0][price_data][currency]": req.currency.toLowerCase(),
    "line_items[0][price_data][product_data][name]": req.description,
    "line_items[0][price_data][unit_amount]": req.amountCents,
    "line_items[0][quantity]": 1,
    "metadata[type]": req.type,
    "metadata[plan]": req.plan || "",
  };

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: string; url: string };
  return { checkoutUrl: data.url, reference: data.id };
}

export async function verifyStripe(reference: string): Promise<VerifyResult> {
  const key = getKey();
  if (!key) throw new Error("Stripe not configured");

  const res = await fetch(`${STRIPE_API}/checkout/sessions/${reference}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) throw new Error(`Stripe verify error: ${res.status}`);
  const data = (await res.json()) as {
    id: string;
    payment_status: string;
    amount_total: number;
    currency: string;
  };

  return {
    status:
      data.payment_status === "paid"
        ? "success"
        : data.payment_status === "unpaid"
          ? "pending"
          : "failed",
    amountCents: data.amount_total ?? 0,
    currency: (data.currency || "usd").toUpperCase(),
    reference: data.id,
  };
}
