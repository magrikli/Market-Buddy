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
  ssl: false,
  connectionTimeoutMillis: 10000, // 10 second timeout
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
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
    
    // Auto-increment BuildNo only when running in Replit (not Docker/production)
    const isReplit = process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN;
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isReplit && !isProduction) {
      const result = await pool.query(`SELECT value FROM settings WHERE key = 'BuildNo'`);
      const currentBuildNo = result.rows[0]?.value || '0';
      const newBuildNo = String(parseInt(currentBuildNo, 10) + 1);
      await pool.query(`
        INSERT INTO settings (key, value) VALUES ('BuildNo', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [newBuildNo]);
      console.log(`BuildNo incremented: ${currentBuildNo} -> ${newBuildNo}`);
    }
    
    console.log('Database settings table ready');
  } catch (error) {
    console.error('Failed to initialize database settings:', error);
  }
}
