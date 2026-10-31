import {
  act as reactAct,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { OnlineState } from "@/lib/online";
import { AppProvider } from "./provider";
import { OnlineProvider, useOnline } from "./online-provider";

function snapshot(username: string | null): OnlineState {
  return {
    me: username ? { id: username, username, online: true } : null,
    friends: [],
    incoming: [],
    outgoing: [],
    blocked: [],
    invitations: [],
    sentInvitations: [],
    games: [],
    users: [],
    serverNow: 1_800_000_000_000,
  };
}
const response = (username: string | null) =>
  Response.json({ state: snapshot(username) });
function Probe() {
  const { state, act, connected, refresh, error, busy } = useOnline();
  return (
    <>
      <output data-testid="user">{state?.me?.username || "guest"}</output>
      <output data-testid="connection">{String(connected)}</output>
      <output data-testid="busy">{String(busy)}</output>
      <p>{error}</p>
      <button onClick={() => void refresh()}>retry</button>
      <button
        onClick={() =>
          void act({
            action: "login",
            username: "Alice",
            password: "password123",
          })
        }
      >
        login
      </button>
    </>
  );
}
function mount() {
  return render(
    <AppProvider>
      <OnlineProvider>
        <Probe />
      </OnlineProvider>
    </AppProvider>,
  );
}

it("aborts a stalled command and releases busy state so the user can retry", async () => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  let writeSignal: AbortSignal | null | undefined;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
    if (options?.method !== "POST") return response("Alice");
    writeSignal = options.signal;
    return new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () =>
        reject(new DOMException("Timed out", "AbortError")),
      );
    });
  });
  mount();
  await reactAct(() => vi.advanceTimersByTimeAsync(1));
  fireEvent.click(screen.getByText("login"));
  expect(screen.getByTestId("busy")).toHaveTextContent("true");
  await reactAct(() => vi.advanceTimersByTimeAsync(10_000));
  expect(writeSignal?.aborted).toBe(true);
  expect(screen.getByTestId("busy")).toHaveTextContent("false");
  expect(screen.getByTestId("user")).toHaveTextContent("Alice");
});

it("restores a server session and recovers from a failed connection", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockImplementation(async () => response("Alice"));
  mount();
  await screen.findByText(/Serverga ulanib/);
  expect(screen.getByTestId("connection")).toHaveTextContent("false");
  fireEvent.click(screen.getByText("retry"));
  await waitFor(() =>
    expect(screen.getByTestId("user")).toHaveTextContent("Alice"),
  );
  expect(screen.getByTestId("connection")).toHaveTextContent("true");
  expect(screen.queryByText(/Serverga ulanib/)).not.toBeInTheDocument();
});
it("ignores a heartbeat started before a successful login", async () => {
  let completeOldRead: (response: Response) => void = () => {};
  const oldRead = new Promise<Response>((resolve) => {
    completeOldRead = resolve;
  });
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockReturnValueOnce(oldRead)
    .mockImplementation(async () => response("Alice"));
  mount();
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  fireEvent.click(screen.getByText("login"));
  await waitFor(() =>
    expect(screen.getByTestId("user")).toHaveTextContent("Alice"),
  );
  completeOldRead(response(null));
  await waitFor(() =>
    expect(screen.getByTestId("busy")).toHaveTextContent("false"),
  );
  expect(screen.getByTestId("user")).toHaveTextContent("Alice");
});
it("prevents overlapping commands and keeps a failed action visible after refresh", async () => {
  let completeWrite: (response: Response) => void = () => {};
  const write = new Promise<Response>((resolve) => {
    completeWrite = resolve;
  });
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (_url, options) =>
      options?.method === "POST" ? write : response(null),
    );
  mount();
  await waitFor(() =>
    expect(screen.getByTestId("connection")).toHaveTextContent("true"),
  );
  fireEvent.click(screen.getByText("login"));
  fireEvent.click(screen.getByText("login"));
  expect(
    fetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
  completeWrite(
    Response.json({ error: "invalidCredentials" }, { status: 401 }),
  );
  await screen.findByText("Username yoki parol noto‘g‘ri.");
  await waitFor(() =>
    expect(screen.getByTestId("busy")).toHaveTextContent("false"),
  );
  expect(
    screen.getByText("Username yoki parol noto‘g‘ri."),
  ).toBeInTheDocument();
});
