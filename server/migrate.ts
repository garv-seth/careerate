import { db } from "./db";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";

/**
 * Run database migrations to ensure all tables are properly created
 * This will create tables if they don't exist and update columns to match the schema
 */
async function runMigrations() {
  console.log("Running database migrations...");
  
  try {
    // Check if profiles table exists
    try {
      await sql`SELECT 1 FROM profiles LIMIT 1`.execute(db);
      console.log("Profiles table exists");
    } catch (error) {
      console.log("Creating profiles table...");
      await sql`
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
      `.execute(db);
      console.log("Profiles table created");
    }

    // Check if user_skills table exists
    try {
      await sql`SELECT 1 FROM user_skills LIMIT 1`.execute(db);
      console.log("User skills table exists");
    } catch (error) {
      console.log("Creating user_skills table...");
      await sql`
        CREATE TABLE IF NOT EXISTS user_skills (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          skill_name TEXT NOT NULL,
          proficiency_level TEXT,
          years_of_experience INTEGER,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `.execute(db);
      console.log("User skills table created");
    }

    // Ensure users table has all required columns
    console.log("Updating users table...");
    await sql`
      ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS email TEXT, 
        ADD COLUMN IF NOT EXISTS current_role TEXT, 
        ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `.execute(db);

    // Check for password_reset_tokens table
    try {
      await sql`SELECT 1 FROM password_reset_tokens LIMIT 1`.execute(db);
      console.log("Password reset tokens table exists");
    } catch (error) {
      console.log("Creating password_reset_tokens table...");
      await sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `.execute(db);
      console.log("Password reset tokens table created");
    }

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

export default runMigrations;