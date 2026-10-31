import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { createSession } from "@/lib/chess";
import type { OnlineGame, OnlineState } from "@/lib/online";
import { OnlineGameNavigation } from "./online-game-navigation";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
let state: OnlineState;
vi.mock("./online-provider", () => ({ useOnline: () => ({ state }) }));
const alice = { id: "alice", username: "Alice", online: true };
const bob = { id: "bob", username: "Bob", online: true };
function game(id = "shared-game"): OnlineGame {
  return {
    ...createSession("local", "w", "easy", "5+0"),
    id,
    white: alice,
    black: bob,
    drawOffer: null,
    premoves: [],
  };
}
beforeEach(() => {
  push.mockClear();
  state = {
    me: alice,
    friends: [],
    incoming: [],
    outgoing: [],
    blocked: [],
    invitations: [],
    sentInvitations: [],
    games: [],
    users: [],
    serverNow: 0,
  };
});
it.each([alice, bob])(
  "opens the same game automatically for $username when acceptance arrives in a poll",
  (user) => {
    state.me = user;
    const view = render(<OnlineGameNavigation />);
    expect(push).not.toHaveBeenCalled();
    state = { ...state, games: [game()] };
    view.rerender(<OnlineGameNavigation />);
    expect(push).toHaveBeenCalledExactlyOnceWith("/online?game=shared-game");
    state = { ...state, games: [{ ...game(), moves: ["e4"] }] };
    view.rerender(<OnlineGameNavigation />);
    expect(push).toHaveBeenCalledTimes(1);
  },
);
it("restores an active game once, permits leaving it and opens a newly accepted rematch", () => {
  state.games = [game()];
  const view = render(<OnlineGameNavigation />);
  expect(push).toHaveBeenCalledTimes(1);
  view.rerender(<OnlineGameNavigation />);
  expect(push).toHaveBeenCalledTimes(1);
  state = { ...state, games: [game("rematch")] };
  view.rerender(<OnlineGameNavigation />);
  expect(push).toHaveBeenLastCalledWith("/online?game=rematch");
  state = { ...state, me: null };
  view.rerender(<OnlineGameNavigation />);
  state = { ...state, me: bob };
  view.rerender(<OnlineGameNavigation />);
  expect(push).toHaveBeenCalledTimes(3);
});
