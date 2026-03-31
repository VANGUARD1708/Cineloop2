import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { filmsTable } from "./films";

export const episodesTable = pgTable("episodes", {
  id: serial("id").primaryKey(),
  filmId: integer("film_id").notNull().references(() => filmsTable.id),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(45),
  isLocked: boolean("is_locked").notNull().default(false),
  unlockCondition: text("unlock_condition"),
  likes: integer("likes").notNull().default(0),
  cliffhangerText: text("cliffhanger_text"),
  hasActivePoll: boolean("has_active_poll").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEpisodeSchema = createInsertSchema(episodesTable).omit({ id: true, createdAt: true });
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type Episode = typeof episodesTable.$inferSelect;
