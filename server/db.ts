import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import runMigrations from "./migrate";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

// Create a postgres client
export const client = postgres(process.env.DATABASE_URL);

// Create drizzle database instance
export const db = drizzle(client);

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    console.log("Initializing database tables...");
    
    // Create tables based on schema (uses a raw query to check if a table exists)
    const checkTableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `;
    
    if (!checkTableExists[0].exists) {
      console.log("Tables don't exist, creating them...");
      
      // Create all the tables defined in schema.ts - one at a time
      await client`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          current_role TEXT,
          profile_completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          verified BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          bio TEXT,
          goals TEXT,
          experience_years INTEGER,
          education TEXT,
          profile_image_url TEXT,
          resume_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS user_skills (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          skill_name TEXT NOT NULL,
          proficiency_level TEXT,
          years_of_experience INTEGER,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS role_skills (
          id SERIAL PRIMARY KEY,
          role_name TEXT NOT NULL,
          skill_name TEXT NOT NULL
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS transitions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          "current_role" TEXT NOT NULL,
          "target_role" TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          is_complete BOOLEAN NOT NULL DEFAULT FALSE
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS scraped_data (
          id SERIAL PRIMARY KEY,
          transition_id INTEGER NOT NULL,
          source TEXT NOT NULL,
          content TEXT NOT NULL,
          url TEXT,
          post_date TEXT,
          skills_extracted JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS skill_gaps (
          id SERIAL PRIMARY KEY,
          transition_id INTEGER NOT NULL,
          skill_name TEXT NOT NULL,
          gap_level TEXT NOT NULL,
          confidence_score INTEGER,
          mention_count INTEGER
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS plans (
          id SERIAL PRIMARY KEY,
          transition_id INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS milestones (
          id SERIAL PRIMARY KEY,
          plan_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT NOT NULL,
          duration_weeks INTEGER NOT NULL,
          "order" INTEGER NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS resources (
          id SERIAL PRIMARY KEY,
          milestone_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          type TEXT NOT NULL
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS insights (
          id SERIAL PRIMARY KEY,
          transition_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          source TEXT,
          date TEXT,
          experience_years INTEGER,
          url TEXT
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS companies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS company_roles (
          id TEXT NOT NULL,
          company_id TEXT NOT NULL,
          title TEXT NOT NULL,
          PRIMARY KEY (company_id, id)
        )
      `;
      
      await client`
        CREATE TABLE IF NOT EXISTS role_levels (
          id TEXT NOT NULL,
          company_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          name TEXT NOT NULL,
          PRIMARY KEY (company_id, role_id, id)
        )
      `;
      
      console.log("Database tables created successfully");
    } else {
      console.log("Database tables already exist");
      
      // Run migrations to ensure schema consistency
      await runMigrations();
    }
    
    // Seed predefined role skills
    await seedRoleSkills();
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Seed predefined role skills
async function seedRoleSkills() {
  try {
    // Check if role skills table has data
    const checkSkillsExist = await client`
      SELECT COUNT(*) FROM role_skills;
    `;
    
    if (parseInt(checkSkillsExist[0].count) === 0) {
      console.log("Seeding predefined role skills...");
      
      // Software Engineer skills
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'JavaScript')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'TypeScript')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'React')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'Node.js')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'Git')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'SQL')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'Problem Solving')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'Communication')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'Data Structures')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Software Engineer', 'Algorithms')`;
      
      // Data Scientist skills
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'Python')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'R')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'SQL')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'Statistics')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'Machine Learning')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'Data Visualization')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'Big Data')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'Data Wrangling')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Data Scientist', 'Communication')`;
      
      // Product Manager skills
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Product Strategy')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'User Experience')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Market Research')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Data Analysis')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Communication')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Leadership')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Roadmapping')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Stakeholder Management')`;
      await client`INSERT INTO role_skills (role_name, skill_name) VALUES ('Product Manager', 'Agile Methodologies')`;
      
      console.log("Predefined role skills seeded");
    } else {
      console.log("Predefined role skills already exist");
    }
  } catch (error) {
    console.error("Error seeding role skills:", error);
  }
}
