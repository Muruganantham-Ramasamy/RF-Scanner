import { createApp } from './app.js';
import { assertRuntimeConfig, config } from './config.js';
import { getPool } from './db.js';

assertRuntimeConfig();

const app = createApp();

async function start() {
  // Fail fast if the database is unreachable.
  await getPool().query('SELECT 1');
  app.listen(config.port, () => {
    console.log(`RF Scanner auth API listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
});
