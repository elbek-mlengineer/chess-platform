"use client";
import { useOnline } from "./online-provider";
export function OnlineStatus() {
  const { text, loading, connected, error, refresh, busy } = useOnline();
  return (
    <div className="online-connection">
      <span
        role="status"
        className={connected ? "presence online" : "presence"}
      >
        {loading
          ? text.syncing
          : connected
            ? text.connected
            : text.reconnecting}
      </span>
      {error && (
        <div className="online-error" role="alert">
          <span>{error}</span>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {text.retry}
          </button>
        </div>
      )}
    </div>
  );
}
