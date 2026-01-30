import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS sites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      check_interval INTEGER DEFAULT 5,
      timeout INTEGER DEFAULT 30000,
      is_paused BOOLEAN DEFAULT FALSE,
      tags TEXT[] DEFAULT '{}',
      group_name TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS checks (
      id SERIAL PRIMARY KEY,
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      status_code INTEGER,
      response_time INTEGER,
      error_message TEXT,
      checked_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT,
      sent_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_checks_site_id ON checks(site_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_alerts_site_id ON alerts(site_id)`);
}

export { pool };
