import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { User } from "lucide-react";

import NotificationBell from "@/components/notifications/NotificationBell";
import SearchBar from "@/components/search/SearchBar";

export default function AppHeader() {
  const [location] = useLocation();
  const [hidden, setHidden] = useState(false);

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

          <Link href="/profile">
            <span className="text-white opacity-80 hover:opacity-100 cursor-pointer">
              <User className="w-5 h-5" />
            </span>
          </Link>
        </div>

      </div>
    </header>
  );
}