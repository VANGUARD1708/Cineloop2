import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { episodesTable } from "./episodes";

export const votePollsTable = pgTable("vote_polls", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id").notNull().references(() => episodesTable.id),
  filmTitle: text("film_title").notNull(),
  question: text("question").notNull(),
  totalVotes: integer("total_votes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voteOptionsTable = pgTable("vote_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => votePollsTable.id),
  text: text("text").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
});

export const insertVotePollSchema = createInsertSchema(votePollsTable).omit({ id: true, createdAt: true, totalVotes: true });
export type InsertVotePoll = z.infer<typeof insertVotePollSchema>;
export type VotePoll = typeof votePollsTable.$inferSelect;
export type VoteOption = typeof voteOptionsTable.$inferSelect;
