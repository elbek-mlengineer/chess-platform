# Shatranj backend

The NestJS backend owns every online account, session, friendship, invitation and game. It runs independently from the Next.js UI; `/api/online` is implemented here, not in frontend route handlers.

## Run and configuration

Install dependencies from the repository root with `npm ci`, then `npm run dev` to start both applications. To start this application alone, build shared code with `npm run build:shared`, then run `npm run start:dev --workspace backend`. Production uses `npm run build` from root and `npm run start:prod --workspace backend`.

Copy `.env.example` to `backend/.env` if defaults need changing. Bootstrap loads that file without overriding already-set process variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | Backend listener; set in backend/.env when starting both apps together. |
| `HOST` | `127.0.0.1` | Backend binds locally behind the frontend proxy. |
| `FRONTEND_ORIGINS` | localhost/127.0.0.1 on ports 3000 and 3001 | Comma-separated exact browser origins permitted for cookie-authenticated writes and CORS. |
| `SHATRANJ_DATABASE_PATH` | backend/.data/online.sqlite | Custom persistent SQLite file; an explicit path disables implicit legacy migration. |

`SHATRANJ_PUBLIC_ORIGIN` remains a compatibility fallback for `FRONTEND_ORIGINS`. For HTTPS deployment, configure the actual browser-facing origin. The frontend uses its own `BACKEND_URL` to locate this service. Requests keep a relative `/api/online` URL in the browser, so cookie authentication works through the proxy without exposing an internal backend URL.

For LAN use, include `http://YOUR-LAN-IP:3001` in `FRONTEND_ORIGINS`, start Nest, and run `npm run dev --workspace frontend -- --hostname 0.0.0.0 --port 3001`. Open that same LAN URL on both devices. This setup does not change firewall/router rules or publish the application.

## Boundaries

- `src/config/`: validated startup configuration and common HTTP setup.
- `src/database/`: schema, SQL boundary checks, write transactions, connection lifecycle and one-time legacy migration.
- `src/auth/`: salted scrypt password derivation, hashed random session tokens, presence, session expiry/revocation and durable rate buckets.
- `src/online/online.controller.ts`: HTTP input, origin checks and cookies. Runtime action validation lives in `online-input.ts`.
- `src/online/online-application.service.ts`: authentication and request orchestration; no presentation or HTTP response objects.
- `src/online/online-service.ts`: friendship/invitation transitions and state views, independently testable with SQLite.
- `src/online/online-games.ts`: authoritative move ownership, expected ply, actual legality, clock expiry, results and private premove queues.
- `src/common/api-exception.filter.ts`: stable `{ error: code }` responses without leaking unexpected errors.
- `../shared/`: transport types and portable rules. The server always revalidates a client's requested move using its own persisted history.

## API

- `GET /api/health` returns `{ "status": "ok" }` after database initialization.
- `GET /api/online?q=username` returns the current user's private state and bounded username search results.
- `POST /api/online` accepts the discriminated `OnlineAction` contract from `@shatranj/shared`. Registration/login/logout, friend requests, invitations, moves, cancellation, resignation and draw offers preserve the existing client contract.

POST requires a configured exact Origin and JSON content type. Body size is limited to 4 KiB; malformed/oversized JSON receives a stable 400/413 error. Cookies are HttpOnly, SameSite=Lax, Secure on HTTPS, expire after 30 days and are revoked on logout. Passwords and raw session tokens are never exposed in state responses. Reads and errors are no-store. Global/per-username authentication limits and per-account write limits remain in SQLite. Configure ingress connection limits at the deployment host.

## Storage and migration

`DatabaseService` opens the database during module initialization and closes it during application shutdown. Default paths are based on the backend directory, not the caller's working directory. WAL, foreign keys, busy timeout, bound SQL parameters, pair uniqueness constraints and explicit write transactions remain enabled.

If the default backend database does not exist but the former default frontend database does, startup uses Node's SQLite backup API to capture a consistent snapshot including committed WAL content. It publishes the complete snapshot without overwriting an existing target and retains the original. Accounts, session hashes, game IDs, clock snapshots and SAN histories are preserved. Never copy a live `.sqlite` file alone. Stop legacy servers for the first cutover; keep the legacy copy until satisfied with the migration. Existing backend data always wins on subsequent starts. Custom database paths are used exactly as configured and are not implicitly copied.

Deploy on one persistent host. Ephemeral/serverless disks and separate hosts with independent SQLite files are unsupported. Use SQLite backup facilities for backups. Built-in SQLite is marked experimental on Node 22; this implementation requires Node 22.18+ or 24 LTS.

Online games are casual/unrated: clocks continue offline, chess.js adjudicates automatic draw conditions, and mating-possibility timeout edge cases are simplified. Both participants automatically open the accepted game through the frontend observer; five private premoves are validated and consumed in order. Password recovery, email verification, account deletion, ranking, chat and public matchmaking are not implemented.

## Verification

From root, `npm test` includes backend domain tests, migration tests with an open WAL source and real Nest HTTP tests with isolated sessions, plus frontend tests. `npm run typecheck`, `npm run lint` and `npm run build` cover both applications and shared code. HTTP tests reuse production HTTP configuration and isolated memory databases, never the user's database.
