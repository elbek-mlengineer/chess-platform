"use client";
import { useState } from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Download,
} from "lucide-react";
import { Dialog } from "./dialog";
import { Board } from "./board";
import { useApp } from "./provider";
import { position, downloadPgn, type GameSession } from "@/lib/chess";
export function Replay({
  session,
  onClose,
}: {
  session: GameSession;
  onClose: () => void;
}) {
  const { t } = useApp();
  const [step, setStep] = useState(0);
  const chess = position(session.moves.slice(0, step));
  return (
    <Dialog title={t("replay")} onClose={onClose}>
      <div className="replay">
        <Board
          chess={chess}
          disabled
          lastMove={chess.history({ verbose: true }).at(-1)}
        />
        <div className="replay-controls">
          <button
            className="icon-button"
            aria-label={t("first")}
            disabled={step === 0}
            onClick={() => setStep(0)}
          >
            <ChevronsLeft />
          </button>
          <button
            className="icon-button"
            aria-label={t("previous")}
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            <ChevronLeft />
          </button>
          <span>
            {step} / {session.moves.length}
          </span>
          <button
            className="icon-button"
            aria-label={t("forward")}
            disabled={step === session.moves.length}
            onClick={() => setStep((s) => s + 1)}
          >
            <ChevronRight />
          </button>
          <button
            className="icon-button"
            aria-label={t("last")}
            disabled={step === session.moves.length}
            onClick={() => setStep(session.moves.length)}
          >
            <ChevronsRight />
          </button>
        </div>
        <button
          className="button secondary full-width"
          onClick={() => downloadPgn(session)}
        >
          <Download size={17} />
          {t("export")}
        </button>
      </div>
    </Dialog>
  );
}
