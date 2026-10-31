# Shared chess and API contracts

`@shatranj/shared` is a private npm workspace imported by both applications. It contains only portable code: chess/session types and rules, clock calculations, premove projection/validation, and online request/response contracts. It has no Node-only modules, secrets, persistence, HTTP handlers or UI dependencies.

`src/index.ts` is the public export surface. `npm run build:shared` from the repository root compiles strict TypeScript to `dist/` and emits declarations; root dev/test/typecheck/build scripts do this automatically. Generated output is ignored. Both frontend previews/local practice and backend authoritative execution use the same rules implementation, while ownership, authentication and persistence remain exclusively in backend.

Behavior is tested through frontend local-game/board tests and backend authoritative-game tests. Keep a browser-safe dependency boundary: database, filesystem and credential code must not be imported here.

The dev command builds this workspace before starting the applications. After editing shared sources, rebuild and restart the applications (or rerun root `npm run dev`) so the backend reloads the compiled common code.
