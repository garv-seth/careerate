import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

// Create a postgres client
const client = postgres(process.env.DATABASE_URL);

// Create drizzle database instance
export const db = drizzle(client);
