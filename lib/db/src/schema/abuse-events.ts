import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const abuseEventsTable = pgTable(
  "abuse_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    ip: text("ip"),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull().default("low"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("abuse_events_user_idx").on(t.userId),
    createdIdx: index("abuse_events_created_idx").on(t.createdAt),
  }),
);

export type AbuseEvent = typeof abuseEventsTable.$inferSelect;
