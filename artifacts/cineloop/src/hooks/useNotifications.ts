import { useEffect, useState } from "react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
  AppNotification,
} from "@/lib/notifications";

export default function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchNotifications();
      setItems(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  };

  const readAll = async () => {
    await markAllRead();
    setItems((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  return {
    items,
    unread,
    loading,
    markRead,
    readAll,
  };
}