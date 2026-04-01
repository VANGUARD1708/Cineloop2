import { useState } from "react";
import { Bell } from "lucide-react";
import useNotifications from "@/hooks/useNotifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unread, markRead, readAll } =
    useNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="w-6 h-6 text-white" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-1 rounded-full">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-black border border-white/10 rounded-lg shadow-lg">
          <div className="p-3 border-b border-white/10 flex justify-between">
            <span className="text-white text-sm">
              Notifications
            </span>
            <button
              onClick={readAll}
              className="text-xs text-gray-400"
            >
              Mark all
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`p-3 border-b border-white/5 cursor-pointer ${
                  !n.read
                    ? "bg-white/5"
                    : "opacity-70"
                }`}
              >
                <p className="text-sm text-white">
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}