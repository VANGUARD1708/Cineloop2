import { useState } from "react";
import { Heart, Coffee, Gift, X } from "lucide-react";

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

  const handleTip = () => {
    /*
      Stripe / Buy Me a Coffee integration:
      Replace this with a real Stripe Checkout session create call,
      or deep-link to your Buy Me a Coffee profile.
        e.g. window.open(`https://buymeacoffee.com/${username}`)
    */
    window.open(
      `https://www.buymeacoffee.com/${username || "cineloop"}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
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
            className="bg-card border border-border rounded-xl p-6 w-full max-w-sm relative"
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

            <div className="grid grid-cols-3 gap-2 mb-5">
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

            <button
              onClick={handleTip}
              className="w-full py-3 rounded-md font-bold text-sm bg-primary hover:bg-primary/90 text-white transition-all shadow-[0_0_15px_rgba(220,20,60,0.4)]"
            >
              Send ${selected}
            </button>

            <p className="text-[10px] text-center text-muted-foreground mt-3">
              Powered by Buy Me a Coffee · Stripe checkout coming soon
            </p>
          </div>
        </div>
      )}
    </>
  );
}
