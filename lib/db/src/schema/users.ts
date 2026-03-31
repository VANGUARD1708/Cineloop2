import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(100),
  streakDays: integer("streak_days").notNull().default(0),
  totalVotes: integer("total_votes").notNull().default(0),
  totalWatched: integer("total_watched").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  lastActiveDate: timestamp("last_active_date"),
  longestStreak: integer("longest_streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userBadgesTable = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  badge: text("badge").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const xpEventsTable = pgTable("xp_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  action: text("action").notNull(),
  xpAmount: integer("xp_amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type XpEvent = typeof xpEventsTable.$inferSelect;
