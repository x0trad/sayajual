import { Pool } from 'pg';

let pool;
let schemaReady = false;

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}

export function getPool() {
  if (pool) return pool;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('Database is not configured. Set DATABASE_URL (or POSTGRES_URL).');
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  return pool;
}

export async function ensureSchema() {
  if (schemaReady) return;

  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      source_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS listing_items (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'SOLD')),
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_listing_items_listing_id
    ON listing_items(listing_id, sort_order);
  `);

  schemaReady = true;
}
