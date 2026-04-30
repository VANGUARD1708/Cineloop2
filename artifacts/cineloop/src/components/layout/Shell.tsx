import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Flame,
  Compass,
  Users,
  User,
  Trophy,
  PlusSquare,
  Crown,
  Sparkles,
  LogIn,
  Settings,
  Shield,
  Search,
  Bell,
  Heart,
  Menu as MenuIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdentity } from "@/hooks/useIdentity";
import ClaimDialog from "@/components/identity/ClaimDialog";
import MobileMenuSheet from "@/components/layout/MobileMenuSheet";

const NAV_ITEMS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/trending", label: "Trending", icon: Flame },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/mood", label: "Mood Match", icon: Sparkles, accent: true },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/search", label: "Search", icon: Search },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/leaderboard", label: "Rankings", icon: Trophy },
];

// Curated 4 essentials for the mobile bottom bar (5th slot is the Menu sheet).
const MOBILE_NAV = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/mood", label: "Mood", icon: Sparkles, accent: true },
  { href: "/search", label: "Search", icon: Search },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading } = useIdentity();
  const [showClaim, setShowClaim] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all cursor-pointer font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(220,20,60,0.3)]"
                      : item.accent
                      ? "text-rose-200 hover:text-white hover:bg-white/5 bg-gradient-to-r from-rose-500/5 to-violet-500/5 border border-white/[0.04]"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                  data-testid={`link-sidebar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
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

          {/* Taste DNA — only for signed-in users */}
          {!loading && user && (
            <Link href="/taste" className="w-full" data-testid="link-sidebar-taste">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all cursor-pointer font-medium",
                  location === "/taste"
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(220,20,60,0.3)]"
                    : "text-muted-foreground hover:text-white hover:bg-white/5",
                )}
              >
                <Heart size={20} className={cn(location === "/taste" && "text-white")} />
                Taste DNA
              </div>
            </Link>
          )}
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

        {!loading && user?.isAdmin && (
          <Link href="/admin" className="w-full" data-testid="link-sidebar-admin">
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-md transition-all cursor-pointer font-medium border mt-2",
                location === "/admin"
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-100"
                  : "border-white/10 text-rose-300/80 hover:text-rose-100 hover:bg-rose-500/10",
              )}
            >
              <Shield size={20} />
              Admin
            </div>
          </Link>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative h-full overflow-hidden md:pb-0 pb-16">
        {children}
      </main>

      {/* Mobile Bottom Nav: 4 essentials + Menu */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-stretch justify-around px-1 z-50"
        data-testid="nav-mobile-bottom"
      >
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1"
              data-testid={`link-mobile-${item.label.toLowerCase()}`}
            >
              <div className="flex flex-col items-center justify-center h-full px-1 cursor-pointer">
                <Icon
                  size={20}
                  className={cn(
                    isActive
                      ? "text-primary"
                      : item.accent
                      ? "text-rose-300"
                      : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] mt-0.5 font-medium",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}

        {/* Menu / Profile sheet trigger */}
        <button
          type="button"
          onClick={() => setShowMobileMenu(true)}
          className="flex-1 flex flex-col items-center justify-center px-1 cursor-pointer relative"
          data-testid="button-mobile-menu-open"
          aria-label="Open menu"
        >
          {!loading && user ? (
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt=""
                className={cn(
                  "h-6 w-6 rounded-full border",
                  user.isPro ? "border-amber-400/70" : "border-white/20",
                )}
              />
              {user.isAdmin && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 ring-2 ring-card">
                  <Shield className="h-2 w-2 text-white" strokeWidth={3} />
                </span>
              )}
            </div>
          ) : (
            <MenuIcon size={20} className="text-muted-foreground" />
          )}
          <span className="text-[10px] mt-0.5 font-medium text-muted-foreground">
            {!loading && user ? "Menu" : "More"}
          </span>
        </button>
      </nav>

      <ClaimDialog open={showClaim} onClose={() => setShowClaim(false)} />
      <MobileMenuSheet
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onSignIn={() => setShowClaim(true)}
      />
    </div>
  );
}
