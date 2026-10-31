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

Screenshots are in `docs/screenshots/` and include desktop light/dark dashboard and mobile light puzzle/dark dashboard.

## Verification limits

Browser checks were driven through the in-app browser tools, not a checked-in Playwright runner. Native desktop drag and hardware touch gestures, audible sound output, and other browser engines were not exercised. Keyboard navigation and promotion are covered by React Testing Library. No real accounts, networking, multiplayer, or tournament-complete adjudication is claimed; see README for the demo rules and storage limits.

## Dark Reader hydration follow-up

The supplied browser log identified `data-darkreader-inline-color` attributes injected into SVG icons before hydration. The root server document now includes Dark Reader's supported `darkreader-lock` meta marker before the body. The app retains its own light/dark/system controls; no broad hydration-warning suppression was added. The new initial-document regression test passed, bringing the suite to 41 passing tests. Type checking, lint, and production build also passed. The installed browser extension itself was not exercised in the automated environment; a full reload is required in the affected browser.

## Premoves and preselection follow-up

Added one queued premove and persistent piece-only preselection while the opponent is moving. Computer input is limited to the human color; local two-player games permit the waiting side to queue a reply. A legal queued reply executes in the same transaction as the opponent move; illegal replies are consumed without changing the actual board. Queue changes do not restart the engine worker. Leaving Play, reload recovery, and terminal results clear pending plans.

Automated checks passed: 58 tests, strict TypeScript, ESLint, and production build. New tests cover real move execution, check and capture invalidation, mate and timeout, pawn capture anticipation, en passant, castling, underpromotion, local two-player input, reload cleanup, retained selection, keyboard/right-click cancellation, and worker-search continuity.

In the production browser, a local black g8–f6 premove was queued before White's turn. After e2–e4, the board automatically played Nf6 and the move history showed both moves. The queued state was recorded in `docs/screenshots/premove-queued.jpg`. The browser flow was isolated on a temporary local origin to avoid changing saved data on the main development origin.
