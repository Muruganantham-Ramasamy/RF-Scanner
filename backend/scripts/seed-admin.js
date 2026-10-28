import { assertRuntimeConfig, config } from '../src/config.js';
import { closePool } from '../src/db.js';
import { upsertUserAccount } from '../src/services/authService.js';

async function seedAdmin() {
  assertRuntimeConfig();

  const email = String(config.adminEmail || '').trim().toLowerCase();
  const password = String(config.adminPassword || '');
  const role = String(config.adminRole || 'admin').trim();

  if (!email || !password) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before seeding. Passwords are never hard-coded.',
    );
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  if (!['admin', 'warehouse_operator'].includes(role)) {
    throw new Error(`Unsupported ADMIN_ROLE: ${role}`);
  }

  const user = await upsertUserAccount({
    email,
    password,
    role,
    isActive: true,
  });

  console.log(`Admin account upserted for ${user.email} (role=${user.role}, active=${user.is_active}).`);
  console.log('Password was hashed with bcrypt and is not logged.');
}

seedAdmin()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
