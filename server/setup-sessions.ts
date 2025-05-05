import { Pool } from '@neondatabase/serverless';
import { log } from './vite';

export async function setupSessionTable(pool: Pool): Promise<void> {
  try {
    // Check if the session table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'session'
      );
    `;
    
    const tableExists = await pool.query(tableCheckQuery);
    
    if (!tableExists.rows[0].exists) {
      // If the table doesn't exist, create it with the proper structure
      log('Creating session table as it does not exist...');
      
      const createTableQuery = `
        CREATE TABLE "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        );
      `;
      
      const createIndexQuery = `
        CREATE INDEX "IDX_session_expire" ON "session" ("expire");
      `;
      
      await pool.query(createTableQuery);
      await pool.query(createIndexQuery);
      
      log('Session table and index created successfully.');
    } else {
      log('Session table already exists.');
    }
  } catch (error) {
    console.error('Error setting up session table:', error);
    // Don't throw, just log the error so the app can still start
  }
}