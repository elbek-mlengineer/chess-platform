# Shatranj

A local chess demo built on the repository’s Next.js App Router, React, and strict TypeScript foundation. No server, account, database, or API key is needed. The existing backend is not used by this demo.

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

## Storage and demo boundaries

Data stays in this browser on this device under `shatranj.preferences.v1` and `shatranj.data.v1`. It does not sync and is not authentication. Storage failures show a recovery notice while allowing in-memory play. Invalid preference and game records recover independently. History retains the 100 most recent completed games. Replacing an unfinished game requires confirmation and discards it without inventing a completed result. Clearing data requires confirmation.

Clocks start immediately with White. Timestamps account for elapsed time while the tab is backgrounded. Leaving the playing route pauses the game and terminates its worker. Reload recovery uses a snapshot refreshed every second and on `pagehide`; crash recovery can restore up to about one second of clock time. Restored games require Resume. There is no takeback.

The computer is an original local minimax engine with alpha-beta pruning, material and positional evaluation, move ordering, iterative deepening, and a roughly 1.2-second search budget. Casual uses depth 1 with evaluation noise; Thoughtful uses depth 2; Challenging searches up to depth 4 within its budget. These are not Elo estimates. It is not Stockfish. A worker watchdog provides recovery instead of endless thinking.

Draw adjudication is simplified: chess.js threefold repetition, fifty-move, stalemate, and insufficient-material conditions end the game automatically; there is no separate tournament draw-claim procedure. Timeout awards a win to the other side without adjudicating whether that side could deliver mate in some legal sequence. This is not tournament-complete adjudication. Computer games have no draw-offer button; local games ask the second player to confirm agreement.

Puzzles follow one intended instructional line; other immediate checkmates are accepted. They do not exhaustively grade alternative winning plans or equivalent multi-move variations. The promotion exercise specifically asks for a queen. Puzzle strengths are instructional labels, not ratings. Positions and every solution move are verified in tests. Local two-player results are kept separate from computer wins/draws/losses, measured from the human player’s color.

The initial HTML includes Dark Reader’s supported `darkreader-lock` meta marker. Shatranj manages its own light/dark/system appearance; the marker prevents extension-injected SVG attributes from causing hydration mismatches.

System fonts, pieces matching the user-supplied reference image, an original SVG logo, and locally bundled icons keep the app independent of remote image/font services. See `THIRD_PARTY_NOTICES.md` for license notices.

## Verification

Vitest covers rules, special moves, terminal positions, engine legality and stale results, puzzles and incorrect attempts, corrupted storage, paused recovery, increment/switching, timeout deduplication, timer cleanup, and duplicate worker responses. See `VERIFICATION.md` for recorded browser checks and limits.

## Future server-backed work

Real accounts require an identity provider, secure server sessions, data ownership and migration, and privacy controls. Multiplayer needs server-authoritative rules and clocks, reconnectable streams, idempotent commands, matchmaking, abuse prevention, and multi-client tests. Those services are outside this demo.
