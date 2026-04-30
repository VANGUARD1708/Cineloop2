import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Crown, LogOut, RefreshCw, Loader2, Mail, ChevronRight, Sparkles } from "lucide-react";
import { useIdentity } from "@/hooks/useIdentity";
import ClaimDialog from "@/components/identity/ClaimDialog";

interface SubStatus {
  isPro: boolean;
  proUntil: string | null;
  proPlan: string | null;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number;
}

const BASE = import.meta.env.BASE_URL;

export default function AccountPage() {
  const { user, loading, refresh, signOut } = useIdentity();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  async function loadSub() {
    const res = await fetch(`${BASE}api/subscription`, { credentials: "include" });
    if (res.ok) setSub(await res.json());
  }

  useEffect(() => {
    if (user) loadSub();
  }, [user]);

  async function cancelSub() {
    setBusy(true);
    await fetch(`${BASE}api/subscription/cancel`, { method: "POST", credentials: "include" });
    await loadSub();
    await refresh();
    setBusy(false);
  }

  async function resumeSub() {
    setBusy(true);
    await fetch(`${BASE}api/subscription/resume`, { method: "POST", credentials: "include" });
    await loadSub();
    await refresh();
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen w-full bg-background text-white p-6 md:p-10 flex items-center justify-center">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <Mail size={28} className="text-zinc-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Sign in to manage your account</h1>
            <p className="text-sm text-zinc-400 mb-6">
              We use a lightweight email identity to sync your Pro perks, watch history, and tips across devices.
            </p>
            <button
              onClick={() => setShowClaim(true)}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 rounded-md font-bold text-sm transition-all"
              data-testid="button-open-claim"
            >
              Sign in with email
            </button>
          </div>
        </div>
        <ClaimDialog open={showClaim} onClose={() => setShowClaim(false)} />
      </>
    );
  }

  const proUntilDate = sub?.proUntil ? new Date(sub.proUntil) : null;

  return (
    <div className="min-h-screen w-full bg-background text-white p-4 md:p-10 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account</h1>

        {/* Identity card */}
        <div className="bg-card border border-white/10 rounded-xl p-5 mb-5" data-testid="card-identity">
          <div className="flex items-center gap-4">
            <img
              src={user.avatarUrl}
              alt=""
              className="w-14 h-14 rounded-full border border-white/10"
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{user.displayName}</div>
              <div className="text-xs text-zinc-500 truncate">{user.email}</div>
            </div>
            {user.isPro && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 uppercase">
                <Crown size={10} className="inline mr-1 -mt-0.5" /> Pro
              </span>
            )}
          </div>
        </div>

        {/* Subscription card */}
        <div className="bg-card border border-white/10 rounded-xl p-5 mb-5" data-testid="card-subscription">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Subscription</h2>

          {sub?.isPro ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Plan</div>
                  <div className="font-bold capitalize">{sub.proPlan ?? "monthly"}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">
                    {sub.cancelAtPeriodEnd ? "Ends on" : "Renews on"}
                  </div>
                  <div className="font-bold" data-testid="text-pro-until">
                    {proUntilDate ? proUntilDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Days remaining</div>
                  <div className="font-bold" data-testid="text-days-remaining">{sub.daysRemaining}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Status</div>
                  <div className={`font-bold ${sub.cancelAtPeriodEnd ? "text-amber-400" : "text-green-400"}`}>
                    {sub.cancelAtPeriodEnd ? "Cancelling" : "Active"}
                  </div>
                </div>
              </div>

              {sub.cancelAtPeriodEnd ? (
                <button
                  onClick={resumeSub}
                  disabled={busy}
                  className="w-full py-3 rounded-md font-bold text-sm bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  data-testid="button-resume-sub"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  <RefreshCw size={14} />
                  Keep my Pro membership
                </button>
              ) : (
                <button
                  onClick={cancelSub}
                  disabled={busy}
                  className="w-full py-3 rounded-md font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  data-testid="button-cancel-sub"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  Cancel subscription
                </button>
              )}
              <p className="text-[11px] text-zinc-600 mt-2 text-center">
                Cancelling stops auto-renewal. Your Pro perks stay active until {proUntilDate?.toLocaleDateString() || "the end of your period"}.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-4">You don't have an active subscription.</p>
              <Link
                href="/pricing"
                className="block w-full py-3 rounded-md font-bold text-sm bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-center transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                Upgrade to Pro
              </Link>
            </>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-card border border-white/10 rounded-xl overflow-hidden mb-5">
          <Link
            href="/profile"
            className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <span className="text-sm">Profile & XP</span>
            <ChevronRight size={16} className="text-zinc-500" />
          </Link>
          <Link
            href="/taste"
            data-testid="link-taste"
            className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <span className="text-sm flex items-center gap-2">
              <span className="text-amber-300">✦</span>
              Your cinematic taste
            </span>
            <ChevronRight size={16} className="text-zinc-500" />
          </Link>
          <Link
            href="/pricing"
            className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <span className="text-sm">Pricing & tip jar</span>
            <ChevronRight size={16} className="text-zinc-500" />
          </Link>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-md font-medium text-sm text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5 border border-white/5 transition-all flex items-center justify-center gap-2"
          data-testid="button-sign-out"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}
