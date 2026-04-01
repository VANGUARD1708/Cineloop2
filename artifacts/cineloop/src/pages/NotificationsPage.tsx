import useNotifications from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const { items, markRead } = useNotifications();

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-lg mb-4">
        Notifications
      </h1>

      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`p-4 rounded-lg border border-white/10 ${
              !n.read
                ? "bg-white/5"
                : "opacity-70"
            }`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}