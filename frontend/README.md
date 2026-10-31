# Shatranj

A chess application built on Next.js App Router, React, and strict TypeScript. Local practice works without an account. Online accounts, friends and games use the Next.js server and a private SQLite database. The existing Nest starter is not required. No API key is needed.

## Run

Use Node.js 24 LTS (recommended), or Node.js 22.13+ within the 22.x release line.

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. For a production server, run `npm run build`, then `npm start`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format
```

## Features

- Original emerald, ivory, and charcoal design; responsive sidebar and mobile navigation.
- Local two-player chess or a local computer at three levels. Choose white, black, or random and six time controls.
- Online accounts, username search, friend requests, removal/blocking, presence, invitations, server-validated moves/clocks, online premoves, reconnect, draw offers, resignation, rematches, PGN and online history.
- Legal click, touch, keyboard, and native desktop drag moves; castling, en passant, underpromotion, legal destinations, check and last-move markers, captures, SAN history, board flip, PGN export, resignation, and local draw agreement.
- Timestamp clocks with increments, background-tab accounting, timeout protection, and explicit paused recovery.
- Six original instructional puzzles, including multi-move lines, automatic replies, progressive hints, retry, and saved completions.
- Guest profile, four avatars, local statistics, bounded history, and replay with forward/backward stepping and PGN export.
- Uzbek (default), English, and Russian; saved light, dark, or system themes; sound, coordinates, highlights, and reduced-motion settings.
- Native accessible dialogs, keyboard focus, live status, and a roving keyboard board. Tab enters the board; arrow keys select a square; Enter or Space selects a piece and destination; Escape clears selection.

## Module boundaries

- `src/lib/chess.ts`: rules adapter, session model, results, and PGN.
- `src/lib/clock.ts`: pure timestamp calculations, increment, and formatting.
- `src/hooks/use-game.ts`: authoritative session transaction and lifecycle. The SAN list reconstructs the board and repetition history; no independent board state is persisted.
- `src/lib/engine.ts`, `engine.worker.ts`, `src/hooks/use-computer.ts`: bounded search, worker transport, cancellation, and identity checks. Computer moves are checked again inside the state transaction, so stale responses cannot change a replacement game.
- `src/hooks/use-move-sound.ts`: optional Web Audio, unlocked by user gestures.
- `src/lib/puzzles.ts`: original positions, intended lines, validation, and hints.
- `src/lib/storage.ts`: runtime validation and versioned device storage.
- `src/lib/i18n.ts`: complete typed translation dictionaries. Focused page components, dialogs, and the board live in `src/components/`. CSS is separated by concern in `src/styles/` and imported once through `src/app/globals.css`.

## Premoves and preselection

During the opponent's turn, select your piece and a destination to queue one premove. Select just a piece to retain that selection across the opponent's reply and choose its destination later. Queued squares are blue; use the cancel button, Escape, or right-click to cancel. Selecting another piece of the same color replaces the existing plan. Computer games only accept input for the human color; local games allow either waiting side to plan a move.

Planning hints are speculative: opposing blockers are removed in a separate chess.js planning position, and pawn capture targets may be anticipated. The real board and clocks do not change while queuing. After the opponent's move, the queued reply is validated against the actual position by chess.js, consumed once, and executed only if legal. Both moves are committed atomically. The premove uses the same timestamp as the opponent's completed move (zero additional elapsed time in this local demo), and its increment is applied normally. Castling, en passant, and chosen promotions still require actual legality.

A captured piece, new check, or illegal target discards the plan. Completion, timeout, leaving Play, replacement, and reload recovery clear pending intent. Queue changes do not restart a computer search. Multiple queued moves are not supported.

## Local storage and practice boundaries

Data stays in this browser on this device under `shatranj.preferences.v1` and `shatranj.data.v1`. It does not sync and is not authentication. Storage failures show a recovery notice while allowing in-memory play. Invalid preference and game records recover independently. History retains the 100 most recent completed games. Replacing an unfinished game requires confirmation and discards it without inventing a completed result. Clearing data requires confirmation.

Clocks start immediately with White. Timestamps account for elapsed time while the tab is backgrounded. Leaving the playing route pauses the game and terminates its worker. Reload recovery uses a snapshot refreshed every second and on `pagehide`; crash recovery can restore up to about one second of clock time. Restored games require Resume. There is no takeback.

The computer is an original local minimax engine with alpha-beta pruning, material and positional evaluation, move ordering, iterative deepening, and a roughly 1.2-second search budget. Casual uses depth 1 with evaluation noise; Thoughtful uses depth 2; Challenging searches up to depth 4 within its budget. These are not Elo estimates. It is not Stockfish. A worker watchdog provides recovery instead of endless thinking.

Draw adjudication is simplified: chess.js threefold repetition, fifty-move, stalemate, and insufficient-material conditions end the game automatically; there is no separate tournament draw-claim procedure. Timeout awards a win to the other side without adjudicating whether that side could deliver mate in some legal sequence. This is not tournament-complete adjudication. Computer games have no draw-offer button; local games ask the second player to confirm agreement.

Puzzles follow one intended instructional line; other immediate checkmates are accepted. They do not exhaustively grade alternative winning plans or equivalent multi-move variations. The promotion exercise specifically asks for a queen. Puzzle strengths are instructional labels, not ratings. Positions and every solution move are verified in tests. Local two-player results are kept separate from computer wins/draws/losses, measured from the human player’s color.

The initial HTML includes Dark Reader’s supported `darkreader-lock` meta marker. Shatranj manages its own light/dark/system appearance; the marker prevents extension-injected SVG attributes from causing hydration mismatches.

System fonts, pieces matching the user-supplied reference image, an original SVG logo, and locally bundled icons keep the app independent of remote image/font services. See `THIRD_PARTY_NOTICES.md` for license notices.

## Verification

Vitest covers rules, special moves, terminal positions, engine legality and stale results, puzzles and incorrect attempts, corrupted storage, paused recovery, increment/switching, timeout deduplication, timer cleanup, and duplicate worker responses. See `VERIFICATION.md` for recorded browser checks and limits.

## Friends and online play

Open **Friends**, create an account and give your friend your username. Each player signs into a separate account on their own browser/device. Search matches username substrings case-insensitively (minimum two characters, maximum 20 results). Send a friend request; the receiver can accept, decline or block, and the sender can cancel. Accepted friends appear on both lists. Removing or blocking a friend clears pending invitations too. Blocking prevents requests and hides the blocker from the blocked player's search; an existing game continues.

Choose **Invite to play**, a time control and your preferred color. Invitations expire after ten minutes. Only the receiver can accept/decline; the sender can cancel. Acceptance starts the shared game and clocks immediately and clears other invitations involving either participant. Each account can have one active game. Reopen it from Friends after navigation, reload or sign-in. Online history shows the most recent 30 games with completed-game replay and PGN; local guest history stays separate.

The server reconstructs the position from SAN history and validates identity, ownership, expected ply and legality. Client FEN, clocks and results are never trusted. Both plies of an opponent move plus a legal premove commit in one SQLite transaction. One private premove per player is retained across online reloads until executed or explicitly cancelled. Invalid plans are consumed; premoves use zero extra elapsed time and receive the increment. Source-only selection stays in the mounted board. There is no pause or takeback. Offline clocks keep running, and the next server request adjudicates expiry. Draw offers require opponent consent and clear on a move. On timeout a bare king draws; other mating-possibility edge cases remain simplified, so games are casual and unrated.

State uses HTTP polling every 400 ms during active games and 1.5 seconds otherwise (four seconds in a hidden tab), plus refresh on focus. Network delay may postpone visible replies. The board disables input when disconnected. The client serializes commands and ignores stale read responses; expected ply prevents retrying the same move twice. Password reset, account deletion, email verification, chat, ranking and public matchmaking are not implemented. Clearing device settings does not delete online data.

### Server setup

The **frontend Next.js process** serves `/api/online`; no separate backend is needed. It creates `frontend/.data/online.sqlite` on first API use. Private database/WAL files are ignored by Git. Set `SHATRANJ_DATABASE_PATH` to an absolute path on persistent disk when deploying. Schema creation is idempotent; write transactions, pair uniqueness constraints, WAL and busy timeout protect concurrent connections on the same host. Use one persistent host; independent hosts or ephemeral/serverless disks are unsupported. Back up SQLite using its backup facilities, accounting for the WAL.

For two devices on a trusted LAN, run `npm run dev -- --hostname 0.0.0.0 --port 3001` and open the **same LAN address** (`http://YOUR-LAN-IP:3001/friends`) on both devices. Your OS/network must already allow access. `localhost` on another device addresses that other device. Friends outside your LAN need this server deployed at a shared HTTPS address. This change does not publish the app or alter firewall/router settings.

For HTTPS/reverse proxy hosting, set `SHATRANJ_PUBLIC_ORIGIN=https://your-domain.example` to the browser-facing origin. Writes require exact same Origin, JSON content type and a body of at most 4 KiB. Passwords use salted scrypt; 256-bit session tokens are hashed in the database. Cookies are HttpOnly/SameSite=Lax and Secure on HTTPS. Sessions expire after 30 days; sign-out revokes the current session. Persistent rate buckets limit global/per-username authentication and per-account writes. Configure ingress connection limits at the host; forwarded client IPs are not trusted. Node 22's built-in SQLite is marked experimental; no native addon or ORM was added. See the [Node 22 SQLite reference](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html).

### Online module boundaries

- `src/lib/online.ts`, `online-i18n.ts`: shared domain/API types and Uzbek/English/Russian labels.
- `src/server/database.ts`, `auth.ts`: schema, transactions, credentials, sessions and rate limits.
- `src/server/online-service.ts`, `online-games.ts`, `online-input.ts`: friend/invitation transitions, authoritative chess/clocks/premoves, validated API input.
- `src/app/api/online/route.ts`: HTTP/cookie adapter. `online-provider.tsx` handles synchronization and command serialization. Account, friends, notices and board presentation are separate components.
