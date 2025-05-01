import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure the WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Check for database URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Ensure the database is provisioned.");
}

// Create database connection pool
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Drizzle ORM with schema
export const db = drizzle({ client: pool, schema });
