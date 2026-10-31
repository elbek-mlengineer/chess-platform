// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase } from "./database";
import {
  authenticate,
  currentUser,
  logout,
  rateLimit,
  sessionLifetime,
} from "./auth";
import { OnlineService } from "./online-service";
import { parseAction } from "./online-input";
import type { OnlineUser } from "@/lib/online";
import { position } from "@/lib/chess";

const now = 1_800_000_000_000;
let db: ReturnType<typeof openDatabase>;
let service: OnlineService;
let alice: OnlineUser;
let bob: OnlineUser;
let charlie: OnlineUser;
function addUser(username: string): OnlineUser {
  const user = { id: randomUUID(), username, online: true };
  db.prepare("INSERT INTO users VALUES (?, ?, 'test-only-no-login', ?)").run(
    user.id,
    username,
    now,
  );
  return user;
}
function state(user = alice, at = now, query = "") {
  return service.state(user, query, at);
}
function befriend() {
  service.act(alice, { action: "request", userId: bob.id }, now);
  service.act(
    bob,
    { action: "accept-request", id: state(bob).incoming[0].id },
    now,
  );
}
function startGame(time = "5+0") {
  befriend();
  service.act(
    alice,
    { action: "invite", userId: bob.id, time, color: "w" },
    now,
  );
  service.act(
    bob,
    { action: "accept-invite", id: state(bob).invitations[0].id },
    now,
  );
  return state().games[0];
}
beforeEach(() => {
  db = openDatabase(":memory:");
  service = new OnlineService(db);
  alice = addUser("Alice");
  bob = addUser("Bob");
  charlie = addUser("Charlie");
});
afterEach(() => db.close());

