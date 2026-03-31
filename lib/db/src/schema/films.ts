import { pgTable, text, serial, boolean, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filmsTable = pgTable("films", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  genre: text("genre").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  creatorName: text("creator_name").notNull(),
  creatorAvatar: text("creator_avatar").notNull(),
  totalEpisodes: integer("total_episodes").notNull().default(1),
  episodesReleased: integer("episodes_released").notNull().default(1),
  totalLikes: integer("total_likes").notNull().default(0),
  totalVotes: integer("total_votes").notNull().default(0),
  isSerialised: boolean("is_serialised").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFilmSchema = createInsertSchema(filmsTable).omit({ id: true, createdAt: true, totalLikes: true, totalVotes: true });
export type InsertFilm = z.infer<typeof insertFilmSchema>;
export type Film = typeof filmsTable.$inferSelect;
