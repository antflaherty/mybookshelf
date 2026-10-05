# MyBookshelf — Frontend

React Native app built with Expo Router and TypeScript. See the [root README](../README.md) for full setup instructions.

Quick start:

```bash
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` in `.env` to point at your backend (default `http://localhost:8080`; a hosted instance is at `https://mybookshelf-hza2.onrender.com`).

## Scripts

- `npm start` — Expo dev server
- `npm run ios` / `npm run android` / `npm run web` — run on a platform
- `npm run lint` — ESLint
- `npm test` — Jest test suite

Routes live in `src/app/` (file-based routing via Expo Router); shared components, hooks, context, API client, and theming live alongside in `src/`. Tests live in `__tests__/` directories next to the code they cover (e.g. `src/components/__tests__/`), using Jest + React Testing Library via `jest-expo`.
