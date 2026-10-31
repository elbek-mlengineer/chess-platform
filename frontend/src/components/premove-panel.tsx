"use client";
import { X } from "lucide-react";
import type { Premove } from "@/lib/chess";
import { maxPremoves } from "@/lib/premove";
import { useApp } from "./provider";

export function PremovePanel({
  queue = [],
  onCancel,
  disabled = false,
}: {
  queue?: readonly Premove[];
  onCancel: () => void;
  disabled?: boolean;
}) {
  const { t } = useApp();
  return (
    <div className="premove-panel" aria-live="polite">
      {queue.length ? (
        <>
          <div>
            <strong>
              {t("premoveQueued")} · {queue.length}/{maxPremoves}
            </strong>
            <ol>
              {queue.map((move, index) => (
                <li key={index}>
                  {move.from} → {move.to}
                  {move.promotion !== "q"
                    ? ` =${move.promotion.toUpperCase()}`
                    : ""}
                </li>
              ))}
            </ol>
            {queue.length === maxPremoves && <p>{t("premoveLimit")}</p>}
          </div>
          <button
            className="icon-button"
            disabled={disabled}
            onClick={onCancel}
            aria-label={t("cancelPremove")}
            title={t("cancelPremove")}
          >
            <X size={17} />
          </button>
        </>
      ) : (
        <p>{t("premoveHelp")}</p>
      )}
    </div>
  );
}
