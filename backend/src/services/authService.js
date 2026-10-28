import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';

const PUBLIC_USER_COLUMNS = 'id, email, role, is_active, created_at, updated_at';

export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const result = await query(
    `SELECT id, email, password_hash, role, is_active, created_at, updated_at
     FROM users
     WHERE lower(email) = $1
     LIMIT 1`,
    [normalized],
  );
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] || null;
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(String(plainPassword || ''), passwordHash);
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Authenticate email + password.
 * @returns {{ ok: true, token: string, user: object } | { ok: false, status: number, error: string }}
 */
export async function loginWithPassword(email, password) {
  const user = await findUserByEmail(email);
  if (!user) {
    return { ok: false, status: 401, error: 'Invalid email or password.' };
  }

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    return { ok: false, status: 401, error: 'Invalid email or password.' };
  }

  if (!user.is_active) {
    return { ok: false, status: 403, error: 'Account is inactive. Contact an administrator.' };
  }

  const publicUser = toPublicUser(user);
  const token = signAuthToken(publicUser);
  return { ok: true, token, user: publicUser };
}

export async function hashPassword(plainPassword, rounds = config.bcryptRounds) {
  return bcrypt.hash(String(plainPassword), rounds);
}

/**
 * Upsert an admin (or other) account by email. Safe to rerun.
 */
export async function upsertUserAccount({ email, password, role, isActive = true }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [normalizedEmail, passwordHash, role, isActive],
  );
  return toPublicUser(result.rows[0]);
}
