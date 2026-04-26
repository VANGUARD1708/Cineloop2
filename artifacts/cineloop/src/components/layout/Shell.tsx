import { Link, useLocation } from "wouter";
import { Home, Flame, Compass, Users, User, Trophy, PlusSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/trending", label: "Trending", icon: Flame },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/leaderboard", label: "Rankings", icon: Trophy },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={20} className={cn(isActive && "text-white")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <Link href="/upload" className="w-full mt-auto">
          <div className="flex items-center gap-3 px-3 py-3 rounded-md transition-all cursor-pointer font-medium text-muted-foreground hover:text-white hover:bg-white/5 border border-white/10 mt-4">
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
                <Icon
                  size={24}
                  className={cn(
                    "transition-all duration-300",
                    isActive
                      ? "text-primary filter drop-shadow-[0_0_8px_rgba(220,20,60,0.8)]"
                      : "text-muted-foreground"
                  )}
                />
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}