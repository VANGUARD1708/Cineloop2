import { Router, type IRouter } from "express";

const router: IRouter = Router();

const notifications = [
  {
    id: "n1",
    type: "episode",
    message: "New episode of The Signal is now available",
    read: false,
    createdAt: new Date(
      Date.now() - 1000 * 60 * 15
    ).toISOString(),
    entityId: "1",
  },
  {
    id: "n2",
    type: "vote",
    message:
      "Vote results revealed: 58% chose Follow Zara",
    read: false,
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60
    ).toISOString(),
    entityId: "1",
  },
  {
    id: "n3",
    type: "like",
    message:
      "Your vote on The Signal earned you +15 XP",
    read: true,
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 3
    ).toISOString(),
  },
  {
    id: "n4",
    type: "system",
    message:
      "Your 12-day streak is on fire! Keep it going",
    read: true,
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24
    ).toISOString(),
  },
  {
    id: "n5",
    type: "episode",
    message:
      "Dark Frequency Episode 2 drops tomorrow",
    read: false,
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 26
    ).toISOString(),
    entityId: "3",
  },
];

/* GET notifications */
router.get("/notifications", (_req, res) => {
  res.json(notifications);
});

/* mark single as read */
router.post("/notifications/:id/read", (req, res) => {
  const { id } = req.params;

  const n = notifications.find(
    (n) => n.id === id
  );

  if (n) n.read = true;

  res.json({ success: true });
});

/* mark all as read */
router.post(
  "/notifications/read-all",
  (_req, res) => {
    notifications.forEach((n) => (n.read = true));
    res.json({ success: true });
  }
);

export default router;