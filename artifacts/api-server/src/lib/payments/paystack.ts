import type { CheckoutRequest, CheckoutResponse, VerifyResult } from "./types";

const PAYSTACK_API = "https://api.paystack.co";

function getKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

export function isPaystackEnabled(): boolean {
  return !!getKey();
}

export async function createPaystackCheckout(
  req: CheckoutRequest,
): Promise<CheckoutResponse> {
  const key = getKey();
  if (!key) throw new Error("Paystack not configured");

  const body = {
    email: req.customerEmail,
    amount: req.amountCents,
    currency: req.currency.toUpperCase(),
    callback_url: req.successUrl,
    metadata: {
      type: req.type,
      plan: req.plan || null,
      description: req.description,
    },
  };

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; reference: string };
  };

  if (!data.status || !data.data) {
    throw new Error(`Paystack init failed: ${data.message}`);
  }

  return {
    checkoutUrl: data.data.authorization_url,
    reference: data.data.reference,
  };
}

export async function verifyPaystack(reference: string): Promise<VerifyResult> {
  const key = getKey();
  if (!key) throw new Error("Paystack not configured");

  const res = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );

  if (!res.ok) throw new Error(`Paystack verify error: ${res.status}`);

  const data = (await res.json()) as {
    status: boolean;
    data?: {
      status: string;
      amount: number;
      currency: string;
      reference: string;
    };
  };

  if (!data.status || !data.data) {
    return { status: "failed", amountCents: 0, currency: "USD", reference };
  }

  const status =
    data.data.status === "success"
      ? "success"
      : data.data.status === "failed" || data.data.status === "abandoned"
        ? "failed"
        : "pending";

  return {
    status,
    amountCents: data.data.amount,
    currency: data.data.currency,
    reference: data.data.reference,
  };
}
