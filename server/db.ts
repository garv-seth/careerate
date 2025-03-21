import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

// Create a postgres client
const client = postgres(process.env.DATABASE_URL);

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
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
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
          experience_years INTEGER
        )
      `;
      
      console.log("Database tables created successfully");
    } else {
      console.log("Database tables already exist");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}
