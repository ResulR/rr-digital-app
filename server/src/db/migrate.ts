import fs from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import { closePool, getPool } from './pool';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial primary key,
      filename text unique not null,
      applied_at timestamptz not null default now()
    );
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename ASC',
  );
  return new Set(result.rows.map((r) => r.filename));
}

function listMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function applyMigration(pool: Pool, filename: string): Promise<void> {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function run(): Promise<void> {
  const pool = getPool();
  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);
    const all = listMigrationFiles();
    const pending = all.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    for (const filename of pending) {
      console.log(`Applying migration: ${filename}`);
      await applyMigration(pool, filename);
      console.log(`Applied migration: ${filename}`);
    }
  } finally {
    await closePool();
  }
}

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
