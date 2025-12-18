import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://admin:346523@support.parkolay.com:7081/Budget',
  ssl: false,
});

async function test() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in database:', res.rows);
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

test();
