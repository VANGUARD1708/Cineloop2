import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { filmsTable } from "./films";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filmId: integer("film_id").notNull().references(() => filmsTable.id),
  filmTitle: text("film_title").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  bio: text("bio").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  latestUpdate: text("latest_update").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const characterFollowsTable = pgTable("character_follows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  characterId: integer("character_id").notNull().references(() => charactersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, createdAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
