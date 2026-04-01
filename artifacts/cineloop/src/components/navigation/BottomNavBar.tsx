"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Flame,
  Search,
  PlusSquare,
  User,
} from "lucide-react";

export default function BottomNavbar() {
  const pathname = usePathname();

  const items = [
    { href: "/", icon: Home },
    { href: "/trending", icon: Flame },
    { href: "/search", icon: Search },
    { href: "/create", icon: PlusSquare },
    { href: "/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur border-t border-white/10">
      <div className="flex justify-around items-center h-16">
        {items.map(({ href, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center"
            >
              <Icon
                className={`w-6 h-6 transition ${
                  active
                    ? "text-white"
                    : "text-white/40"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}