describe("accounts and sessions", () => {
  it("hashes passwords, signs in case-insensitively and revokes only the logged-out session", async () => {
    const token = await authenticate(
      db,
      "register",
      "Diana",
      "correct-password",
      now,
    );
    expect(currentUser(db, token, now)?.username).toBe("Diana");
    const row = db
      .prepare("SELECT password FROM users WHERE username = 'Diana'")
      .get();
    expect(row?.password).not.toContain("correct-password");
    expect(db.prepare("SELECT token FROM sessions").get()?.token).not.toBe(
      token,
    );
    await expect(
      authenticate(db, "register", "DIANA", "another-password", now),
    ).rejects.toMatchObject({ code: "usernameTaken" });
    await expect(
      authenticate(db, "login", "Diana", "wrong-password", now),
    ).rejects.toMatchObject({ code: "invalidCredentials" });
    const other = await authenticate(
      db,
      "login",
      "diana",
      "correct-password",
      now,
    );
    logout(db, token);
    expect(currentUser(db, token, now)).toBeNull();
    expect(currentUser(db, other, now)?.username).toBe("Diana");
    expect(currentUser(db, other, now + sessionLifetime)).toBeNull();
    expect(currentUser(db, "forged-token", now)).toBeNull();
  });
  it("validates account fields and bounds authentication attempts", async () => {
    await expect(
      authenticate(db, "register", "x", "password123", now),
    ).rejects.toMatchObject({ code: "invalidUsername" });
    await expect(
      authenticate(db, "register", "valid_name", "short", now),
    ).rejects.toMatchObject({ code: "invalidPassword" });
    rateLimit(db, "test", 2, 1000, now);
    rateLimit(db, "test", 2, 1000, now);
    expect(() => rateLimit(db, "test", 2, 1000, now)).toThrow("rateLimited");
    expect(() => rateLimit(db, "test", 2, 1000, now + 1000)).not.toThrow();
  });
});
describe("friend discovery and requests", () => {
  it("lets both users find one another, without exposing private account fields", () => {
    expect(state(alice, now, "bo").users).toEqual([
      { ...bob, relationship: "none" },
    ]);
    expect(state(bob, now, "ALICE").users).toEqual([
      { ...alice, relationship: "none" },
    ]);
    expect(state(alice, now, "a").users).toEqual([]);
    expect(state(alice, now, "%").users).toEqual([]);
    expect(state(alice, now, "alice").users).toEqual([]);
  });
  it("delivers incoming/outgoing requests and accepts friendship on both sides", () => {
    service.act(alice, { action: "request", userId: bob.id }, now);
    const request = state(bob).incoming[0];
    expect(request.user.id).toBe(alice.id);
    expect(state().outgoing[0].user.id).toBe(bob.id);
    expect(state(bob, now, "alice").users[0].relationship).toBe("incoming");
    expect(() =>
      service.act(alice, { action: "accept-request", id: request.id }, now),
    ).toThrow("forbidden");
    expect(() =>
      service.act(charlie, { action: "decline-request", id: request.id }, now),
    ).toThrow("forbidden");
    service.act(bob, { action: "accept-request", id: request.id }, now);
    expect(state().friends[0].id).toBe(bob.id);
    expect(state(bob).friends[0].id).toBe(alice.id);
    expect(state().outgoing).toEqual([]);
    expect(state(bob).incoming).toEqual([]);
  });
  it("rejects duplicate, crossed and self requests and supports cancellation and decline", () => {
    expect(() =>
      service.act(alice, { action: "request", userId: alice.id }, now),
    ).toThrow("selfRequest");
    service.act(alice, { action: "request", userId: bob.id }, now);
    expect(() =>
      service.act(bob, { action: "request", userId: alice.id }, now),
    ).toThrow("requestExists");
    const id = state().outgoing[0].id;
    expect(() =>
      service.act(bob, { action: "cancel-request", id }, now),
    ).toThrow("forbidden");
    service.act(alice, { action: "cancel-request", id }, now);
    expect(state(bob).incoming).toEqual([]);
    service.act(alice, { action: "request", userId: bob.id }, now);
    service.act(
      bob,
      { action: "decline-request", id: state(bob).incoming[0].id },
      now,
    );
    expect(state().outgoing).toEqual([]);
  });
  it("removes friendships mutually and blocks requests, invitations and discovery", () => {
    befriend();
    service.act(
      alice,
      { action: "invite", userId: bob.id, time: "3+2", color: "random" },
      now,
    );
    service.act(bob, { action: "block", userId: alice.id }, now);
    expect(state().friends).toEqual([]);
    expect(state().sentInvitations).toEqual([]);
    expect(state(bob).blocked[0].id).toBe(alice.id);
    expect(state(alice, now, "bob").users).toEqual([]);
    expect(() =>
      service.act(alice, { action: "request", userId: bob.id }, now),
    ).toThrow("unavailable");
    service.act(bob, { action: "unblock", userId: alice.id }, now);
    befriend();
    service.act(alice, { action: "remove", userId: bob.id }, now);
    expect(state(bob).friends).toEqual([]);
  });
  it("reports offline presence after heartbeat expiry", () => {
    befriend();
    expect(state(alice, now + 16_000).friends[0].online).toBe(false);
  });
});
describe("invitations and authoritative online play", () => {
  it("requires friendship, supports decline/cancel and expires invitations", () => {
    expect(() =>
      service.act(
        alice,
        { action: "invite", userId: bob.id, time: "5+0", color: "w" },
        now,
      ),
    ).toThrow("friendsOnly");
    befriend();
    service.act(
      alice,
      { action: "invite", userId: bob.id, time: "5+0", color: "w" },
      now,
    );
    let id = state(bob).invitations[0].id;
    expect(() =>
      service.act(charlie, { action: "accept-invite", id }, now),
    ).toThrow("forbidden");
    service.act(bob, { action: "decline-invite", id }, now);
    service.act(
      alice,
      { action: "invite", userId: bob.id, time: "5+0", color: "w" },
      now,
    );
    id = state().sentInvitations[0].id;
    service.act(alice, { action: "cancel-invite", id }, now);
    expect(state(bob).invitations).toEqual([]);
    service.act(
      alice,
      { action: "invite", userId: bob.id, time: "5+0", color: "w" },
      now,
    );
    id = state(bob).invitations[0].id;
    expect(state(bob, now + 600_000).invitations).toEqual([]);
    expect(() =>
      service.act(bob, { action: "accept-invite", id }, now + 600_000),
    ).toThrow("requestGone");
  });
  it("starts the same game for both players and prevents duplicate active games", () => {
    const game = startGame("3+2");
    expect(game.white.id).toBe(alice.id);
    expect(game.black.id).toBe(bob.id);
    expect(state(bob).games[0].id).toBe(game.id);
    expect(game.clock).toMatchObject({
      w: 180_000,
      b: 180_000,
      increment: 2000,
    });
    expect(() =>
      service.act(
        alice,
        { action: "invite", userId: bob.id, time: "5+0", color: "b" },
        now,
      ),
    ).toThrow("playerBusy");
  });
  it("validates ownership, legal moves and expected position, and synchronizes clocks", () => {
    const game = startGame("3+2");
    expect(() =>
      service.act(
        charlie,
        {
          action: "move",
          gameId: game.id,
          from: "e2",
          to: "e4",
          promotion: "q",
          ply: 0,
        },
        now,
      ),
    ).toThrow("forbidden");
    expect(() =>
      service.act(
        bob,
        {
          action: "move",
          gameId: game.id,
          from: "e2",
          to: "e4",
          promotion: "q",
          ply: 0,
        },
        now,
      ),
    ).toThrow("invalidMove");
    expect(() =>
      service.act(
        alice,
        {
          action: "move",
          gameId: game.id,
          from: "e2",
          to: "e5",
          promotion: "q",
          ply: 0,
        },
        now,
      ),
    ).toThrow("invalidMove");
    service.act(
      alice,
      {
        action: "move",
        gameId: game.id,
        from: "e2",
        to: "e4",
        promotion: "q",
        ply: 0,
      },
      now + 1000,
    );
    expect(state(bob, now + 1000).games[0]).toMatchObject({
      moves: ["e4"],
      clock: { w: 181_000, b: 180_000, active: "b" },
    });
    expect(() =>
      service.act(
        alice,
        {
          action: "move",
          gameId: game.id,
          from: "d2",
          to: "d4",
          promotion: "q",
          ply: 0,
        },
        now + 1000,
      ),
    ).toThrow("stalePosition");
  });
  it("keeps premoves private and executes one legal reply atomically", () => {
    const game = startGame("3+2");
    service.act(
      bob,
      {
        action: "move",
        gameId: game.id,
        from: "g8",
        to: "f6",
        promotion: "q",
        ply: 0,
      },
      now,
    );
    expect(state(bob).games[0].premove).toMatchObject({ from: "g8", to: "f6" });
    expect(state().games[0].premove).toBeNull();
    expect(state().games[0].moves).toEqual([]);
    service.act(
      alice,
      {
        action: "move",
        gameId: game.id,
        from: "e2",
        to: "e4",
        promotion: "q",
        ply: 0,
      },
      now + 1000,
    );
    expect(state(bob, now + 1000).games[0]).toMatchObject({
      moves: ["e4", "Nf6"],
      premove: null,
      clock: { w: 181_000, b: 182_000, active: "w" },
    });
  });
  it("cancels premoves without changing the position", () => {
    const game = startGame();
    service.act(
      bob,
      {
        action: "move",
        gameId: game.id,
        from: "e7",
        to: "e5",
        promotion: "q",
        ply: 0,
      },
      now,
    );
    service.act(bob, { action: "cancel-premove", gameId: game.id }, now);
    service.act(
      alice,
      {
        action: "move",
        gameId: game.id,
        from: "e2",
        to: "e4",
        promotion: "q",
        ply: 0,
      },
      now,
    );
    expect(state().games[0].moves).toEqual(["e4"]);
  });
  it("discards a premove that fails to answer check", () => {
    const game = startGame();
    db.prepare("UPDATE games SET moves = ? WHERE id = ?").run(
      JSON.stringify(["e4", "e5", "Qh5", "Nc6"]),
      game.id,
    );
    service.act(
      bob,
      {
        action: "move",
        gameId: game.id,
        from: "a7",
        to: "a6",
        promotion: "q",
        ply: 4,
      },
      now,
    );
    service.act(
      alice,
      {
        action: "move",
        gameId: game.id,
        from: "h5",
        to: "e5",
        promotion: "q",
        ply: 4,
      },
      now,
    );
    expect(state().games[0].moves).toHaveLength(5);
    expect(state().games[0].result).toBeNull();
    expect(position(state().games[0].moves).isCheck()).toBe(true);
    expect(state(bob).games[0].premove).toBeNull();
  });
  it("finishes checkmate on the server and rejects further moves", () => {
    const game = startGame();
    const moves = [
      [alice, "f2", "f3"],
      [bob, "e7", "e5"],
      [alice, "g2", "g4"],
      [bob, "d8", "h4"],
    ] as const;
    moves.forEach(([user, from, to], ply) =>
      service.act(
        user,
        { action: "move", gameId: game.id, from, to, promotion: "q", ply },
        now,
      ),
    );
    const finished = state().games[0];
    expect(finished.result).toEqual({ winner: "b", reason: "checkmate" });
    expect(position(finished.moves).isCheckmate()).toBe(true);
    expect(() =>
      service.act(
        alice,
        {
          action: "move",
          gameId: game.id,
          from: "a2",
          to: "a3",
          promotion: "q",
          ply: 4,
        },
        now,
      ),
    ).toThrow("gameFinished");
  });
  it("expires clocks even without moves and cannot revive a timed-out game", () => {
    const game = startGame("1+0");
    expect(() =>
      service.act(
        alice,
        {
          action: "move",
          gameId: game.id,
          from: "e2",
          to: "e4",
          promotion: "q",
          ply: 0,
        },
        now + 60_001,
      ),
    ).toThrow("gameFinished");
    expect(state(bob, now + 60_001).games[0].result).toEqual({
      winner: "b",
      reason: "timeout",
    });
    expect(state(bob, now + 60_001).games[0].moves).toEqual([]);
  });
  it("requires the opponent’s consent for draws and supports resignation/rematch", () => {
    const game = startGame("untimed");
    expect(() =>
      service.act(bob, { action: "accept-draw", gameId: game.id }, now),
    ).toThrow("noDrawOffer");
    service.act(alice, { action: "offer-draw", gameId: game.id }, now);
    expect(() =>
      service.act(alice, { action: "accept-draw", gameId: game.id }, now),
    ).toThrow("noDrawOffer");
    service.act(bob, { action: "decline-draw", gameId: game.id }, now);
    expect(state().games[0].drawOffer).toBeNull();
    service.act(alice, { action: "offer-draw", gameId: game.id }, now);
    service.act(bob, { action: "accept-draw", gameId: game.id }, now);
    expect(state().games[0].result).toEqual({
      winner: null,
      reason: "agreement",
    });
    service.act(
      alice,
      { action: "invite", userId: bob.id, time: "untimed", color: "b" },
      now + 1,
    );
    service.act(
      bob,
      { action: "accept-invite", id: state(bob, now + 1).invitations[0].id },
      now + 1,
    );
    const rematch = state(bob, now + 1).games[0];
    expect(rematch.white.id).toBe(bob.id);
    service.act(bob, { action: "resign", gameId: rematch.id }, now + 2);
    expect(state(alice, now + 2).games[0].result).toEqual({
      winner: "b",
      reason: "resignation",
    });
  });
  it("persists accounts, friendship and games across database reopen", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "shatranj-online-test-"));
    const filename = path.join(directory, "test.sqlite");
    let persistent = openDatabase(filename);
    try {
      for (const user of [alice, bob])
        persistent
          .prepare("INSERT INTO users VALUES (?, ?, 'test-only', ?)")
          .run(user.id, user.username, now);
      let online = new OnlineService(persistent);
      online.act(alice, { action: "request", userId: bob.id }, now);
      online.act(
        bob,
        {
          action: "accept-request",
          id: online.state(bob, "", now).incoming[0].id,
        },
        now,
      );
      online.act(
        alice,
        { action: "invite", userId: bob.id, time: "untimed", color: "w" },
        now,
      );
      online.act(
        bob,
        {
          action: "accept-invite",
          id: online.state(bob, "", now).invitations[0].id,
        },
        now,
      );
      const id = online.state(alice, "", now).games[0].id;
      online.act(
        alice,
        {
          action: "move",
          gameId: id,
          from: "e2",
          to: "e4",
          promotion: "q",
          ply: 0,
        },
        now,
      );
      persistent.close();
      persistent = openDatabase(filename);
      online = new OnlineService(persistent);
      expect(online.state(bob, "", now).games[0].moves).toEqual(["e4"]);
      expect(online.state(alice, "", now).friends[0].id).toBe(bob.id);
    } finally {
      persistent.close();
      // Verify the computed cleanup target remains inside the temporary directory.
      if (
        !path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep)
      )
        throw new Error("Unsafe test cleanup path");
      rmSync(directory, { recursive: true });
    }
  });
});
it("rejects malformed actions at the API boundary", () => {
  for (const input of [
    null,
    {},
    { action: "unknown" },
    { action: "request", userId: 5 },
    {
      action: "move",
      gameId: "id",
      from: "z9",
      to: "e4",
      promotion: "q",
      ply: 0,
    },
    {
      action: "move",
      gameId: "id",
      from: "e2",
      to: "e4",
      promotion: "q",
      ply: -1,
    },
  ])
    expect(() => parseAction(input)).toThrow();
});
