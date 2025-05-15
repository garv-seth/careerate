const { Pool } = require('pg');

// Connect to the PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Execute the migration for users table
async function applyMigration() {
  try {
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Add Stripe and subscription related columns to users table if they don't exist
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
      `);
      
      if (result.rows.length === 0) {
        console.log('Adding subscription columns to users table...');
        
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR UNIQUE,
          ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR UNIQUE,
          ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'free',
          ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR DEFAULT 'free',
          ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP
        `);
      } else {
        console.log('Subscription columns already exist in users table.');
      }
      
      // Create subscription_plans table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id VARCHAR PRIMARY KEY,
          name VARCHAR NOT NULL,
          description TEXT,
          price INTEGER NOT NULL,
          interval VARCHAR NOT NULL,
          features JSONB,
          ai_credits_per_period INTEGER,
          is_active BOOLEAN DEFAULT TRUE,
          stripe_price_id VARCHAR NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create subscription_transactions table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscription_transactions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          transaction_date TIMESTAMP DEFAULT NOW(),
          amount INTEGER NOT NULL,
          status VARCHAR NOT NULL,
          stripe_payment_intent_id VARCHAR UNIQUE,
          stripe_invoice_id VARCHAR UNIQUE,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create usage_tracking table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS usage_tracking (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feature VARCHAR NOT NULL,
          usage_date TIMESTAMP DEFAULT NOW(),
          usage_amount INTEGER DEFAULT 1,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create rate_limits table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feature VARCHAR NOT NULL,
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          usage_limit INTEGER NOT NULL,
          current_usage INTEGER DEFAULT 0,
          last_updated TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create user_access_logs table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_access_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          access_type VARCHAR NOT NULL,
          ip_address VARCHAR,
          user_agent VARCHAR,
          resource_accessed VARCHAR,
          timestamp TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Insert default subscription plans
      await client.query(`
        INSERT INTO subscription_plans (id, name, description, price, interval, features, ai_credits_per_period, stripe_price_id)
        VALUES 
        ('price_free', 'Free Tier', 'Basic access with limited features', 0, 'month', 
         '{"vulnerabilityAssessment": true, "basicInsights": true, "careerMigration": false, "careerSimulation": false, "advancedInsights": false}'::jsonb, 
         5, 'price_free')
        ON CONFLICT (id) DO NOTHING
      `);
      
      await client.query(`
        INSERT INTO subscription_plans (id, name, description, price, interval, features, ai_credits_per_period, stripe_price_id)
        VALUES 
        ('price_premium_monthly', 'Premium Tier', 'Full access to all features', 2500, 'month', 
         '{"vulnerabilityAssessment": true, "basicInsights": true, "careerMigration": true, "careerSimulation": true, "advancedInsights": true}'::jsonb, 
         100, 'price_premium_monthly')
        ON CONFLICT (id) DO NOTHING
      `);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('Schema migration completed successfully!');
      
    } catch (err) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      console.error('Error during migration:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    pool.end();
  }
}

applyMigration();