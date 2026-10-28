# RF Scanner Auth Backend

Node.js + Express + PostgreSQL authentication API for the Expo RF Scanner app.

## Features

- `users` table with bcrypt password hashes (cost 12 by default)
- `POST /auth/login` — email/password → JWT
- `GET /auth/me` — current user (Bearer token)
- `GET /auth/admin/ping` — administrator-only probe
- Idempotent admin seed via environment variables (no passwords in source)

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local install or Docker)

## Environment

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret for auth tokens (≥16 chars) |
| `JWT_EXPIRES_IN` | Token lifetime (default `12h`) |
| `PORT` | HTTP port (default `3001`) |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password (never committed) |
| `ADMIN_ROLE` | Seed role (use `admin`) |

## Database setup

### Option A — Docker Compose

```bash
docker compose up -d
```

Default URL: `postgresql://rfscanner:rfscanner@localhost:5432/rfscanner`

### Option B — Existing PostgreSQL

Create a database and user, then set `DATABASE_URL` accordingly.

## Install, migrate, seed

```bash
cd backend
npm install
npm run migrate
```

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, then:

```bash
npm run seed:admin
```

For the Google Play review admin account used by FedHub:

```env
ADMIN_EMAIL=info@fedhubsoftware.com
ADMIN_PASSWORD=<your-strong-unique-password>
ADMIN_ROLE=admin
```

`seed:admin` upserts by email (safe to rerun). The password is bcrypt-hashed before insert and is never logged.

## Start the API

```bash
npm run dev
# or
npm start
```

Health check: `GET http://localhost:3001/health`

## Expo configuration

In `RFScannerExpo`, set:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Device notes:

| Client | API base URL |
|---|---|
| Web / iOS simulator | `http://localhost:3001` |
| Android emulator | `http://10.0.2.2:3001` |
| Physical device | `http://<your-lan-ip>:3001` |
| Production | `https://<your-api-host>` |

Also set `extra.apiBaseUrl` in `app.json` for release builds if you do not inject `EXPO_PUBLIC_API_BASE_URL` at build time.

## Login contract

`POST /auth/login`

```json
{ "email": "info@fedhubsoftware.com", "password": "••••••••" }
```

Success:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "info@fedhubsoftware.com",
    "role": "admin",
    "is_active": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

Administrator role value: **`admin`**

## Tests

```bash
npm test
```

Tests use an in-memory mock database (no live Postgres required) and cover:

- successful admin login
- incorrect password
- inactive account
- unauthenticated protected routes
- role authorization (`admin` vs `warehouse_operator`)

## Deployment checklist

1. Provision managed PostgreSQL.
2. Set strong `JWT_SECRET` and `ADMIN_PASSWORD` in the host secret store.
3. Run `npm run migrate` and `npm run seed:admin`.
4. Expose HTTPS and point Expo `EXPO_PUBLIC_API_BASE_URL` at that host.
5. Rotate the Play review password after store review if needed.
