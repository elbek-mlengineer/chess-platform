# Shatranj

A chess application built on Next.js App Router, React, and strict TypeScript. Local practice works without an account. Online accounts, friends and games use the independent NestJS application in `../backend/`. Next.js serves the UI and forwards API requests; it does not own credentials or the database. No API key is needed.

## Run

Use Node.js 22.18+ on the 22.x line, or Node.js 24 LTS. Install from the **repository root** and start both processes:

```sh
npm ci
npm run dev
```

Next.js normally serves http://localhost:3000 and proxies `/api/*` to the backend on http://127.0.0.1:4000. For a different internal API address set `BACKEND_URL` in a frontend environment file before building. After `npm run build:shared` from root, `npm run dev --workspace frontend` starts only the UI; online features also require NestJS running. Local practice does not require a backend connection.

Root commands `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` cover all workspaces. Production: `npm run build`, then `npm start` from root. See [backend setup](../backend/README.md) and [root workflow](../README.md).

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

- `src/lib/chess.ts`: frontend result labels and browser PGN export; re-exports common rules and types from `@shatranj/shared`.
- `src/lib/clock.ts`, `premove.ts`, `online.ts`: compatibility import surfaces for the shared portable package, with no server implementation.
- `src/hooks/use-game.ts`: authoritative session transaction and lifecycle. The SAN list reconstructs the board and repetition history; no independent board state is persisted.
- `src/lib/engine.ts`, `engine.worker.ts`, `src/hooks/use-computer.ts`: bounded search, worker transport, cancellation, and identity checks. Computer moves are checked again inside the state transaction, so stale responses cannot change a replacement game.
- `src/hooks/use-move-sound.ts`: optional Web Audio, unlocked by user gestures.
- `src/lib/puzzles.ts`: original positions, intended lines, validation, and hints.
- `src/lib/storage.ts`: runtime validation and versioned device storage.
- `src/lib/i18n.ts`: complete typed translation dictionaries. Focused page components, dialogs, and the board live in `src/components/`. CSS is separated by concern in `src/styles/` and imported once through `src/app/globals.css`.

## Premoves and preselection

During the opponent's turn, queue up to **five premoves**. The preview moves your pieces to their planned positions on red destination squares, with numbered steps. Select the piece at its projected square to continue a sequence with the same piece, or select another own piece to append a different move. Select just a piece to retain that selection across the opponent's reply and choose its destination later. The cancel button, Escape or right-click clears the entire queue and restores the real position. At five plans, the panel explains the limit; further plans do not replace existing ones. Computer games accept only human-color input; local games also allow the waiting player to plan.

Planning hints are speculative: opposing blockers are removed in a separate chess.js planning position, and pawn capture targets may be anticipated. The real board and clocks do not change while queuing. After the opponent's move, the queued reply is validated against the actual position by chess.js, consumed once, and executed only if legal. Both moves are committed atomically. The premove uses the same timestamp as the opponent's completed move (zero additional elapsed time in this local demo), and its increment is applied normally. Castling, en passant, and chosen promotions still require actual legality.

A captured piece, new check, or illegal target cancels the invalid head and its dependent tail. After a legal planned reply, the remaining queue waits for the next opponent move. Completion, timeout, leaving local Play, replacement and local reload recovery clear pending intent. Queue changes do not restart a computer search. `../shared/src/premove.ts` owns the shared limit, preview projection, runtime guard and append validation; projections never change actual history or clocks. Castling previews move both king and rook; promotion previews use the selected piece.

## Local storage and practice boundaries

Data stays in this browser on this device under `shatranj.preferences.v1` and `shatranj.data.v1`. It does not sync and is not authentication. Storage failures show a recovery notice while allowing in-memory play. Invalid preference and game records recover independently. History retains the 100 most recent completed games. Replacing an unfinished game requires confirmation and discards it without inventing a completed result. Clearing data requires confirmation.

Clocks start immediately with White. Timestamps account for elapsed time while the tab is backgrounded. Leaving the playing route pauses the game and terminates its worker. Reload recovery uses a snapshot refreshed every second and on `pagehide`; crash recovery can restore up to about one second of clock time. Restored games require Resume. There is no takeback.

The computer is an original local minimax engine with alpha-beta pruning, material and positional evaluation, move ordering, iterative deepening, and a roughly 1.2-second search budget. Casual uses depth 1 with evaluation noise; Thoughtful uses depth 2; Challenging searches up to depth 4 within its budget. These are not Elo estimates. It is not Stockfish. A worker watchdog provides recovery instead of endless thinking.

