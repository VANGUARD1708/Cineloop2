import { useEffect, useState } from "react";
import { CreditCard, Globe, Wallet } from "lucide-react";

export type Provider = "stripe" | "paystack" | "flutterwave";

interface ProvidersResponse {
  providers: Record<Provider, boolean>;
}

const META: Record<
  Provider,
  { label: string; sub: string; icon: typeof CreditCard; tint: string }
> = {
  stripe: {
    label: "Card",
    sub: "Stripe · global",
    icon: CreditCard,
    tint: "purple",
  },
  paystack: {
    label: "Paystack",
    sub: "Africa · cards & bank",
    icon: Wallet,
    tint: "cyan",
  },
  flutterwave: {
    label: "Flutterwave",
    sub: "Africa & global",
    icon: Globe,
    tint: "amber",
  },
};

export function usePaymentProviders() {
  const [enabled, setEnabled] = useState<Record<Provider, boolean>>({
    stripe: false,
    paystack: false,
    flutterwave: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;
    fetch(`${base}api/payments/providers`)
      .then((r) => r.json())
      .then((d: ProvidersResponse) => {
        if (!cancelled) {
          setEnabled(d.providers);
          setLoading(false);
        }
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}

interface Props {
  selected: Provider | null;
  onChange: (p: Provider) => void;
  enabled: Record<Provider, boolean>;
}

export default function PaymentProviderSelect({
  selected,
  onChange,
  enabled,
}: Props) {
  const order: Provider[] = ["stripe", "paystack", "flutterwave"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {order.map((p) => {
        const m = META[p];
        const Icon = m.icon;
        const isEnabled = enabled[p];
        const isActive = selected === p;
        return (
          <button
            key={p}
            type="button"
            disabled={!isEnabled}
            onClick={() => isEnabled && onChange(p)}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-md border transition-all text-left ${
              isActive
                ? "border-primary bg-primary/10"
                : isEnabled
                  ? "border-border bg-black/30 hover:border-white/20"
                  : "border-border/50 bg-black/20 opacity-40 cursor-not-allowed"
            }`}
          >
            <Icon
              size={18}
              className={isActive ? "text-primary" : "text-muted-foreground"}
            />
            <span
              className={`font-bold text-xs ${isActive ? "text-white" : "text-zinc-300"}`}
            >
              {m.label}
            </span>
            <span className="text-[9px] text-muted-foreground text-center leading-tight">
              {isEnabled ? m.sub : "Not configured"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
