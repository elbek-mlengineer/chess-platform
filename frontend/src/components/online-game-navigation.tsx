"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "./online-provider";

/** Acceptance arrives through polling on the sender's device too, not just the accept button. */
export function OnlineGameNavigation() {
  const { state } = useOnline();
  const router = useRouter();
  const opened = useRef<string | null>(null);
  const userId = state?.me?.id;
  const activeId = state?.games.find((game) => !game.result)?.id;
  useEffect(() => {
    if (!userId) {
      opened.current = null;
      return;
    }
    if (!activeId) return;
    const identity = `${userId}:${activeId}`;
    if (opened.current === identity) return;
    opened.current = identity;
    router.push(`/online?game=${encodeURIComponent(activeId)}`);
  }, [userId, activeId, router]);
  return null;
}
