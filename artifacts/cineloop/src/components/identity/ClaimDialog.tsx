import { useState } from "react";
import { Mail, Loader2, X } from "lucide-react";
import { useIdentity } from "@/hooks/useIdentity";

interface Props {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
  title?: string;
  subtitle?: string;
}

export default function ClaimDialog({ open, onClose, initialEmail, title, subtitle }: Props) {
  const { claim } = useIdentity();
  const [email, setEmail] = useState(initialEmail || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await claim(email);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="claim-dialog"
    >
      <div
        className="bg-zinc-950 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{title || "Sign in to CineLoop"}</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {subtitle || "Just your email — we'll keep your watch progress, Pro perks, and tips synced."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-black border border-white/10 rounded-md py-3 pl-10 pr-3 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none"
              data-testid="input-claim-email"
            />
          </div>

          {error && <div className="text-xs text-rose-400">{error}</div>}

          <button
            type="submit"
            disabled={busy || !email.includes("@")}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-bold text-white text-sm flex items-center justify-center gap-2 transition-all"
            data-testid="button-claim-submit"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Continue
          </button>
        </form>

        <p className="text-[11px] text-zinc-600 text-center mt-4">
          No password required. We use a lightweight email link to identify you across devices.
        </p>
      </div>
    </div>
  );
}
