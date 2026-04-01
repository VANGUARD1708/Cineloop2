export interface AppNotification {
  id: string;
  type:
    | "like"
    | "comment"
    | "follow"
    | "episode"
    | "system";
  message: string;
  read: boolean;
  createdAt: string;
  entityId?: string;
}

export async function fetchNotifications() {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("failed");
  return res.json();
}

export async function markNotificationRead(id: string) {
  await fetch(`/api/notifications/${id}/read`, {
    method: "POST",
  });
}

export async function markAllRead() {
  await fetch(`/api/notifications/read-all`, {
    method: "POST",
  });
}