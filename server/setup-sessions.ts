import { Pool } from '@neondatabase/serverless';
import { log } from './vite';

export async function setupSessionTable(pool: Pool): Promise<void> {
  try {
    // Check if the sessions table exists (name must match what's in replitAuth.ts)
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sessions'
      );
    `;
    
    const tableExists = await pool.query(tableCheckQuery);
    
    if (!tableExists.rows[0].exists) {
      // If the table doesn't exist, create it with the proper structure
      log('Creating sessions table as it does not exist...');
      
      const createTableQuery = `
        CREATE TABLE "sessions" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
        );
      `;
      
      const createIndexQuery = `
        CREATE INDEX "IDX_session_expire" ON "sessions" ("expire");
      `;
      
      await pool.query(createTableQuery);
      await pool.query(createIndexQuery);
      
      log('Sessions table and index created successfully.');
    } else {
      log('Sessions table already exists.');
    }
  } catch (error) {
    console.error('Error setting up sessions table:', error);
    // Don't throw, just log the error so the app can still start
  }
}