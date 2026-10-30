import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Chess, type Square } from "chess.js";
import { AppProvider } from "./provider";
import { Board } from "./board";
import {
  dataKey,
  preferenceKey,
  emptyData,
  defaultPreferences,
} from "@/lib/storage";
function renderBoard(
  chess: Chess,
  onMove: (from: Square, to: Square, promotion: string) => void,
) {
  vi.useFakeTimers();
  localStorage.setItem(
    preferenceKey,
    JSON.stringify({ ...defaultPreferences, locale: "en" }),
  );
  localStorage.setItem(dataKey, JSON.stringify(emptyData));
  render(
    <AppProvider>
      <Board chess={chess} onMove={onMove} />
    </AppProvider>,
  );
  act(() => vi.advanceTimersByTime(1));
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
});
