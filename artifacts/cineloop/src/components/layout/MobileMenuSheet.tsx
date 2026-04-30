import { useEffect } from "react";
import { Link } from "wouter";
import {
  X,
  User as UserIcon,
  Bell,
  Flame,
  Users,
  Trophy,
  PlusSquare,
  Crown,
  Sparkles,
  LogIn,
  Settings,
  Shield,
  Heart,
} from "lucide-react";
import { useIdentity } from "@/hooks/useIdentity";

interface MobileMenuSheetProps {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export default function MobileMenuSheet({ open, onClose, onSignIn }: MobileMenuSheetProps) {
  // Esc to close + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const { user, loading } = useIdentity();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[71] max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-zinc-950/98 backdrop-blur-xl shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.8)] transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="More options"
        data-testid="sheet-mobile-menu"
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header with close */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <span className="font-serif text-lg font-bold uppercase tracking-wide text-white">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
            data-testid="button-mobile-menu-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Identity card */}
        <div className="px-5 pb-3">
          {!loading && user ? (
            <Link
              href="/account"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-3"
              data-testid="link-mobile-menu-account"
            >
              <img src={user.avatarUrl} alt="" className="h-11 w-11 rounded-full border border-white/15" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <span className="truncate">{user.displayName}</span>
                  {user.isPro && <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />}
                </div>
                <div className="truncate text-[11px] text-white/50">
                  {user.isPro ? "Pro Member · manage account" : "View account & settings"}
                </div>
              </div>
              <Settings className="h-4 w-4 flex-shrink-0 text-white/40" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignIn();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
              data-testid="button-mobile-menu-signin"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
                <LogIn className="h-5 w-5 text-white/70" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Sign in</div>
                <div className="text-[11px] text-white/50">Save your taste, cross-device sync</div>
              </div>
            </button>
          )}
        </div>

        {/* Pro upsell — free / anon only */}
        {!loading && !user?.isPro && (
          <div className="px-5 pb-3">
            <Link
              href="/pricing"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-rose-500/15 p-3"
              data-testid="link-mobile-menu-upgrade"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white">
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">Upgrade to Pro</div>
                <div className="text-[11px] text-amber-200/80">Unlimited AI Director · cinematic re-rank</div>
              </div>
            </Link>
          </div>
        )}

        {/* Sections */}
        <div className="px-3 pb-2">
          <Section title="Discover">
            <SheetLink href="/trending" icon={Flame} label="Trending" onClick={onClose} />
            <SheetLink href="/characters" icon={Users} label="Characters" onClick={onClose} />
            <SheetLink href="/leaderboard" icon={Trophy} label="Rankings" onClick={onClose} />
          </Section>

          <Section title="You">
            <SheetLink href="/profile" icon={UserIcon} label="Profile" onClick={onClose} />
            <SheetLink href="/notifications" icon={Bell} label="Notifications" onClick={onClose} />
            {user && (
              <SheetLink href="/taste" icon={Heart} label="Taste DNA" onClick={onClose} />
            )}
          </Section>

          <Section title="Create">
            <SheetLink href="/upload" icon={PlusSquare} label="Upload" onClick={onClose} />
            <SheetLink href="/mood" icon={Sparkles} label="Mood Match" onClick={onClose} accent />
          </Section>

          {!loading && user?.isAdmin && (
            <Section title="Admin">
              <SheetLink
                href="/admin"
                icon={Shield}
                label="Admin Console"
                onClick={onClose}
                tone="rose"
                testId="link-mobile-menu-admin"
              />
            </Section>
          )}
        </div>

        {/* Safe-area spacer */}
        <div className="h-[env(safe-area-inset-bottom,16px)]" />
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SheetLink({
  href,
  icon: Icon,
  label,
  onClick,
  accent,
  tone,
  testId,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick?: () => void;
  accent?: boolean;
  tone?: "rose";
  testId?: string;
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-300 hover:text-rose-100 hover:bg-rose-500/10"
      : accent
      ? "text-rose-200 hover:text-white hover:bg-white/5 bg-gradient-to-r from-rose-500/5 to-violet-500/5"
      : "text-white/80 hover:text-white hover:bg-white/5";

  return (
    <Link href={href} onClick={onClick} className="block" data-testid={testId}>
      <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${toneClass}`}>
        <Icon size={18} className={accent ? "text-rose-300" : tone === "rose" ? "text-rose-400" : "text-white/60"} />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </Link>
  );
}
