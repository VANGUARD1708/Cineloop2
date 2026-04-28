import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

interface VerifyResponse {
  status: "success" | "failed" | "pending";
  amountCents: number;
  currency: string;
  type?: string;
  plan?: string | null;
}

export default function PayReturnPage() {
  const [state, setState] = useState<"loading" | "success" | "failed" | "pending">(
    "loading",
  );
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const provider = url.searchParams.get("provider");
    /* Different providers send back different param names */
    const reference =
      url.searchParams.get("reference") ||
      url.searchParams.get("trxref") ||
      url.searchParams.get("transaction_id") ||
      url.searchParams.get("session_id");

    if (!provider || !reference) {
      setState("failed");
      setError("Missing payment reference");
      return;
    }

    const base = import.meta.env.BASE_URL;
    const params = new URLSearchParams({ provider, reference });
    fetch(`${base}api/payments/verify?${params.toString()}`)
      .then((r) => r.json())
      .then((d: VerifyResponse & { error?: string }) => {
        if (d.error) {
          setState("failed");
          setError(d.error);
        } else {
          setData(d);
          setState(d.status);
        }
      })
      .catch((e) => {
        setState("failed");
        setError(e instanceof Error ? e.message : "Verification failed");
      });
  }, []);

  return (
    <div className="w-full min-h-screen bg-background text-white flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center">
        {state === "loading" && (
          <>
            <Loader2 size={48} className="text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifying payment…</h1>
            <p className="text-sm text-muted-foreground">
              Hang tight while we confirm with the processor.
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment successful</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {data?.type === "subscription"
                ? `Welcome to CineLoop Pro (${data?.plan ?? "monthly"}). Your supporter perks are unlocked.`
                : `Thanks for the support — your tip went through!`}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-md font-bold text-sm transition-all"
            >
              Back to feed
              <ArrowRight size={14} />
            </Link>
          </>
        )}

        {state === "pending" && (
          <>
            <Loader2 size={48} className="text-amber-500 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment pending</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We haven't received final confirmation yet. Check back in a moment.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border hover:border-white/20 rounded-md font-bold text-sm transition-all"
            >
              Back to pricing
            </Link>
          </>
        )}

        {state === "failed" && (
          <>
            <XCircle size={56} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment failed</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {error || "The transaction did not complete. No charge was made."}
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-md font-bold text-sm transition-all"
            >
              Try again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
