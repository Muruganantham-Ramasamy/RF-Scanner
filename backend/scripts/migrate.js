import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRuntimeConfig } from '../src/config.js';
import { closePool, query } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', 'sql');

async function migrate() {
  assertRuntimeConfig();

  // gen_random_uuid() requires pgcrypto on older Postgres; on 13+ it's in core via pgcrypto extension historically.
  await query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  const files = (await fs.readdir(sqlDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(sqlDir, file);
    const sql = await fs.readFile(fullPath, 'utf8');
    console.log(`Applying ${file}...`);
    await query(sql);
  }

  console.log('Migration complete.');
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
