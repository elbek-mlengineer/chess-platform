# Verification record

Verified on 30 October 2026 using the installed toolchain and the in-app Chromium browser on Windows.

## Automated checks

- `npm run typecheck`: passed, strict TypeScript, no compiler suppressions.
- `npm run lint`: passed, no warnings or errors.
- `npm test`: 40 tests passed across rules/puzzles/storage, game lifecycle, and accessible board interaction.
- `npm run build`: production build passed; all five routes and the icon generated successfully.
- Latest dependency installation audit reported zero vulnerabilities. The unused Tailwind toolchain was subsequently removed.

Tests cover illegal moves; castling and castling through check; en passant; all four promotions; checkmate, stalemate, repetition, insufficient material, and the fifty-move boundary; timestamp switching, increment, background expiry, timeout deduplication, and timer cleanup; legal engine results at all three levels, stale and duplicate responses, and the worker watchdog; all six puzzle solution lines, multi-move completion, incorrect moves and alternative immediate mates; corrupt or unavailable storage and independent recovery; PGN re-import; keyboard focus and the underpromotion dialog.

## Browser checks performed

- Fresh production visitor starts in Uzbek with system theme and genuine empty states.
- Local game: illegal f2–f5 rejected, then f3 e5 g4 Qh4# ends in Black checkmate. Russian language switching after two plies preserved the board and move history.
- Result appears in local history; replay opens and stepping to the final position shows the queen on h4.
- Computer responds legally to e4 (Nf6 in the observed test); the production worker also opens legally as White when the human chooses Black.
- Reload restores the exact move list paused; Resume is required.
- Confirmed resignation ends a production computer game with the correct winner and a replayable saved result.
- An active game requires replacement confirmation. After leaving confirmation open, the new 3+2 game started with the full 3:00 on White’s clock.
- Puzzle 1 solved by Re8#; puzzle 4 solved by Nc7+, automatic Kd8, then Nxa8. Completion persists locally.
- English and light theme survived a full production reload. Uzbek and Russian labels were also inspected.
- Home, Play, Puzzles, Profile, and Settings worked when opened directly; server responses were 200. An unknown route returned 404 and the localized not-found component is implemented.
- Desktop 1280 px, tablet 768 px, and mobile 360 px screens inspected. Light and dark views inspected; measured document width did not exceed viewport width. Settings, profile, play and puzzle screens checked at mobile width.
- No errors recorded from the final production origin in the browser console. A worker fetch while an earlier production build was being replaced triggered its recovery notice; after restarting the server against the completed build, worker play passed.

Screenshots are in `frontend/docs/screenshots/` and include desktop light/dark dashboard and mobile light puzzle/dark dashboard.

## Verification limits

Browser checks were driven through the in-app browser tools, not a checked-in Playwright runner. Native desktop drag and hardware touch gestures, audible sound output, and other browser engines were not exercised. Keyboard navigation and promotion are covered by React Testing Library. The original checks covered local practice; the online follow-up records new account/multiplayer coverage. Tournament-complete adjudication is not claimed; see README for casual rules and storage limits.

## Dark Reader hydration follow-up

The supplied browser log identified `data-darkreader-inline-color` attributes injected into SVG icons before hydration. The root server document now includes Dark Reader's supported `darkreader-lock` meta marker before the body. The app retains its own light/dark/system controls; no broad hydration-warning suppression was added. The new initial-document regression test passed, bringing the suite to 41 passing tests. Type checking, lint, and production build also passed. The installed browser extension itself was not exercised in the automated environment; a full reload is required in the affected browser.

## Premoves and preselection follow-up

Added one queued premove and persistent piece-only preselection while the opponent is moving. Computer input is limited to the human color; local two-player games permit the waiting side to queue a reply. A legal queued reply executes in the same transaction as the opponent move; illegal replies are consumed without changing the actual board. Queue changes do not restart the engine worker. Leaving Play, reload recovery, and terminal results clear pending plans.

Automated checks passed: 58 tests, strict TypeScript, ESLint, and production build. New tests cover real move execution, check and capture invalidation, mate and timeout, pawn capture anticipation, en passant, castling, underpromotion, local two-player input, reload cleanup, retained selection, keyboard/right-click cancellation, and worker-search continuity.

In the production browser, a local black g8–f6 premove was queued before White's turn. After e2–e4, the board automatically played Nf6 and the move history showed both moves. The queued state was recorded in `frontend/docs/screenshots/premove-queued.jpg`. The browser flow was isolated on a temporary local origin to avoid changing saved data on the main development origin.

## Online friends and multiplayer follow-up — 31 October 2026

Final checks passed: **82 tests across eight files**, strict TypeScript, ESLint without warnings, and the production build. `/friends`, `/online` and the dynamic `/api/online` handler build successfully alongside the existing routes. No runtime package was added; the installed Node 22.18 runtime emits its documented experimental SQLite warning.

New coverage includes salted password storage, hashed/expiring/revoked sessions, username uniqueness, input validation, rate limits, bidirectional discovery, request ownership, accept/decline/cancel, duplicate/crossed/self requests, removal/blocking, presence expiry, invitation expiry/ownership, one active game per account, shared game identity, authoritative move ownership/legality/ply/clocks, private premoves and cancellation, check invalidation, checkmate, timeout, draw consent, resignation, rematches and file-backed restart persistence. HTTP-handler integration drives two independent session cookies through registration, search, friendship, invitation, move and logout. It also checks CSRF rejection, anonymous access, invalid JSON, body limits, no-store responses and cookie attributes. Client tests check reconnect, late read responses, command serialization, preserved action errors and ten-second stalled-command recovery.