Draw adjudication is simplified: chess.js threefold repetition, fifty-move, stalemate, and insufficient-material conditions end the game automatically; there is no separate tournament draw-claim procedure. Timeout awards a win to the other side without adjudicating whether that side could deliver mate in some legal sequence. This is not tournament-complete adjudication. Computer games have no draw-offer button; local games ask the second player to confirm agreement.

Puzzles follow one intended instructional line; other immediate checkmates are accepted. They do not exhaustively grade alternative winning plans or equivalent multi-move variations. The promotion exercise specifically asks for a queen. Puzzle strengths are instructional labels, not ratings. Positions and every solution move are verified in tests. Local two-player results are kept separate from computer wins/draws/losses, measured from the human player’s color.

The initial HTML includes Dark Reader’s supported `darkreader-lock` meta marker. Shatranj manages its own light/dark/system appearance; the marker prevents extension-injected SVG attributes from causing hydration mismatches.

System fonts, pieces matching the user-supplied reference image, an original SVG logo, and locally bundled icons keep the app independent of remote image/font services. See `THIRD_PARTY_NOTICES.md` for license notices.

## Verification

Vitest covers rules, special moves, terminal positions, engine legality and stale results, puzzles and incorrect attempts, corrupted storage, paused recovery, increment/switching, timeout deduplication, timer cleanup, and duplicate worker responses. See `../VERIFICATION.md` for recorded browser checks and limits.

## Friends and online play

Open **Friends**, create an account and give your friend your username. Each player signs into a separate account on their own browser/device. Search matches username substrings case-insensitively (minimum two characters, maximum 20 results). Send a friend request; the receiver can accept, decline or block, and the sender can cancel. Accepted friends appear on both lists. Removing or blocking a friend clears pending invitations too. Blocking prevents requests and hides the blocker from the blocked player's search; an existing game continues.

Choose **Invite to play**, a time control and your preferred color. Invitations expire after ten minutes. Only the receiver can accept/decline; the sender can cancel. Acceptance starts the shared game and clocks immediately and clears other invitations involving either participant. A global navigation observer automatically opens the same game ID for **both** participants, including the sender receiving acceptance through polling. Each active game is auto-opened only once per signed-in application session, so subsequent polls do not prevent leaving the board. A newly accepted rematch opens again. Waiting senders poll every 400 ms. Each account can have one active game. Online history shows the most recent 30 games with completed-game replay and PGN; local guest history stays separate.

The server reconstructs the position from SAN history and validates identity, ownership, expected ply and legality. Client FEN, clocks and results are never trusted. The opponent move and any immediately executable queued replies commit in one SQLite transaction. Each player has a private queue of up to five premoves, retained across online reloads until executed or explicitly cancelled. Each real opponent reply releases the next plan; the server never invents opponent moves. An invalid head clears its dependent tail. Premoves use zero extra elapsed time and receive the increment. Existing single-premove database records are read as one-element queues without changing schema or losing intent. Source-only selection stays in the mounted board. There is no pause or takeback. Offline clocks keep running, and the next server request adjudicates expiry. Draw offers require opponent consent and clear on a move. On timeout a bare king draws; other mating-possibility edge cases remain simplified, so games are casual and unrated.

State uses HTTP polling every 400 ms during active games and 1.5 seconds otherwise (four seconds in a hidden tab), plus refresh on focus. Network delay may postpone visible replies. The board disables input when disconnected. The client serializes commands and ignores stale read responses; expected ply prevents retrying the same move twice. Password reset, account deletion, email verification, chat, ranking and public matchmaking are not implemented. Clearing device settings does not delete online data.

### Backend connection and module boundaries

`next.config.ts` forwards `/api/*` to `BACKEND_URL` (default http://127.0.0.1:4000). This is transport only; `src/server/` and the old `src/app/api/online` route handlers have been removed. Authentication, SQL, authoritative online rules and HTTP integration tests live in `../backend/`. The private online database is `backend/.data/online.sqlite`; startup migrates the former default frontend database with SQLite backup and retains the original. See [backend storage and deployment](../backend/README.md) for configuration and migration details.

`online-provider.tsx` owns client polling, serialized requests, stale response protection and reconnection. `online-game-navigation.tsx` opens an accepted game for both participants once. Account, friends, notices, premove panel and online board are focused presentation components. `src/lib/online-i18n.ts` contains Uzbek/English/Russian interface text. The private `@shatranj/shared` workspace supplies common types, clock/premove calculations and chess adapters without importing server code.
