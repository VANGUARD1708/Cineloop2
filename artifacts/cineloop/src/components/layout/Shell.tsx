import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Flame, Compass, Users, User, Trophy, PlusSquare, Crown, Sparkles, LogIn, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdentity } from "@/hooks/useIdentity";
import ClaimDialog from "@/components/identity/ClaimDialog";

const NAV_ITEMS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/trending", label: "Trending", icon: Flame },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/mood", label: "Mood Match", icon: Sparkles, accent: true },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/leaderboard", label: "Rankings", icon: Trophy },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading } = useIdentity();
  const [showClaim, setShowClaim] = useState(false);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 z-50">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center font-bold text-white tracking-tighter">
            CL
          </div>
          <span className="font-serif font-bold text-xl tracking-wide uppercase text-white">CineLoop</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md transition-all cursor-pointer font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(220,20,60,0.3)]"
                      : item.accent
                      ? "text-rose-200 hover:text-white hover:bg-white/5 bg-gradient-to-r from-rose-500/5 to-violet-500/5 border border-white/[0.04]"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon
                    size={20}
                    className={cn(
                      isActive && "text-white",
                      !isActive && item.accent && "text-rose-300"
                    )}
                  />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Identity area */}
        {!loading && user && user.isPro && (
          <Link href="/account" className="w-full mt-auto" data-testid="link-account-pro">
            <div className="flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 mt-4 transition-all hover:from-amber-500/20 hover:to-rose-500/20">
              <Crown size={18} className="text-amber-400" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">Pro Member</div>
                <div className="text-xs text-white truncate">{user.displayName}</div>
              </div>
              <Settings size={14} className="text-zinc-400" />
            </div>
          </Link>
        )}

        {!loading && user && !user.isPro && (
          <div className="mt-auto pt-4 space-y-2">
            <Link href="/pricing">
              <div className="flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer font-bold bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/40 text-white hover:from-primary/30 hover:to-accent/30 shadow-[0_0_15px_rgba(220,20,60,0.2)] transition-all">
                <Crown size={20} className="text-primary" />
                Upgrade to Pro
              </div>
            </Link>
            <Link href="/account" data-testid="link-account-free">
              <div className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm">
                <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                <span className="truncate flex-1">{user.displayName}</span>
              </div>
            </Link>
          </div>
        )}

        {!loading && !user && (
          <div className="mt-auto pt-4 space-y-2">
            <Link href="/pricing">
              <div className="flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer font-bold bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/40 text-white hover:from-primary/30 hover:to-accent/30 transition-all">
                <Crown size={20} className="text-primary" />
                Upgrade to Pro
              </div>
            </Link>
            <button
              onClick={() => setShowClaim(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm border border-white/5"
              data-testid="button-sidebar-signin"
            >
              <LogIn size={16} />
              Sign in
            </button>
          </div>
        )}

        <Link href="/upload" className="w-full">
          <div className="flex items-center gap-3 px-3 py-3 rounded-md transition-all cursor-pointer font-medium text-muted-foreground hover:text-white hover:bg-white/5 border border-white/10 mt-2">
            <PlusSquare size={20} />
            Upload
          </div>
        </Link>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative h-full overflow-hidden md:pb-0 pb-16">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className="flex flex-col items-center justify-center p-2 cursor-pointer w-14">
                <Icon size={20} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px] mt-1", isActive ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <ClaimDialog open={showClaim} onClose={() => setShowClaim(false)} />
    </div>
  );
}
