import { useState } from "react";
import { Heart, Coffee, Gift, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaymentProviderSelect, {
  usePaymentProviders,
  type Provider,
} from "@/components/payments/PaymentProviderSelect";

interface Props {
  username?: string;
}

const TIP_AMOUNTS = [
  { amount: 3, label: "$3", icon: Coffee, note: "Buy a coffee" },
  { amount: 10, label: "$10", icon: Heart, note: "Show some love" },
  { amount: 25, label: "$25", icon: Gift, note: "Big supporter" },
];

export default function TipJarButton({ username }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(10);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { enabled, loading: providersLoading } = usePaymentProviders();
  const firstEnabled = (Object.entries(enabled).find(([, v]) => v)?.[0] ||
    null) as Provider | null;
  const [provider, setProvider] = useState<Provider | null>(null);
  const effectiveProvider = provider || firstEnabled;
  const { toast } = useToast();

  const handleTip = async () => {
    if (!effectiveProvider) {
      toast({
        title: "No payment processor configured",
        description: "Set up Stripe, Paystack, or Flutterwave to send tips.",
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
          type: "tip",
          amountCents: selected * 100,
          email,
          username,
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
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-md text-accent font-bold text-sm transition-all"
      >
        <Heart size={14} />
        Tip
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-sm relative max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-white mb-1">
              Tip {username || "this creator"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Show appreciation. 100% goes to the creator.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {TIP_AMOUNTS.map((t) => {
                const Icon = t.icon;
                const active = selected === t.amount;
                return (
                  <button
                    key={t.amount}
                    onClick={() => setSelected(t.amount)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-md border transition-all ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-black/30 hover:border-white/20"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={active ? "text-primary" : "text-muted-foreground"}
                    />
                    <span className={`font-bold text-sm ${active ? "text-white" : "text-muted-foreground"}`}>
                      {t.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t.note}
                    </span>
                  </button>
                );
              })}
            </div>

            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 bg-black/40 border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />

            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">
                Payment method
              </p>
              {providersLoading ? (
                <div className="text-xs text-muted-foreground py-3 text-center">
                  Loading…
                </div>
              ) : !firstEnabled ? (
                <div className="text-xs text-amber-400/80 py-3 text-center bg-amber-500/5 border border-amber-500/20 rounded-md">
                  No payment processor configured
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
              onClick={handleTip}
              disabled={submitting || !firstEnabled}
              className="w-full py-3 rounded-md font-bold text-sm bg-primary hover:bg-primary/90 text-white transition-all shadow-[0_0_15px_rgba(220,20,60,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>Send ${selected}</>
              )}
            </button>

            <p className="text-[10px] text-center text-muted-foreground mt-3">
              Secure checkout via Stripe, Paystack, or Flutterwave
            </p>
          </div>
        </div>
      )}
    </>
  );
}
