import { pgTable, text, serial, integer, timestamp, boolean, real, uniqueIndex } from "drizzle-orm/pg-core";

export const watchHistoryTable = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaType: text("media_type").notNull(),
  mediaId: text("media_id").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  progressPct: real("progress_pct").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  watchTimeSeconds: integer("watch_time_seconds").notNull().default(0),
  lastWatchedAt: timestamp("last_watched_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("watch_history_user_media_idx").on(t.userId, t.mediaType, t.mediaId),
]);

export type WatchHistory = typeof watchHistoryTable.$inferSelect;
export type InsertWatchHistory = typeof watchHistoryTable.$inferInsert;
