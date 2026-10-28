# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

Routes live under `src/app` via [Expo Router](https://docs.expo.dev/router/introduction/). Warehouse RF workflows (picking, receiving, scanner) are the primary product surface.

### Authentication

Login requires the Express + PostgreSQL API in `../backend`. See [docs/auth-setup.md](./docs/auth-setup.md).

```bash
# backend
cd ../backend && cp .env.example .env && npm install && npm run migrate && npm run seed:admin && npm run dev

# Expo
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL
npx expo start
```

Admin role value: `admin`. Seed credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` (never committed).

### Other setup steps

- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`
- Workflow checks: `npm run verify:workflows`
- Backend auth tests: `cd ../backend && npm test`

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
