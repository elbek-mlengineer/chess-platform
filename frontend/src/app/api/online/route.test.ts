// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { openDatabase } from "@/server/database";
import type { OnlineState } from "@/lib/online";
import { GET, POST } from "./route";

let db: ReturnType<typeof openDatabase>;
vi.mock("@/server/online-runtime", () => ({ onlineDatabase: () => db }));
beforeEach(() => {
  db = openDatabase(":memory:");
});
afterEach(() => db.close());
const origin = "http://localhost:3002";
function post(body: unknown, cookie = "", requestOrigin = origin) {
  return POST(
    new NextRequest(`${origin}/api/online`, {
      method: "POST",
      headers: {
        origin: requestOrigin,
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}
async function payload(response: Response): Promise<{ state: OnlineState }> {
  return response.json();
}
function cookie(response: Response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

it("protects writes with authentication, same-origin and bounded JSON input", async () => {
  expect((await post({ action: "request", userId: "unknown" })).status).toBe(
    401,
  );
  expect(
    (
      await post(
        { action: "register", username: "Alice", password: "password123" },
        "",
        "https://other.example",
      )
    ).status,
  ).toBe(403);
  expect((await post({ action: "unknown" })).status).toBe(400);
  expect(
    (
      await post({
        action: "register",
        username: "Alice",
        password: "x".repeat(5000),
      })
    ).status,
  ).toBe(413);
  const badJson = await POST(
    new NextRequest(`${origin}/api/online`, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: "{",
    }),
  );
  expect(badJson.status).toBe(400);
  const anonymous = await GET(new NextRequest(`${origin}/api/online?q=Alice`));
  expect((await payload(anonymous)).state.me).toBeNull();
  expect(anonymous.headers.get("cache-control")).toContain("no-store");
});
it("supports the full two-session search, friendship, invitation and move flow over the HTTP handlers", async () => {
  const aliceResponse = await post({
    action: "register",
    username: "Alice",
    password: "password123",
  });
  const bobResponse = await post({
    action: "register",
    username: "Bob",
    password: "password456",
  });
  const aliceCookie = cookie(aliceResponse);
  const bobCookie = cookie(bobResponse);
  expect(aliceResponse.status).toBe(200);
  expect(bobResponse.status).toBe(200);
  expect(aliceResponse.headers.get("set-cookie")).toContain("HttpOnly");
  expect(aliceResponse.headers.get("set-cookie")).toContain("SameSite=lax");
  const alice = (await payload(aliceResponse)).state.me!;
  const bob = (await payload(bobResponse)).state.me!;
  const search = await GET(
    new NextRequest(`${origin}/api/online?q=bob`, {
      headers: { cookie: aliceCookie },
    }),
  );
  expect((await payload(search)).state.users[0].id).toBe(bob.id);
  await post({ action: "request", userId: bob.id }, aliceCookie);
  const incoming = (
    await payload(
      await GET(
        new NextRequest(`${origin}/api/online`, {
          headers: { cookie: bobCookie },
        }),
      ),
    )
  ).state.incoming;
  expect(incoming[0].user.id).toBe(alice.id);
  const accepted = await post(
    { action: "accept-request", id: incoming[0].id },
    bobCookie,
  );
  expect((await payload(accepted)).state.friends[0].id).toBe(alice.id);
  await post(
    { action: "invite", userId: bob.id, time: "untimed", color: "w" },
    aliceCookie,
  );
  const invitations = (
    await payload(
      await GET(
        new NextRequest(`${origin}/api/online`, {
          headers: { cookie: bobCookie },
        }),
      ),
    )
  ).state.invitations;
  const joined = (
    await payload(
      await post({ action: "accept-invite", id: invitations[0].id }, bobCookie),
    )
  ).state;
  const game = joined.games[0];
  await post(
    {
      action: "move",
      gameId: game.id,
      from: "g8",
      to: "f6",
      promotion: "q",
      ply: 0,
    },
    bobCookie,
  );
  const moved = await post(
    {
      action: "move",
      gameId: game.id,
      from: "e2",
      to: "e4",
      promotion: "q",
      ply: 0,
    },
    aliceCookie,
  );
  expect((await payload(moved)).state.games[0].moves).toEqual(["e4", "Nf6"]);
  const loggedOut = await post({ action: "logout" }, aliceCookie);
  expect((await payload(loggedOut)).state.me).toBeNull();
  expect(loggedOut.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(
    (await post({ action: "resign", gameId: game.id }, aliceCookie)).status,
  ).toBe(401);
});
