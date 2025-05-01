import {
  pgTable,
  text,
  varchar,
  serial,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  bio: text("bio"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profiles for career data
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  resumeText: text("resume_text"),
  lastScan: timestamp("last_scan"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vector storage for embeddings
export const vectors = pgTable("vectors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  pineconeId: varchar("pinecone_id").notNull(),
  vectorType: varchar("vector_type").notNull(), // 'resume', 'skill', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Generate schemas for insert operations
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertProfileSchema = createInsertSchema(profiles).pick({
  userId: true,
  resumeText: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export const insertVectorSchema = createInsertSchema(vectors).pick({
  userId: true,
  pineconeId: true,
  vectorType: true,
});
export type InsertVector = z.infer<typeof insertVectorSchema>;
export type Vector = typeof vectors.$inferSelect;
