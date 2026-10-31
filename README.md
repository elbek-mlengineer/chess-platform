# Shatranj

The frontend and backend run as separate applications, with one npm workspace lockfile.

- **frontend/** — Next.js pages, components, browser state, local practice, engine worker and API client.
- **backend/** — NestJS HTTP API, authentication, sessions, friendships, invitations, authoritative online games and SQLite persistence.
- **shared/** — typed API contracts and portable chess, clock and premove rules used by both applications. No database, filesystem or authentication implementation is shipped to the browser.

## Run

Use Node.js 22.18+ on the 22.x line, or Node.js 24 LTS. From the repository root:

```sh
npm ci
npm run dev
```

Open the frontend URL printed by Next.js (normally http://localhost:3000). NestJS listens on http://127.0.0.1:4000 by default. The frontend forwards `/api/*` to NestJS, preserving browser cookies and query strings; it has no authentication or database route handlers.

To run the processes in separate terminals after building shared code:

```sh
npm run build:shared
npm run start:dev --workspace backend
# In another terminal:
npm run dev --workspace frontend
```

Production: `npm run build`, then `npm start`. Configuration examples are in `backend/.env.example` and `frontend/.env.example`. Backend reads `backend/.env`; Next.js reads frontend environment files. Set frontend `BACKEND_URL` before building production assets. Both friends must open the same reachable frontend address; localhost on another device refers to that other device.

## Data

Online accounts, sessions, friendships, invitations and games live in **backend/.data/online.sqlite** by default. On the first backend startup, an existing default database in `frontend/.data/online.sqlite` is migrated with SQLite's backup API, including committed WAL records. The original stays as a rollback copy; an existing backend database is never overwritten. Stop old servers before the first cutover so no old process continues writing the legacy database. For a previously customized database, set the backend's `SHATRANJ_DATABASE_PATH` explicitly.

Local practice history, guest profile, preferences and puzzles remain in browser localStorage. Migration does not touch browser data. Private SQLite files are ignored by Git. Use persistent backend storage when deploying.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` builds shared code, runs backend domain/migration tests, real Nest HTTP integration tests, and frontend behavior tests. Installation uses the root `package-lock.json`; do not install the workspaces independently or maintain additional lockfiles.

See [frontend documentation](frontend/README.md), [backend documentation](backend/README.md), [shared boundaries](shared/README.md), and the [verification record](VERIFICATION.md).
