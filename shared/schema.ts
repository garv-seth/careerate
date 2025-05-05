import {
  pgTable,
  text,
  varchar,
  serial,
  integer,
  timestamp,
  jsonb,
  index,
  boolean,
  primaryKey,
  date,
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

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password"), // For local auth; in production should be hashed
  email: varchar("email").unique(),
  firstName: varchar("first_name"), // First name from Replit OAuth
  lastName: varchar("last_name"), // Last name from Replit OAuth
  name: varchar("name"), // Combined name field
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
  careerStage: varchar("career_stage"),
  industryFocus: text("industry_focus").array(),
  careerGoals: text("career_goals"),
  preferredLearningStyle: varchar("preferred_learning_style"),
  timeAvailability: varchar("time_availability"),
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
export type UpsertUser = {
  id: string;
  username: string;
  password?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};
export type User = typeof users.$inferSelect;

export const insertProfileSchema = createInsertSchema(profiles).pick({
  userId: true,
  resumeText: true,
  careerStage: true,
  industryFocus: true,
  careerGoals: true,
  preferredLearningStyle: true,
  timeAvailability: true,
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

// ----- PREMIUM FEATURES MODELS -----

// FEATURE 1: Career Trajectory Mapping
export const careerPaths = pgTable("career_paths", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  targetRole: varchar("target_role").notNull(),
  targetTimeframe: integer("target_timeframe").notNull(), // in months
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const careerMilestones = pgTable("career_milestones", {
  id: serial("id").primaryKey(),
  careerPathId: integer("career_path_id").notNull().references(() => careerPaths.id),
  title: varchar("title").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  isCompleted: boolean("is_completed").default(false),
  completedDate: date("completed_date"),
  milestonePriority: integer("milestone_priority").default(0), // 0=normal, 1=high, 2=critical
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alternativePaths = pgTable("alternative_paths", {
  id: serial("id").primaryKey(),
  careerPathId: integer("career_path_id").notNull().references(() => careerPaths.id),
  name: varchar("name").notNull(),
  description: text("description"),
  probabilityScore: integer("probability_score").default(50), // 0-100
  potentialUpsides: text("potential_upsides"),
  potentialDownsides: text("potential_downsides"),
  createdAt: timestamp("created_at").defaultNow(),
});

// FEATURE 2: Executive Network Access
export const networkEvents = pgTable("network_events", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  eventDate: timestamp("event_date").notNull(),
  eventType: varchar("event_type").notNull(), // webinar, roundtable, AMA, etc.
  speakerInfo: jsonb("speaker_info").notNull(),
  maxAttendees: integer("max_attendees").notNull(),
  registrationOpenDate: timestamp("registration_open_date"),
  registrationCloseDate: timestamp("registration_close_date"),
  eventLink: varchar("event_link"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => networkEvents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  registrationDate: timestamp("registration_date").defaultNow(),
  attended: boolean("attended").default(false),
  feedback: text("feedback"),
  notes: text("notes"),
});

export const mentorships = pgTable("mentorships", {
  id: serial("id").primaryKey(),
  mentorName: varchar("mentor_name").notNull(),
  mentorTitle: varchar("mentor_title").notNull(),
  mentorCompany: varchar("mentor_company").notNull(),
  mentorBio: text("mentor_bio").notNull(),
  expertise: jsonb("expertise").notNull(), // array of expertise areas
  availableSlots: integer("available_slots").default(3),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mentorshipApplications = pgTable("mentorship_applications", {
  id: serial("id").primaryKey(),
  mentorshipId: integer("mentorship_id").notNull().references(() => mentorships.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  applicationDate: timestamp("application_date").defaultNow(),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  goalsDescription: text("goals_description").notNull(),
  approvedDate: timestamp("approved_date"),
  rejectionReason: text("rejection_reason"),
});

// FEATURE 3: Skills Gap Accelerator
export const skillsLibrary = pgTable("skills_library", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  category: varchar("category").notNull(),
  description: text("description"),
  marketDemand: integer("market_demand").default(50), // 0-100
  futureRelevance: integer("future_relevance").default(50), // 0-100
  averageSalaryImpact: integer("avg_salary_impact"), // in dollars
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSkills = pgTable("user_skills", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  currentLevel: integer("current_level").notNull(), // 1-10
  targetLevel: integer("target_level").notNull(), // 1-10
  priority: integer("priority").default(0), // 0=normal, 1=high, 2=critical
  skillId: integer("skill_id").references(() => skillsLibrary.id), // Optional reference to skill library
  startDate: date("start_date"),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const learningResources = pgTable("learning_resources", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  provider: varchar("provider").notNull(),
  resourceType: varchar("resource_type").notNull(), // course, book, certification, etc.
  url: varchar("url").notNull(),
  cost: integer("cost"), // in cents
  duration: integer("duration"), // in minutes
  difficulty: varchar("difficulty").notNull(), // beginner, intermediate, advanced
  rating: integer("rating"), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resourceSkills = pgTable("resource_skills", {
  resourceId: integer("resource_id").notNull().references(() => learningResources.id),
  skillId: integer("skill_id").notNull().references(() => skillsLibrary.id),
  relevanceScore: integer("relevance_score").default(50), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pk: primaryKey(t.resourceId, t.skillId),
}));

export const userLearningPaths = pgTable("user_learning_paths", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  estimatedCompletionTime: integer("estimated_completion_time"), // in minutes
  progress: integer("progress").default(0), // 0-100
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const learningPathResources = pgTable("learning_path_resources", {
  id: serial("id").primaryKey(),
  learningPathId: integer("learning_path_id").notNull().references(() => userLearningPaths.id),
  resourceId: integer("resource_id").notNull().references(() => learningResources.id),
  order: integer("order").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedDate: timestamp("completed_date"),
  userNotes: text("user_notes"),
});

// Generate schemas for insert operations

// Career Trajectory Mapping
export const insertCareerPathSchema = createInsertSchema(careerPaths).pick({
  userId: true,
  name: true,
  description: true,
  targetRole: true,
  targetTimeframe: true,
});
export type InsertCareerPath = z.infer<typeof insertCareerPathSchema>;
export type CareerPath = typeof careerPaths.$inferSelect;

export const insertCareerMilestoneSchema = createInsertSchema(careerMilestones).pick({
  careerPathId: true,
  title: true,
  description: true,
  targetDate: true,
  milestonePriority: true,
});
export type InsertCareerMilestone = z.infer<typeof insertCareerMilestoneSchema>;
export type CareerMilestone = typeof careerMilestones.$inferSelect;

// Executive Network Access
export const insertNetworkEventSchema = createInsertSchema(networkEvents).pick({
  title: true,
  description: true,
  eventDate: true,
  eventType: true,
  speakerInfo: true,
  maxAttendees: true,
  registrationOpenDate: true,
  registrationCloseDate: true,
  eventLink: true,
});
export type InsertNetworkEvent = z.infer<typeof insertNetworkEventSchema>;
export type NetworkEvent = typeof networkEvents.$inferSelect;

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).pick({
  eventId: true,
  userId: true,
  notes: true,
});
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;

// Skills Gap Accelerator
export const insertUserSkillSchema = createInsertSchema(userSkills).pick({
  userId: true,
  name: true,
  currentLevel: true,
  targetLevel: true,
  priority: true,
  skillId: true,
  targetDate: true,
});
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type UserSkill = typeof userSkills.$inferSelect;

export const insertLearningPathSchema = createInsertSchema(userLearningPaths).pick({
  userId: true,
  name: true,
  description: true,
});
export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type LearningPath = typeof userLearningPaths.$inferSelect;
