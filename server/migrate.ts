import { client } from "./db";

/**
 * Utilities to check if columns exist
 */
async function checkIfColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await client`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      AND column_name = ${columnName}
    )
  `;
  
  return result[0].exists;
}

/**
 * Run database migrations to ensure all tables are properly created
 * This will create tables if they don't exist and update columns to match the schema
 */
async function runMigrations() {
  console.log("Running database migrations...");
  
  try {
    // Check if profiles table exists
    try {
      await client`SELECT 1 FROM profiles LIMIT 1`;
      console.log("Profiles table exists");
      
      // Ensure profiles table has all required columns
      const hasUpdatedAt = await checkIfColumnExists('profiles', 'updated_at');
      if (!hasUpdatedAt) {
        await client`ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`;
        console.log("Added updated_at column to profiles table");
      }
      
      const hasProfileImageUrl = await checkIfColumnExists('profiles', 'profile_image_url');
      if (!hasProfileImageUrl) {
        await client`ALTER TABLE profiles ADD COLUMN profile_image_url TEXT`;
        console.log("Added profile_image_url column to profiles table");
      }
    } catch (error) {
      console.log("Creating profiles table...");
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
      console.log("Profiles table created");
    }

    // Check if user_skills table exists
    try {
      await client`SELECT 1 FROM user_skills LIMIT 1`;
      console.log("User skills table exists");
      
      // Ensure user_skills table has all required columns
      const hasVerified = await checkIfColumnExists('user_skills', 'verified');
      if (!hasVerified) {
        await client`ALTER TABLE user_skills ADD COLUMN verified BOOLEAN DEFAULT FALSE`;
        console.log("Added verified column to user_skills table");
      }
    } catch (error) {
      console.log("Creating user_skills table...");
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
      console.log("User skills table created");
    }

    // Ensure users table has all required columns
    console.log("Updating users table...");
    
    // Check for email column (might be username in older schema)
    const hasEmail = await checkIfColumnExists('users', 'email');
    if (!hasEmail) {
      // Check if we have username column to migrate from
      const hasUsername = await checkIfColumnExists('users', 'username');
      if (hasUsername) {
        // Migrate from username to email
        await client`ALTER TABLE users ADD COLUMN email TEXT`;
        await client`UPDATE users SET email = username WHERE email IS NULL`;
        await client`ALTER TABLE users ALTER COLUMN email SET NOT NULL`;
        console.log("Migrated username to email column");
      } else {
        await client`ALTER TABLE users ADD COLUMN email TEXT`;
        console.log("Added email column to users table");
      }
    }
    
    // Check for current_role
    const hasCurrentRole = await checkIfColumnExists('users', 'current_role');
    if (!hasCurrentRole) {
      await client`ALTER TABLE users ADD COLUMN current_role TEXT`;
      console.log("Added current_role column to users table");
    }
    
    // Check for profile_completed
    const hasProfileCompleted = await checkIfColumnExists('users', 'profile_completed');
    if (!hasProfileCompleted) {
      await client`ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE`;
      console.log("Added profile_completed column to users table");
    }
    
    // Check for verified
    const hasVerified = await checkIfColumnExists('users', 'verified');
    if (!hasVerified) {
      await client`ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT FALSE`;
      console.log("Added verified column to users table");
    }
    
    // Check for updated_at
    const hasUpdatedAt = await checkIfColumnExists('users', 'updated_at');
    if (!hasUpdatedAt) {
      await client`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`;
      console.log("Added updated_at column to users table");
    }

    // Check for password_reset_tokens table
    try {
      await client`SELECT 1 FROM password_reset_tokens LIMIT 1`;
      console.log("Password reset tokens table exists");
    } catch (error) {
      console.log("Creating password_reset_tokens table...");
      await client`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log("Password reset tokens table created");
    }
    
    // Check insights table and add url column if missing
    try {
      await client`SELECT 1 FROM insights LIMIT 1`;
      console.log("Insights table exists");
      
      const hasUrlColumn = await checkIfColumnExists('insights', 'url');
      if (!hasUrlColumn) {
        await client`ALTER TABLE insights ADD COLUMN url TEXT`;
        console.log("Added url column to insights table");
      }
    } catch (error) {
      // Table doesn't exist yet, that's ok as it will be created when needed
    }
    
    // Check scraped_data table and add post_date column if missing
    try {
      await client`SELECT 1 FROM scraped_data LIMIT 1`;
      console.log("Scraped data table exists");
      
      const hasPostDateColumn = await checkIfColumnExists('scraped_data', 'post_date');
      if (!hasPostDateColumn) {
        await client`ALTER TABLE scraped_data ADD COLUMN post_date TEXT`;
        console.log("Added post_date column to scraped_data table");
      }
    } catch (error) {
      // Table doesn't exist yet, that's ok as it will be created when needed
    }

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

export default runMigrations;