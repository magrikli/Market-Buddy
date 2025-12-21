import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

// Use DATABASE_URL from environment variable
const connectionString = process.env.DATABASE_URL || 'postgresql://admin:346523@support.parkolay.com:7081/Budget';

export const pool = new Pool({
  connectionString,
  ssl: false, // Adjust based on your database SSL requirements
});

export const db = drizzle(pool, { schema });

// Initialize settings table if it doesn't exist
export async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT
      )
    `);
    
    // Insert default values if not present
    await pool.query(`
      INSERT INTO settings (key, value) 
      VALUES ('Version', '1.1'), ('BuildNo', '100')
      ON CONFLICT (key) DO NOTHING
    `);
    
    console.log('Database settings table initialized');
  } catch (error) {
    console.error('Failed to initialize database settings:', error);
  }
}
