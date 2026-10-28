import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { setPoolForTests } from '../src/db.js';
import {
  hashPassword,
  loginWithPassword,
  signAuthToken,
  toPublicUser,
  verifyPassword,
} from '../src/services/authService.js';

config.jwtSecret = 'test-jwt-secret-32chars-minimum!!';
config.jwtExpiresIn = '1h';
config.bcryptRounds = 4;

function createMemoryUsers(seedUsers = []) {
  /** @type {Map<string, any>} */
  const byEmail = new Map();
  for (const user of seedUsers) {
    byEmail.set(user.email.toLowerCase(), { ...user });
  }

  return {
    async query(text, params = []) {
      const sql = String(text).replace(/\s+/g, ' ').trim().toLowerCase();

      if (sql.startsWith('select 1')) {
        return { rows: [{ '?column?': 1 }] };
      }

      if (sql.includes('from users') && sql.includes('where lower(email)')) {
        const email = String(params[0] || '').toLowerCase();
        const row = byEmail.get(email);
        return { rows: row ? [row] : [] };
      }

      if (sql.includes('from users') && sql.includes('where id =')) {
        const id = params[0];
        const row = [...byEmail.values()].find((u) => u.id === id);
        if (!row) return { rows: [] };
        const { password_hash: _omit, ...publicRow } = row;
        return { rows: [publicRow] };
      }

      if (sql.startsWith('insert into users')) {
        const [email, passwordHash, role, isActive] = params;
        const existing = byEmail.get(String(email).toLowerCase());
        const row = {
          id: existing?.id || `user-${byEmail.size + 1}`,
          email: String(email).toLowerCase(),
          password_hash: passwordHash,
          role,
          is_active: isActive,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        byEmail.set(row.email, row);
        const { password_hash: _omit, ...publicRow } = row;
        return { rows: [publicRow] };
      }

      throw new Error(`Unhandled SQL in test mock: ${text}`);
    },
  };
}

test('bcrypt hashes and verifies passwords without storing plaintext', async () => {
  const hash = await hashPassword('admin123');
  assert.notEqual(hash, 'admin123');
  assert.match(hash, /^\$2[aby]\$/);
  assert.equal(await verifyPassword('admin123', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});

test('login succeeds for active admin and omits password_hash', async () => {
  const passwordHash = await bcrypt.hash('admin123', 4);
  setPoolForTests(
    createMemoryUsers([
      {
        id: 'admin-1',
        email: 'info@fedhubsoftware.com',
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
  );

  const result = await loginWithPassword('info@fedhubsoftware.com', 'admin123');
  assert.equal(result.ok, true);
  assert.ok(result.token);
  assert.equal(result.user.email, 'info@fedhubsoftware.com');
  assert.equal(result.user.role, 'admin');
  assert.equal('password_hash' in result.user, false);

  const payload = jwt.verify(result.token, config.jwtSecret);
  assert.equal(payload.role, 'admin');
  assert.equal(payload.email, 'info@fedhubsoftware.com');
});

test('login rejects incorrect passwords', async () => {
  const passwordHash = await bcrypt.hash('admin123', 4);
  setPoolForTests(
    createMemoryUsers([
      {
        id: 'admin-1',
        email: 'info@fedhubsoftware.com',
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
      },
    ]),
  );

  const result = await loginWithPassword('info@fedhubsoftware.com', 'bad-password');
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('login rejects inactive accounts', async () => {
  const passwordHash = await bcrypt.hash('admin123', 4);
  setPoolForTests(
    createMemoryUsers([
      {
        id: 'admin-1',
        email: 'info@fedhubsoftware.com',
        password_hash: passwordHash,
        role: 'admin',
        is_active: false,
      },
    ]),
  );

  const result = await loginWithPassword('info@fedhubsoftware.com', 'admin123');
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('HTTP auth routes enforce login, me, and admin role', async () => {
  const passwordHash = await bcrypt.hash('admin123', 4);
  const operatorHash = await bcrypt.hash('operator123', 4);
  setPoolForTests(
    createMemoryUsers([
      {
        id: 'admin-1',
        email: 'info@fedhubsoftware.com',
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'op-1',
        email: 'operator@example.com',
        password_hash: operatorHash,
        role: 'warehouse_operator',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
  );

  const app = createApp();
  const server = createServer(app);

  const badLogin = await request(server).post('/auth/login').send({
    email: 'info@fedhubsoftware.com',
    password: 'wrong',
  });
  assert.equal(badLogin.status, 401);

  const unauthMe = await request(server).get('/auth/me');
  assert.equal(unauthMe.status, 401);

  const unauthAdmin = await request(server).get('/auth/admin/ping');
  assert.equal(unauthAdmin.status, 401);

  const adminLogin = await request(server).post('/auth/login').send({
    email: 'info@fedhubsoftware.com',
    password: 'admin123',
  });
  assert.equal(adminLogin.status, 200);
  assert.ok(adminLogin.body.token);
  assert.equal(adminLogin.body.user.role, 'admin');
  assert.equal(adminLogin.body.user.password_hash, undefined);

  const me = await request(server)
    .get('/auth/me')
    .set('Authorization', `Bearer ${adminLogin.body.token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'info@fedhubsoftware.com');

  const adminPing = await request(server)
    .get('/auth/admin/ping')
    .set('Authorization', `Bearer ${adminLogin.body.token}`);
  assert.equal(adminPing.status, 200);
  assert.equal(adminPing.body.ok, true);

  const operatorLogin = await request(server).post('/auth/login').send({
    email: 'operator@example.com',
    password: 'operator123',
  });
  assert.equal(operatorLogin.status, 200);

  const operatorAdmin = await request(server)
    .get('/auth/admin/ping')
    .set('Authorization', `Bearer ${operatorLogin.body.token}`);
  assert.equal(operatorAdmin.status, 403);

  // Fake token should not unlock protected routes.
  const forged = signAuthToken(
    toPublicUser({
      id: 'ghost',
      email: 'ghost@example.com',
      role: 'admin',
      is_active: true,
    }),
  );
  const forgedMe = await request(server).get('/auth/me').set('Authorization', `Bearer ${forged}`);
  assert.equal(forgedMe.status, 401);

  await new Promise((resolve) => server.close(resolve));
});
