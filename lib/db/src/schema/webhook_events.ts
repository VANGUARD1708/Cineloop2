import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const webhookEventsTable = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type"),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("webhook_events_provider_event_idx").on(t.provider, t.eventId),
]);

export type WebhookEvent = typeof webhookEventsTable.$inferSelect;
