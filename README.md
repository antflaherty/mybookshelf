# MyBookshelf

A personal bookshelf app: track the books you're reading, bookmark pages, organize books onto shelves, and write reviews.

## Architecture

This is a monorepo with two parts:

| Directory   | Stack                                  | Description                                                                                                  |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `backend/`  | Go (Gin), PostgreSQL                   | REST API — auth, books, bookmarks, shelves, reviews. Book search/details are backed by the Open Library API. |
| `frontend/` | React Native (Expo Router), TypeScript | Mobile/web app (iOS, Android, web).                                                                          |

## Prerequisites

- Go 1.27+
- Node.js 20+ and npm
- PostgreSQL (running locally or a hosted instance)
- [goose](https://github.com/pressly/goose) for database migrations
- For iOS development: Xcode; for Android: Android Studio

## Backend

```bash
cd backend
```

1. Copy the env template and fill in values:

   ```bash
   cp .env.example .env
   ```

   | Variable       | Description                              |
   | -------------- | ---------------------------------------- |
   | `PORT`         | Port the API listens on (default `8080`) |
   | `DATABASE_URL` | PostgreSQL connection string             |
   | `JWT_SECRET`   | Secret used to sign JWTs                 |

2. Run the migrations:

   ```bash
   goose -dir migrations postgres "$DATABASE_URL" up
   ```

3. Start the server:

   ```bash
   go run .
   ```

The API listens on `http://localhost:8080`. Public endpoints: `GET /health`, `POST /auth/register`, `POST /auth/login`. Everything else requires an `Authorization: Bearer <token>` header:

- `GET/POST /books`
- `GET/POST /bookmarks`
- `GET /shelves`
- `GET/POST /reviews`

Run the tests with `go test ./...`.

## Frontend

```bash
cd frontend
npm install
```

Set the API URL in `frontend/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080
```

A hosted instance of the backend is available at `https://mybookshelf-hza2.onrender.com` — point `EXPO_PUBLIC_API_URL` at it to use the app without running the backend locally (note: free-tier Render instances spin down when idle, so the first request may be slow).

Then start the app:

```bash
npm start        # Expo dev server
npm run ios      # build & run on iOS simulator
npm run android  # build & run on Android emulator
npm run web      # run in the browser
npm run lint     # ESLint
npm test         # Jest test suite
```

## Docs

[`docs/api-error-contract.md`](docs/api-error-contract.md) defines the error envelope, codes, and
statuses every endpoint returns. [`docs/plans/`](docs/plans/README.md) holds the phased plans and
the prompts used to run backend and frontend agents in parallel.
