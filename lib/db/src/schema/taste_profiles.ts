import { pgTable, integer, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const tasteProfilesTable = pgTable("taste_profiles", {
  userId: integer("user_id").primaryKey(),
  topGenres: jsonb("top_genres").$type<string[]>().notNull().default([]),
  topDecades: jsonb("top_decades").$type<string[]>().notNull().default([]),
  themes: jsonb("themes").$type<string[]>().notNull().default([]),
  vibe: text("vibe").notNull().default(""),
  summary: text("summary").notNull().default(""),
  historyCount: integer("history_count").notNull().default(0),
  lastRefreshedAt: timestamp("last_refreshed_at").notNull().defaultNow(),
});

export type TasteProfile = typeof tasteProfilesTable.$inferSelect;
export type InsertTasteProfile = typeof tasteProfilesTable.$inferInsert;

export const recommendationsCacheTable = pgTable(
  "recommendations_cache",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id").notNull(),
    cacheKey: text("cache_key").notNull(),
    payload: jsonb("payload").notNull(),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [uniqueIndex("rec_cache_user_key_idx").on(t.userId, t.cacheKey)],
);

export type RecommendationsCache = typeof recommendationsCacheTable.$inferSelect;
export type InsertRecommendationsCache = typeof recommendationsCacheTable.$inferInsert;
