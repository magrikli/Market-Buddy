import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

// Use the external database URL
const connectionString = 'postgresql://admin:346523@support.parkolay.com:7081/Budget';

export const pool = new Pool({
  connectionString,
  ssl: false, // Adjust based on your database SSL requirements
});

export const db = drizzle(pool, { schema });
