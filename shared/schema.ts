import { pgTable, text, serial, integer, json, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Store predefined skills for common roles
export const roleSkills = pgTable("role_skills", {
  id: serial("id").primaryKey(),
  roleName: text("role_name").notNull(),
  skillName: text("skill_name").notNull(),
});

export const insertRoleSkillSchema = createInsertSchema(roleSkills).pick({
  roleName: true,
  skillName: true,
});

export type InsertRoleSkill = z.infer<typeof insertRoleSkillSchema>;
export type RoleSkill = typeof roleSkills.$inferSelect;

// Store career transitions
export const transitions = pgTable("transitions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  currentRole: text("current_role").notNull(),
  targetRole: text("target_role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isComplete: boolean("is_complete").default(false).notNull(),
});

export const insertTransitionSchema = createInsertSchema(transitions).pick({
  userId: true,
  currentRole: true,
  targetRole: true,
});

export type InsertTransition = z.infer<typeof insertTransitionSchema>;
export type Transition = typeof transitions.$inferSelect;

// Store scraped data from forums
export const scrapedData = pgTable("scraped_data", {
  id: serial("id").primaryKey(),
  transitionId: integer("transition_id").notNull(),
  source: text("source").notNull(), // e.g., "reddit", "quora"
  content: text("content").notNull(),
  url: text("url"),
  postDate: text("post_date"), // Date when the content was originally published
  skillsExtracted: json("skills_extracted").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScrapedDataSchema = createInsertSchema(scrapedData).pick({
  transitionId: true,
  source: true,
  content: true,
  url: true,
  postDate: true,
  skillsExtracted: true,
});

export type InsertScrapedData = z.infer<typeof insertScrapedDataSchema>;
export type ScrapedData = typeof scrapedData.$inferSelect;

// Store skill gap analysis
export const skillGaps = pgTable("skill_gaps", {
  id: serial("id").primaryKey(),
  transitionId: integer("transition_id").notNull(),
  skillName: text("skill_name").notNull(),
  gapLevel: text("gap_level").notNull(), // "Low", "Medium", "High"
  confidenceScore: integer("confidence_score"), // 0-100
  mentionCount: integer("mention_count"), // How many times mentioned in sources
});

export const insertSkillGapSchema = createInsertSchema(skillGaps).pick({
  transitionId: true,
  skillName: true,
  gapLevel: true,
  confidenceScore: true,
  mentionCount: true,
});

export type InsertSkillGap = z.infer<typeof insertSkillGapSchema>;
export type SkillGap = typeof skillGaps.$inferSelect;

// Store development plans
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  transitionId: integer("transition_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlanSchema = createInsertSchema(plans).pick({
  transitionId: true,
});

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

// Store milestones for development plans
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull(), // "Low", "Medium", "High"
  durationWeeks: integer("duration_weeks").notNull(),
  order: integer("order").notNull(),
  progress: integer("progress").default(0).notNull(), // 0-100
});

export const insertMilestoneSchema = createInsertSchema(milestones).pick({
  planId: true,
  title: true,
  description: true,
  priority: true,
  durationWeeks: true,
  order: true,
  progress: true,
});

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

// Store resources for milestones
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(), // "Book", "Video", "Course", "GitHub"
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  milestoneId: true,
  title: true,
  url: true,
  type: true,
});

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

// Store transition stories/insights
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  transitionId: integer("transition_id").notNull(),
  type: text("type").notNull(), // "observation", "challenge", "story"
  content: text("content").notNull(),
  source: text("source"),
  date: text("date"),
  experienceYears: integer("experience_years"),
  url: text("url"),
});

export const insertInsightSchema = createInsertSchema(insights).pick({
  transitionId: true,
  type: true,
  content: true,
  source: true,
  date: true,
  experienceYears: true,
  url: true,
});

export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;
