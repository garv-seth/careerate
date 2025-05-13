import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  date,
  primaryKey,
  decimal,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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

// User table for Replit Auth
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

// User profiles with additional data
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

// Vector storage for AI embeddings
export const vectors = pgTable("vectors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type").notNull(), // resume, skill, experience, etc.
  sourceId: varchar("source_id"), // ID of the source (e.g., skill ID)
  content: text("content").notNull(), // Original text
  embedding: text("embedding"), // Vector embedding as JSON string
  metadata: jsonb("metadata"), // Additional metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Define schemas and types

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertProfileSchema = createInsertSchema(profiles).pick({
  userId: true,
  resumeText: true,
  lastScan: true,
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
  sourceType: true,
  sourceId: true,
  content: true,
  embedding: true,
  metadata: true,
});
export type InsertVector = z.infer<typeof insertVectorSchema>;
export type Vector = typeof vectors.$inferSelect;

// Premium feature 1: Career Trajectory Mapping
export const careerPaths = pgTable("career_paths", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  targetRole: varchar("target_role").notNull(),
  timeframe: varchar("timeframe"), // e.g., "3 years", "5 years"
  confidenceScore: integer("confidence_score"), // AI-generated confidence 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const careerMilestones = pgTable("career_milestones", {
  id: serial("id").primaryKey(),
  careerPathId: integer("career_path_id").notNull().references(() => careerPaths.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  timeframe: varchar("timeframe"), // e.g., "6 months", "1 year"
  isCompleted: boolean("is_completed").default(false),
  order: integer("order").notNull(), // For ordering in UI
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alternativePaths = pgTable("alternative_paths", {
  id: serial("id").primaryKey(),
  careerPathId: integer("career_path_id").notNull().references(() => careerPaths.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  probabilityScore: integer("probability_score"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

// Premium feature 2: Executive Network Access
export const networkEvents = pgTable("network_events", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  location: varchar("location"),
  virtualLink: varchar("virtual_link"),
  industry: varchar("industry").notNull(),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => networkEvents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  registrationDate: timestamp("registration_date").defaultNow(),
  status: varchar("status").notNull().default("confirmed"), // confirmed, canceled, waitlisted
});

export const mentorships = pgTable("mentorships", {
  id: serial("id").primaryKey(),
  mentorName: varchar("mentor_name").notNull(),
  mentorTitle: varchar("mentor_title").notNull(),
  companyName: varchar("company_name"),
  industry: varchar("industry").notNull(),
  expertise: text("expertise").array(),
  availabilityStart: date("availability_start"),
  availabilityEnd: date("availability_end"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mentorshipApplications = pgTable("mentorship_applications", {
  id: serial("id").primaryKey(),
  mentorshipId: integer("mentorship_id").notNull().references(() => mentorships.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  applicationDate: timestamp("application_date").defaultNow(),
  goalsDescription: text("goals_description"),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
});

// Premium feature 3: Skills Gap Accelerator
export const skillsLibrary = pgTable("skills_library", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // technical, soft, domain
  description: text("description"),
  automationRisk: integer("automation_risk"), // 0-100
  growthRate: integer("growth_rate"), // -100 to 100 (percentage)
  averageSalaryImpact: integer("average_salary_impact"), // 0-100
});

export const userSkills = pgTable("user_skills", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillId: integer("skill_id").notNull().references(() => skillsLibrary.id, { onDelete: "cascade" }),
  currentLevel: integer("current_level").notNull(), // 1-5
  targetLevel: integer("target_level"), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const learningResources = pgTable("learning_resources", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  resourceType: varchar("resource_type").notNull(), // course, book, video, article
  provider: varchar("provider"),
  url: varchar("url"),
  duration: varchar("duration"), // e.g., "2 hours", "4 weeks"
  difficulty: varchar("difficulty"), // beginner, intermediate, advanced
  costType: varchar("cost_type").notNull(), // free, paid, subscription
  cost: integer("cost"), // cost in cents if paid
  createdAt: timestamp("created_at").defaultNow(),
});

export const resourceSkills = pgTable("resource_skills", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").notNull().references(() => learningResources.id, { onDelete: "cascade" }),
  skillId: integer("skill_id").notNull().references(() => skillsLibrary.id, { onDelete: "cascade" }),
  relevanceScore: integer("relevance_score"), // 0-100
});

export const userLearningPaths = pgTable("user_learning_paths", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  targetCompletionDate: date("target_completion_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const learningPathResources = pgTable("learning_path_resources", {
  id: serial("id").primaryKey(),
  learningPathId: integer("learning_path_id").notNull().references(() => userLearningPaths.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id").notNull().references(() => learningResources.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedDate: timestamp("completed_date"),
});

// Insert schemas for DB operations

export const insertCareerPathSchema = createInsertSchema(careerPaths).pick({
  userId: true,
  title: true,
  description: true,
  targetRole: true,
  timeframe: true,
  confidenceScore: true,
});
export type InsertCareerPath = z.infer<typeof insertCareerPathSchema>;
export type CareerPath = typeof careerPaths.$inferSelect;

export const insertCareerMilestoneSchema = createInsertSchema(careerMilestones).pick({
  careerPathId: true,
  title: true,
  description: true,
  timeframe: true,
  isCompleted: true,
  order: true,
});
export type InsertCareerMilestone = z.infer<typeof insertCareerMilestoneSchema>;
export type CareerMilestone = typeof careerMilestones.$inferSelect;

export const insertNetworkEventSchema = createInsertSchema(networkEvents).pick({
  title: true,
  description: true,
  eventDate: true,
  location: true,
  virtualLink: true,
  industry: true,
  isFeatured: true,
});
export type InsertNetworkEvent = z.infer<typeof insertNetworkEventSchema>;
export type NetworkEvent = typeof networkEvents.$inferSelect;

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).pick({
  eventId: true,
  userId: true,
  status: true,
});
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;

export const insertUserSkillSchema = createInsertSchema(userSkills).pick({
  userId: true,
  skillId: true,
  currentLevel: true,
  targetLevel: true,
});
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type UserSkill = typeof userSkills.$inferSelect;

export const insertLearningPathSchema = createInsertSchema(userLearningPaths).pick({
  userId: true,
  title: true,
  description: true,
  targetCompletionDate: true,
});
export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type LearningPath = typeof userLearningPaths.$inferSelect;

// AI Replacement Anxiety Feature Tables
export const aiVulnerabilityAssessments = pgTable("ai_vulnerability_assessments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentJobTitle: varchar("current_job_title").notNull(),
  currentIndustry: varchar("current_industry").notNull(),
  overallRiskScore: integer("overall_risk_score").notNull(), // 0-100
  automationRisk: integer("automation_risk").notNull(), // 0-100
  displacementTimeframe: varchar("displacement_timeframe"), // "1-2 years", "3-5 years", etc.
  riskFactors: jsonb("risk_factors"), // Array of specific risk factors
  safeguardingStrategies: jsonb("safeguarding_strategies"), // Recommended strategies to mitigate risk
  analysisDate: timestamp("analysis_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const careerMigrationPaths = pgTable("career_migration_paths", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceRole: varchar("source_role").notNull(),
  targetRole: varchar("target_role").notNull(),
  viabilityScore: integer("viability_score").notNull(), // 0-100
  skillsTransferability: integer("skills_transferability").notNull(), // 0-100
  timeToTransition: varchar("time_to_transition"), // "6-12 months", "1-2 years", etc.
  potentialSalaryImpact: integer("potential_salary_impact"), // in percentage, can be negative
  requiredReskilling: jsonb("required_reskilling"), // Array of skills to learn
  recommendedSteps: jsonb("recommended_steps"), // Step-by-step transition plan
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Career Simulation Feature Tables
export const careerSimulations = pgTable("career_simulations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  simulationTitle: varchar("simulation_title").notNull(),
  description: text("description"),
  startingRole: varchar("starting_role").notNull(),
  startingSalary: integer("starting_salary"),
  timeframeYears: integer("timeframe_years").notNull(),
  industryContext: varchar("industry_context").notNull(),
  economicAssumptions: jsonb("economic_assumptions"),
  simulationStatus: varchar("simulation_status").notNull().default("in_progress"), // in_progress, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const simulationTimepoints = pgTable("simulation_timepoints", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => careerSimulations.id, { onDelete: "cascade" }),
  yearIndex: integer("year_index").notNull(), // 0, 1, 2, etc. (year from start of simulation)
  role: varchar("role").notNull(),
  salary: integer("salary"),
  skills: jsonb("skills"), // Array of skills at this point
  opportunities: jsonb("opportunities"), // Career opportunities at this point
  challenges: jsonb("challenges"), // Career challenges at this point
  industryEvents: jsonb("industry_events"), // Simulated industry events affecting career
  createdAt: timestamp("created_at").defaultNow(),
});

// Job Market Data Feature Tables
export const jobMarketInsights = pgTable("job_market_insights", {
  id: serial("id").primaryKey(),
  industry: varchar("industry").notNull(),
  role: varchar("role").notNull(),
  region: varchar("region"), // optional geographic specificity
  demandTrend: integer("demand_trend"), // -100 to 100, positive means growing
  averageSalary: integer("average_salary"),
  salaryTrend: integer("salary_trend"), // -100 to 100, percentage change
  hiringVolume: integer("hiring_volume"),
  layoffRisk: integer("layoff_risk"), // 0-100
  remoteWorkPrevalence: integer("remote_work_prevalence"), // 0-100, percentage
  topSkillsRequired: jsonb("top_skills_required"),
  emergingSkills: jsonb("emerging_skills"),
  insightDate: timestamp("insight_date").defaultNow(),
  confidenceScore: integer("confidence_score"), // 0-100
  dataSource: varchar("data_source"), // where the data came from
  isPremium: boolean("is_premium").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companyInsights = pgTable("company_insights", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name").notNull(),
  industry: varchar("industry").notNull(),
  hiringStatus: varchar("hiring_status"), // "actively_hiring", "hiring_freeze", "downsizing"
  growthTrajectory: integer("growth_trajectory"), // -100 to 100
  avgInterviewDifficulty: integer("avg_interview_difficulty"), // 1-10
  compensationRating: integer("compensation_rating"), // 1-10
  workLifeBalanceRating: integer("work_life_balance_rating"), // 1-10
  recruitingInsights: jsonb("recruiting_insights"),
  insightDate: timestamp("insight_date").defaultNow(),
  confidenceScore: integer("confidence_score"), // 0-100
  dataSource: varchar("data_source"),
  isPremium: boolean("is_premium").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Salary Negotiation Feature Tables
export const salaryNegotiations = pgTable("salary_negotiations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company"),
  industry: varchar("industry").notNull(),
  initialOffer: integer("initial_offer"),
  targetSalary: integer("target_salary"),
  location: varchar("location"),
  experienceYears: integer("experience_years"),
  stage: varchar("stage").notNull().default("preparation"), // preparation, in_progress, completed
  recommendedStrategy: jsonb("recommended_strategy"),
  counterofferSuggestions: jsonb("counteroffer_suggestions"),
  talkingPoints: jsonb("talking_points"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractReviews = pgTable("contract_reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contractType: varchar("contract_type").notNull(), // "full_time", "contract", "part_time"
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company"),
  baseSalary: integer("base_salary"),
  bonusStructure: jsonb("bonus_structure"),
  benefitsValue: integer("benefits_value"),
  equityDetails: jsonb("equity_details"),
  redFlags: jsonb("red_flags"),
  improvedTermsSuggestions: jsonb("improved_terms_suggestions"),
  analysisDate: timestamp("analysis_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for new tables

export const insertAiVulnerabilityAssessmentSchema = createInsertSchema(aiVulnerabilityAssessments).pick({
  userId: true,
  currentJobTitle: true,
  currentIndustry: true,
  overallRiskScore: true,
  automationRisk: true,
  displacementTimeframe: true,
  riskFactors: true,
  safeguardingStrategies: true,
});
export type InsertAiVulnerabilityAssessment = z.infer<typeof insertAiVulnerabilityAssessmentSchema>;
export type AiVulnerabilityAssessment = typeof aiVulnerabilityAssessments.$inferSelect;

export const insertCareerMigrationPathSchema = createInsertSchema(careerMigrationPaths).pick({
  userId: true,
  sourceRole: true,
  targetRole: true,
  viabilityScore: true,
  skillsTransferability: true,
  timeToTransition: true,
  potentialSalaryImpact: true,
  requiredReskilling: true,
  recommendedSteps: true,
});
export type InsertCareerMigrationPath = z.infer<typeof insertCareerMigrationPathSchema>;
export type CareerMigrationPath = typeof careerMigrationPaths.$inferSelect;

export const insertCareerSimulationSchema = createInsertSchema(careerSimulations).pick({
  userId: true,
  simulationTitle: true,
  description: true,
  startingRole: true,
  startingSalary: true,
  timeframeYears: true,
  industryContext: true,
  economicAssumptions: true,
  simulationStatus: true,
});
export type InsertCareerSimulation = z.infer<typeof insertCareerSimulationSchema>;
export type CareerSimulation = typeof careerSimulations.$inferSelect;

export const insertSimulationTimepointSchema = createInsertSchema(simulationTimepoints).pick({
  simulationId: true,
  yearIndex: true,
  role: true,
  salary: true,
  skills: true,
  opportunities: true,
  challenges: true,
  industryEvents: true,
});
export type InsertSimulationTimepoint = z.infer<typeof insertSimulationTimepointSchema>;
export type SimulationTimepoint = typeof simulationTimepoints.$inferSelect;

export const insertSalaryNegotiationSchema = createInsertSchema(salaryNegotiations).pick({
  userId: true,
  jobTitle: true,
  company: true,
  industry: true,
  initialOffer: true,
  targetSalary: true,
  location: true,
  experienceYears: true,
  stage: true,
  recommendedStrategy: true,
  counterofferSuggestions: true,
  talkingPoints: true,
});
export type InsertSalaryNegotiation = z.infer<typeof insertSalaryNegotiationSchema>;
export type SalaryNegotiation = typeof salaryNegotiations.$inferSelect;

export const insertContractReviewSchema = createInsertSchema(contractReviews).pick({
  userId: true,
  contractType: true,
  jobTitle: true,
  company: true,
  baseSalary: true,
  bonusStructure: true,
  benefitsValue: true,
  equityDetails: true,
  redFlags: true,
  improvedTermsSuggestions: true,
});
export type InsertContractReview = z.infer<typeof insertContractReviewSchema>;
export type ContractReview = typeof contractReviews.$inferSelect;