import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

/** @type {import('pg').Pool | null} */
let pool = null;

export function getPool() {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is not configured.');
    }
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Test helper — inject a mock pool. */
export function setPoolForTests(nextPool) {
  pool = nextPool;
}
