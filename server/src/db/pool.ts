import { Pool } from 'pg';
import { env } from '../config/env';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for database operations');
  }

  pool = new Pool({ connectionString: env.DATABASE_URL });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
