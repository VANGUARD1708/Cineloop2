import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const mediaReactionsTable = pgTable(
  "media_reactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    mediaType: text("media_type").notNull(),
    mediaId: text("media_id").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("media_reactions_unique_idx").on(t.userId, t.mediaType, t.mediaId, t.kind),
    index("media_reactions_media_kind_idx").on(t.mediaType, t.mediaId, t.kind),
  ],
);

export type MediaReaction = typeof mediaReactionsTable.$inferSelect;
export type InsertMediaReaction = typeof mediaReactionsTable.$inferInsert;

export const mediaCommentsTable = pgTable(
  "media_comments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    mediaType: text("media_type").notNull(),
    mediaId: text("media_id").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("media_comments_media_idx").on(t.mediaType, t.mediaId, t.createdAt)],
);

export type MediaComment = typeof mediaCommentsTable.$inferSelect;
export type InsertMediaComment = typeof mediaCommentsTable.$inferInsert;
