import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminRole: process.env.ADMIN_ROLE || 'admin',
};

export function assertRuntimeConfig() {
  required('DATABASE_URL', config.databaseUrl);
  required('JWT_SECRET', config.jwtSecret);
  if (config.jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters.');
  }
}
