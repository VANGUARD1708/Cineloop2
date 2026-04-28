import { useState } from "react";
import { Check, Crown, Zap, Sparkles, Film, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaymentProviderSelect, {
  usePaymentProviders,
  type Provider,
} from "@/components/payments/PaymentProviderSelect";

type Cycle = "monthly" | "annual";

const FEATURES_FREE = [
  "TikTok-style trailer feed",
  "Browse trending movies & series",
  "Like, save & share",
  "Limited daily swipes",
  "Standard quality previews",
];

const FEATURES_PRO = [
  "Everything in Free",
  "Ad-free experience",
  "Unlimited daily swipes",
  "HD trailer playback",
  "Custom feed themes",
  "Early access to new features",
  "Priority Watch Now deep links",
  "Profile flair & supporter badge",
];

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [email, setEmail] = useState("");
  const { enabled, loading: providersLoading } = usePaymentProviders();
  const firstEnabled = (Object.entries(enabled).find(([, v]) => v)?.[0] ||
    null) as Provider | null;
  const [provider, setProvider] = useState<Provider | null>(firstEnabled);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const effectiveProvider = provider || firstEnabled;
  const proPrice = cycle === "monthly" ? 4.99 : 49.99;
  const proSub = cycle === "monthly" ? "/month" : "/year";
  const savings = cycle === "annual" ? "Save 17%" : null;

  const handleUpgrade = async () => {
    if (!effectiveProvider) {
      toast({
        title: "No payment processor configured",
        description: "Set up Stripe, Paystack, or Flutterwave to enable checkout.",
        variant: "destructive",
      });
      return;
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({
        title: "Email required",
        description: "We need an email to send your receipt.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const base = import.meta.env.BASE_URL;
      const res = await fetch(`${base}api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: effectiveProvider,
          type: "subscription",
          plan: cycle,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Could not start checkout");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast({
        title: "Checkout error",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-white p-4 md:p-12 pt-8 pb-24 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-primary text-xs font-bold mb-4">
            <Sparkles size={14} />
            CINELOOP PRO
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Upgrade your <span className="text-primary">cinema</span>.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Cancel anytime. Pro unlocks an ad-free experience, HD playback,
            and unlimited browsing.
          </p>

          <div className="inline-flex mt-6 p-1 bg-card border border-border rounded-full">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                cycle === "monthly"
                  ? "bg-primary text-white"
                  : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("annual")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                cycle === "annual"
                  ? "bg-primary text-white"
                  : "text-muted-foreground"
              }`}
            >
              Annual {savings && <span className="text-accent ml-1">({savings})</span>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-card border border-border rounded-xl p-8 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Film className="text-muted-foreground" size={20} />
              <h2 className="text-xl font-bold text-white">Free</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Get started with the basics.
            </p>
            <div className="text-4xl font-black mb-6">
              $0
              <span className="text-base font-normal text-muted-foreground">
                /forever
              </span>
            </div>

            <ul className="space-y-3 flex-1">
              {FEATURES_FREE.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-zinc-300">{f}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="mt-8 w-full py-3 rounded-md font-bold text-sm bg-white/5 text-muted-foreground border border-white/10 cursor-default"
            >
              Your current plan
            </button>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-primary/10 via-card to-card border-2 border-primary rounded-xl p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="absolute top-4 right-4 px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
              Most Popular
            </div>

            <div className="flex items-center gap-2 mb-2 relative z-10">
              <Crown className="text-primary" size={20} />
              <h2 className="text-xl font-bold text-white">Pro</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 relative z-10">
              The full cinematic experience.
            </p>
            <div className="text-4xl font-black mb-6 relative z-10">
              ${proPrice.toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">
                {proSub}
              </span>
            </div>

            <ul className="space-y-3 flex-1 relative z-10">
              {FEATURES_PRO.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-white">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-3 relative z-10">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-black/40 border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">
                  Payment method
                </p>
                {providersLoading ? (
                  <div className="text-xs text-muted-foreground py-3 text-center">
                    Loading…
                  </div>
                ) : !firstEnabled ? (
                  <div className="text-xs text-amber-400/80 py-3 text-center bg-amber-500/5 border border-amber-500/20 rounded-md">
                    No payment processor configured yet
                  </div>
                ) : (
                  <PaymentProviderSelect
                    selected={effectiveProvider}
                    onChange={setProvider}
                    enabled={enabled}
                  />
                )}
              </div>

              <button
                onClick={handleUpgrade}
                disabled={submitting || !firstEnabled}
                className="w-full py-3 rounded-md font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(220,20,60,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Upgrade to Pro · ${proPrice}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-10 text-xs text-muted-foreground">
          Secure checkout via Stripe, Paystack, or Flutterwave · Cancel anytime
        </div>
      </div>
    </div>
  );
}
