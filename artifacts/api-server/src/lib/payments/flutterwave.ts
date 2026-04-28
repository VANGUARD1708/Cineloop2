import { randomUUID } from "node:crypto";
import type { CheckoutRequest, CheckoutResponse, VerifyResult } from "./types";

const FLW_API = "https://api.flutterwave.com/v3";

function getKey(): string | null {
  return process.env.FLUTTERWAVE_SECRET_KEY || null;
}

export function isFlutterwaveEnabled(): boolean {
  return !!getKey();
}

export async function createFlutterwaveCheckout(
  req: CheckoutRequest,
): Promise<CheckoutResponse> {
  const key = getKey();
  if (!key) throw new Error("Flutterwave not configured");

  const tx_ref = `cl_${Date.now()}_${randomUUID().slice(0, 8)}`;

  const body = {
    tx_ref,
    amount: (req.amountCents / 100).toFixed(2),
    currency: req.currency.toUpperCase(),
    redirect_url: req.successUrl,
    customer: { email: req.customerEmail },
    customizations: {
      title: "CineLoop",
      description: req.description,
    },
    meta: {
      type: req.type,
      plan: req.plan || "",
    },
  };

  const res = await fetch(`${FLW_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Flutterwave error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    status: string;
    message: string;
    data?: { link: string };
  };

  if (data.status !== "success" || !data.data) {
    throw new Error(`Flutterwave init failed: ${data.message}`);
  }

  return { checkoutUrl: data.data.link, reference: tx_ref };
}

export async function verifyFlutterwave(
  txId: string,
): Promise<VerifyResult> {
  const key = getKey();
  if (!key) throw new Error("Flutterwave not configured");

  /* Flutterwave returns transaction_id (numeric) on redirect; use it for verify */
  const res = await fetch(
    `${FLW_API}/transactions/${encodeURIComponent(txId)}/verify`,
    { headers: { Authorization: `Bearer ${key}` } },
  );

  if (!res.ok) throw new Error(`Flutterwave verify error: ${res.status}`);

  const data = (await res.json()) as {
    status: string;
    data?: {
      status: string;
      amount: number;
      currency: string;
      tx_ref: string;
    };
  };

  if (data.status !== "success" || !data.data) {
    return { status: "failed", amountCents: 0, currency: "USD", reference: txId };
  }

  const status =
    data.data.status === "successful"
      ? "success"
      : data.data.status === "failed"
        ? "failed"
        : "pending";

  return {
    status,
    amountCents: Math.round(data.data.amount * 100),
    currency: data.data.currency,
    reference: data.data.tx_ref,
  };
}
