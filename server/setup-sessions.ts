import { Pool } from '@neondatabase/serverless';

export async function setupSessionTable(pool: Pool): Promise<void> {
  try {
    // Check if the sessions table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sessions'
      );
    `);
    
    const tableExists = result.rows[0].exists;
    
    if (!tableExists) {
      // Create the sessions table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR NOT NULL PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
      `);
      console.log("Sessions table created successfully.");
    } else {
      console.log("Session table already exists.");
    }
  } catch (error) {
    console.error("Error setting up session table:", error);
    throw error;
  }
}