import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { User, Crown } from "lucide-react";

import NotificationBell from "@/components/notifications/NotificationBell";
import SearchBar from "@/components/search/SearchBar";
import { useIdentity } from "@/hooks/useIdentity";

export default function AppHeader() {
  const [location] = useLocation();
  const [hidden, setHidden] = useState(false);
  const { user } = useIdentity();

  // hide header on feed
  useEffect(() => {
    setHidden(location === "/");
  }, [location]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        hidden ? "-translate-y-full" : ""
      }`}
    >
      <div className="flex items-center gap-4 px-4 py-3 bg-black/70 backdrop-blur-md border-b border-white/10">

        <Link href="/">
          <span className="text-white font-semibold text-lg tracking-tight cursor-pointer">
            CineFeed
          </span>
        </Link>

        <div className="flex-1 max-w-md mx-2">
          <SearchBar />
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />

          <Link href="/account" data-testid="link-header-account">
            <span className="text-white opacity-80 hover:opacity-100 cursor-pointer flex items-center gap-1.5">
              {user?.isPro && <Crown className="w-4 h-4 text-amber-400" />}
              {user ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full border border-white/20"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </span>
          </Link>
        </div>

      </div>
    </header>
  );
}