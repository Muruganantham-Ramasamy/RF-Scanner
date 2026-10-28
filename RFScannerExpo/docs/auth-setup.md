# RF Scanner — Authentication setup

The Expo app authenticates against the Node/Express backend in `../backend` using email + password. Warehouse and resource values are still collected for warehouse workflows and stored in the session after a successful API login.

## Architecture

| Layer | Location |
|---|---|
| Login UI | `src/app/login.tsx` |
| Session + JWT restore | `src/context/SessionContext.tsx` |
| Secure token storage | `src/services/auth/secureStorage.ts` (`expo-secure-store` on native) |
| Auth HTTP client | `src/services/auth/authApi.ts` |
| Backend API | `../backend` |
| Users table | PostgreSQL `users` |

Administrator role value: **`admin`**

Login field mapping:

| UI field | Purpose |
|---|---|
| Warehouse | Warehouse workflow context (session) |
| Resource / Email | Auth username/email sent to `POST /auth/login` |
| Password | Verified by backend (bcrypt); never stored on device |

## Backend setup

```bash
cd ../backend
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
docker compose up -d   # if using Compose Postgres
npm run migrate
npm run seed:admin
npm run dev
```

Seed credentials for Play review (set only in `backend/.env`, never commit):

```env
ADMIN_EMAIL=info@fedhubsoftware.com
ADMIN_PASSWORD=admin123
ADMIN_ROLE=admin
```

## Expo configuration

```bash
cd RFScannerExpo
cp .env.example .env
```

Set `EXPO_PUBLIC_API_BASE_URL` as appropriate:

| Target | Value |
|---|---|
| Web / iOS simulator | `http://localhost:3001` |
| Android emulator | `http://10.0.2.2:3001` |
| Physical device | `http://<LAN-IP>:3001` |
| Production build | `https://<api-host>` |

For EAS production builds, also set `expo.extra.apiBaseUrl` in `app.json` or inject `EXPO_PUBLIC_API_BASE_URL` via EAS env.

Start the app:

```bash
npx expo start
```

## Login smoke test

1. Start Postgres + backend (`npm run migrate`, `npm run seed:admin`, `npm run dev`).
2. Set Expo API URL and start Expo.
3. Warehouse: `WH01`
4. Resource / Email: `info@fedhubsoftware.com`
5. Password: value from `ADMIN_PASSWORD`
6. Expect home screen; Profile → Role = Administrator; **Verify admin access** succeeds.

Negative cases:

- Wrong password → “Invalid email or password.”
- API down / bad URL → network error message
- Non-admin token → admin ping returns 403
- Signed out / no token → AuthGate redirects to `/login`

## Security notes

- Plaintext passwords are not stored in source, SecureStore, or API responses.
- JWT is stored in SecureStore on native; web uses in-memory fallback.
- Inactive users (`is_active = false`) cannot log in.
- Picking / receiving workflows remain client-side demo documents; only auth is server-backed.
