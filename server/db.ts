import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

// Require DATABASE_URL - no fallback
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const connectionString = process.env.DATABASE_URL;

// Log connection info (sanitized - hide password)
const sanitizedUrl = connectionString.replace(/:[^:@]+@/, ':***@');
console.log('Connecting to database:', sanitizedUrl);

export const pool = new Pool({
  connectionString,
  ssl: false, // Adjust based on your database SSL requirements
});

export const db = drizzle(pool, { schema });

// Initialize settings table if it doesn't exist
export async function initializeDatabase() {
  try {
    // Log actual database connection info
    const dbInfo = await pool.query(`
      SELECT current_database() as db, 
             current_user as user_name,
             inet_server_addr() as server_addr,
             inet_server_port() as server_port
    `);
    console.log('Connected to:', dbInfo.rows[0]);
    
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