Production browser QA used a separate temporary database and two invented accounts (`QaAlice`, `QaBob`). Through the UI, both accounts were created, each searched for the other, Bob sent a request, Alice accepted it and invited Bob to an untimed game as White, and Bob accepted. Bob queued g8–f6, then Alice's e2–e4 committed e4 and Nf6 together. The displayed board, ownership and two-ply history matched. After restarting the production server and reloading, the session, friendship and exact game position were restored. The final Friends page showed the search result, accepted friendship and shared active-game link. Screenshots: `frontend/docs/screenshots/online-friends.png` and `online-game.png`. No horizontal overflow was measured at the browser's default approximately 570 px viewport.

The UI check switched accounts in one browser; isolated simultaneous sessions are covered by the HTTP integration tests. Two physical devices, real internet hosting, reverse-proxy TLS, load testing, other browser engines and native drag/touch were not exercised. This task did not publish the server. Remote friends must use the same reachable deployment; LAN setup and persistent-host constraints are documented in README. The temporary QA server and browser tab are stopped/closed after verification; its database is removed.

## Shared game opening and five premoves — 1 November 2026

The sender previously received an active-game banner but no automatic navigation; only the receiver's accept handler navigated. A persistent layout observer now opens newly active games for both accounts from the same server-state transition, using the exact shared game ID. It also restores a live game after sign-in/reload, opens newly accepted rematches, and avoids repeatedly redirecting users who deliberately leave an already-opened game. Waiting senders now poll every 400 ms.

Premoves are ordered queues of at most five, shared across local/computer/online behavior. Projection moves pieces on a separate board and displays red numbered destination squares; the same piece can be selected from its projected location for the next planned move. Actual SAN history and clocks remain unchanged by planning. Each opponent reply releases the next legal queued move; an illegal head clears its dependent tail. Cancellation restores the actual position, including any moves already executed. Online queues stay private and survive reloads. Existing single-object SQLite records upgrade to one-element arrays when read; local reload recovery still clears plans.

Final automated checks passed: **93 tests in nine files**, strict TypeScript, ESLint without warnings, and production build. New regressions cover auto-opening for sender and receiver, restoring a game, rematches, redirect deduplication, five dependent moves with incremental consumption and clock increments, sixth-move rejection, projection without real-position mutation, castling/promotion previews, captured-head tail cancellation, red-square piece rendering, appending from projected squares, cancellation restoration and old database compatibility.

Production QA used two independent authenticated sessions on a temporary database: the sender in the in-app browser and the receiver through the HTTP API. With the sender waiting on Friends, the receiver accepted a timed 10+0 invitation. The sender automatically navigated to the exact returned game ID without clicking an active-game link. Through the UI, five black-knight premoves were appended (`g8–f6–g4–h6–f5–d4`); the knight appeared at d4 and the five red destinations carried ordered numbers, while actual history remained empty. The receiver's a2–a3 produced actual history `a3 Nf6` and left four queued plans. Cancelling restored the real knight on f6 and removed the red preview. Screenshot: `frontend/docs/screenshots/premove-five-red.png`.

The owned QA server, peer session, browser tab and temporary fixture/database are cleaned up after testing. No user database or main development process is changed. Two physical devices and native drag/touch remain untested.

## Independent frontend/backend workspaces — 1 November 2026

Online server implementation and tests moved from frontend to NestJS under `backend/src/{auth,online,database,config,common}`. The starter Hello World implementation was removed. Next.js has no online route handlers or credential/SQL modules; it forwards `/api/*` to the independent backend. The private `shared/` workspace supplies portable rules, clocks, premoves and API contracts to both sides. Root npm workspaces, one lockfile and combined dev/build/check commands replace independent installation lockfiles. The verification record moved to the repository root because it now covers both applications.

Final checks passed: **100 tests** (25 backend domain/config/migration, 4 Nest HTTP integration, 71 frontend), strict type checking across all workspaces, both ESLint configurations without warnings and the combined production build. The Next.js route list no longer contains `/api/online`. No SQLite/authentication implementation remains in frontend or shared source.

Migration was executed against the existing default user database. SQLite backup created `backend/.data/online.sqlite` and retained the original in frontend. SHA-256 comparison of every row in all seven tables confirmed an identical copy, including accounts, session hashes, invitations and game history. No user records were logged. Tests additionally verified migration from an open source connection with committed WAL records, preservation of the original and refusal to overwrite an existing backend database.

Two independently running production processes were then verified through the actual frontend proxy (Next.js on port 3002, NestJS on port 4000), using a temporary isolated backend database. Real HTTP requests exercised health, session cookies, registration/login, username search, friend request/acceptance, shared invitation/game IDs, five private premoves, e4 plus automatic Nf6, queue cancellation, draw consent, history and session revocation. Restarting NestJS preserved accounts, friendship and the completed game. The QA database and owned server processes are cleaned up afterward; the migrated user database and legacy copy are retained.

No new browser UI workflow or physical devices were exercised for this architecture change. Existing frontend behavior tests remain passing; HTTP integration and the real two-process proxy flow verify the changed boundary. Hosting/TLS/load testing remain outside this local verification.
