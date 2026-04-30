import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Crown, Calendar } from "lucide-react";
import { useIdentity } from "@/hooks/useIdentity";
import ClaimDialog from "@/components/identity/ClaimDialog";

interface VerifyResponse {
  status: "success" | "failed" | "pending";
  amountCents: number;
  currency: string;
  type?: string | null;
  plan?: string | null;
  email?: string | null;
}

const BASE = import.meta.env.BASE_URL;

export default function PayReturnPage() {
  const { user, refresh } = useIdentity();
  const [state, setState] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proUntil, setProUntil] = useState<string | null>(null);
  const [showClaim, setShowClaim] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const provider = url.searchParams.get("provider");
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

    const params = new URLSearchParams({ provider, reference });
    fetch(`${BASE}api/payments/verify?${params.toString()}`)
      .then((r) => r.json())
      .then(async (d: VerifyResponse & { error?: string }) => {
        if (d.error) {
          setState("failed");
          setError(d.error);
        } else {
          setData(d);
          setState(d.status);
          if (d.status === "success") {
            // Refresh identity so isPro flips on
            await refresh();
            // Pull subscription end date if user is now signed in
            try {
              const r2 = await fetch(`${BASE}api/subscription`, { credentials: "include" });
              if (r2.ok) {
                const sub = await r2.json();
                setProUntil(sub.proUntil);
              }
            } catch {}
          }
        }
      })
      .catch((e) => {
        setState("failed");
        setError(e instanceof Error ? e.message : "Verification failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After successful payment, if user has not yet claimed identity AND we have email, prompt
  useEffect(() => {
    if (state === "success" && !user && data?.email && !data.email.startsWith("guest_")) {
      setShowClaim(true);
    }
  }, [state, user, data]);

  const proUntilDate = proUntil ? new Date(proUntil) : null;
  const isSub = data?.type === "subscription";

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
            <div className="relative w-16 h-16 mx-auto mb-4">
              <CheckCircle2 size={64} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment successful</h1>

            {isSub ? (
              <>
                <div className="my-5 p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/30">
                  <Crown size={28} className="text-amber-400 mx-auto mb-2" />
                  <div className="text-sm font-bold text-amber-300 tracking-widest uppercase">CineLoop Pro</div>
                  <div className="text-xs text-zinc-400 mt-1 capitalize">{data?.plan ?? "monthly"} plan</div>
                  {proUntilDate && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 text-xs text-white">
                      <Calendar size={12} className="text-zinc-400" />
                      Active until <span className="font-bold" data-testid="text-receipt-pro-until">
                        {proUntilDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>

                {data?.email && (
                  <p className="text-xs text-zinc-500 mb-4">
                    Receipt and welcome details sent to <span className="text-zinc-300">{data.email}</span>.
                  </p>
                )}

                <div className="flex gap-2">
                  <Link
                    href="/account"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-card border border-white/10 hover:border-white/20 rounded-md font-bold text-sm transition-all"
                  >
                    Manage account
                  </Link>
                  <Link
                    href="/"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-md font-bold text-sm transition-all"
                  >
                    Back to feed
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Thanks for the support — your tip went through!
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

      <ClaimDialog
        open={showClaim}
        onClose={() => setShowClaim(false)}
        initialEmail={data?.email ?? ""}
        title="Sync your Pro membership"
        subtitle="Confirm the email you used at checkout so we can link Pro to this device."
      />
    </div>
  );
}
