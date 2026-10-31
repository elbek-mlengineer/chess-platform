import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Chess, type Square } from "chess.js";
import { AppProvider } from "./provider";
import { Board } from "./board";
import type { ComponentProps } from "react";
import { position } from "@/lib/chess";
import {
  dataKey,
  preferenceKey,
  emptyData,
  defaultPreferences,
} from "@/lib/storage";
function renderBoard(
  chess: Chess,
  onMove: (from: Square, to: Square, promotion: string) => void,
  options: Partial<ComponentProps<typeof Board>> = {},
) {
  vi.useFakeTimers();
  localStorage.setItem(
    preferenceKey,
    JSON.stringify({ ...defaultPreferences, locale: "en" }),
  );
  localStorage.setItem(dataKey, JSON.stringify(emptyData));
  const view = render(
    <AppProvider>
      <Board chess={chess} onMove={onMove} {...options} />
    </AppProvider>,
  );
  act(() => vi.advanceTimersByTime(1));
  return view;
}
describe("accessible chessboard", () => {
  it("shows legal destinations and submits one selected move", () => {
    const onMove = vi.fn();
    renderBoard(new Chess(), onMove);
    fireEvent.click(screen.getByLabelText("e2, White Pawn"));
    expect(
      screen.getByLabelText("e4, empty, legal destination"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("e4, empty, legal destination"));
    expect(onMove).toHaveBeenCalledExactlyOnceWith("e2", "e4", "q");
  });
  it("rejects illegal destinations without notifying the game controller", () => {
    const onMove = vi.fn();
    renderBoard(new Chess(), onMove);
    fireEvent.click(screen.getByLabelText("e2, White Pawn"));
    fireEvent.click(screen.getByLabelText("e5, empty"));
    expect(onMove).not.toHaveBeenCalled();
  });
  it("moves board focus with arrows and clears selection with Escape", () => {
    renderBoard(new Chess(), vi.fn());
    const square = screen.getByLabelText("e2, White Pawn");
    square.focus();
    fireEvent.keyDown(square, { key: "ArrowUp" });
    expect(screen.getByLabelText("e3, empty")).toHaveFocus();
    fireEvent.click(square);
    fireEvent.keyDown(square, { key: "Escape" });
    expect(square).toHaveAttribute("aria-pressed", "false");
  });
  it("opens a named promotion dialog and supports underpromotion", () => {
    vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
      function (this: HTMLDialogElement) {
        this.open = true;
      },
    );
    vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      this.open = false;
    });
    const onMove = vi.fn();
    renderBoard(new Chess("8/P6k/8/8/8/8/8/7K w - - 0 1"), onMove);
    fireEvent.click(screen.getByLabelText("a7, White Pawn"));
    fireEvent.click(screen.getByLabelText("a8, empty, legal destination"));
    expect(
      screen.getByRole("dialog", { name: "Choose a promotion piece" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Knight" }));
    expect(onMove).toHaveBeenCalledExactlyOnceWith("a7", "a8", "n");
  });
  it("accepts an own-piece premove while the computer is thinking", () => {
    const onMove = vi.fn();
    renderBoard(position(["e4"]), onMove, {
      allowPremoves: true,
      playerColor: "w",
    });
    fireEvent.click(screen.getByLabelText("g1, White Knight"));
    fireEvent.click(screen.getByLabelText("f3, empty, premove destination"));
    expect(onMove).toHaveBeenCalledExactlyOnceWith("g1", "f3", "q", true);
  });
  it("retains a preselected piece across the opponent reply", () => {
    const onMove = vi.fn();
    const view = renderBoard(position(["e4"]), onMove, {
      allowPremoves: true,
      playerColor: "w",
    });
    fireEvent.click(screen.getByLabelText("g1, White Knight"));
    expect(onMove).not.toHaveBeenCalled();
    view.rerender(
      <AppProvider>
        <Board
          chess={position(["e4", "e5"])}
          onMove={onMove}
          allowPremoves
          playerColor="w"
        />
      </AppProvider>,
    );
    expect(screen.getByLabelText("g1, White Knight, selected")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByLabelText("f3, empty, legal destination"));
    expect(onMove).toHaveBeenCalledExactlyOnceWith("g1", "f3", "q");
  });
  it("cancels a queued reply with Escape or right-click", () => {
    const cancel = vi.fn();
    renderBoard(position(["e4"]), vi.fn(), {
      allowPremoves: true,
      playerColor: "w",
      premoves: [{ from: "g1", to: "f3", promotion: "q", color: "w" }],
      onCancelPremove: cancel,
    });
    fireEvent.keyDown(screen.getByLabelText("g1, empty, premove source"), {
      key: "Escape",
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    fireEvent.contextMenu(
      screen.getByLabelText("f3, White Knight, queued destination"),
    );
    expect(cancel).toHaveBeenCalledTimes(2);
  });
  it("does not select computer-owned pieces for premoves", () => {
    renderBoard(position(["e4"]), vi.fn(), {
      allowPremoves: true,
      playerColor: "w",
    });
    const pawn = screen.getByLabelText("e7, Black Pawn");
    fireEvent.click(pawn);
    expect(pawn).toHaveAttribute("aria-pressed", "false");
  });
  it("shows the queued piece on its red destination and appends from that projected square", () => {
    const chess = position(["e4"]);
    const onMove = vi.fn();
    const cancel = vi.fn();
    renderBoard(chess, onMove, {
      allowPremoves: true,
      playerColor: "w",
      premoves: [{ from: "g1", to: "f3", color: "w", promotion: "q" }],
      onCancelPremove: cancel,
    });
    const projected = screen.getByLabelText(
      "f3, White Knight, queued destination",
    );
    expect(projected).toHaveClass("premove-square");
    expect(screen.getByLabelText("g1, empty, premove source")).not.toHaveClass(
      "premove-square",
    );
    expect(chess.get("g1")?.type).toBe("n");
    expect(chess.get("f3")).toBeUndefined();
    fireEvent.click(projected);
    fireEvent.click(screen.getByLabelText("h4, empty, premove destination"));
    expect(onMove).toHaveBeenCalledExactlyOnceWith("f3", "h4", "q", true);
    expect(cancel).not.toHaveBeenCalled();
  });
  it("previews a five-move sequence and prevents a sixth move", () => {
    const onMove = vi.fn();
    renderBoard(position(["e4"]), onMove, {
      allowPremoves: true,
      playerColor: "w",
      premoves: [
        { from: "g1", to: "f3", color: "w", promotion: "q" },
        { from: "f3", to: "g5", color: "w", promotion: "q" },
        { from: "g5", to: "h3", color: "w", promotion: "q" },
        { from: "h3", to: "f4", color: "w", promotion: "q" },
        { from: "f4", to: "d5", color: "w", promotion: "q" },
      ],
    });
    fireEvent.click(
      screen.getByLabelText("d5, White Knight, queued destination"),
    );
    fireEvent.click(screen.getByLabelText("f6, empty, premove destination"));
    expect(onMove).not.toHaveBeenCalled();
  });
  it("restores the real position when the complete preview queue is cancelled", () => {
    const chess = position(["e4"]);
    const view = renderBoard(chess, vi.fn(), {
      allowPremoves: true,
      playerColor: "w",
      premoves: [{ from: "g1", to: "f3", color: "w", promotion: "q" }],
    });
    view.rerender(
      <AppProvider>
        <Board
          chess={chess}
          allowPremoves
          playerColor="w"
          premoves={[]}
          onMove={vi.fn()}
        />
      </AppProvider>,
    );
    expect(screen.getByLabelText("g1, White Knight")).toBeInTheDocument();
    expect(screen.getByLabelText("f3, empty")).not.toHaveClass(
      "premove-square",
    );
  });
});
