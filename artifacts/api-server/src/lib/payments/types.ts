export type PaymentProvider = "stripe" | "paystack" | "flutterwave";
export type PaymentType = "subscription" | "tip";

export interface CheckoutRequest {
  provider: PaymentProvider;
  type: PaymentType;
  plan?: "monthly" | "annual" | null;
  amountCents: number;
  currency: string;
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  reference: string;
}

export interface VerifyResult {
  status: "success" | "failed" | "pending";
  amountCents: number;
  currency: string;
  reference: string;
}
