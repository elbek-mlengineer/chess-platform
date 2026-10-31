"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Swords } from "lucide-react";
import { useOnline } from "./online-provider";
export function OnlineNotice() {
  const { state, text } = useOnline();
  const path = usePathname();
  if (!state?.me || path === "/friends") return null;
  const count = state.incoming.length + state.invitations.length;
  const game =
    path === "/online" ? null : state.games.find((item) => !item.result);
  if (!count && !game) return null;
  return (
    <div className="online-notice" role="status">
      {count > 0 && (
        <Link href="/friends">
          <Bell size={17} />
          <span>
            {text.notices} · {count}
          </span>
          <strong>{text.viewFriends} →</strong>
        </Link>
      )}
      {game && (
        <Link href={`/online?game=${game.id}`}>
          <Swords size={17} />
          <span>{text.activeGame}</span>
          <strong>{text.openGame} →</strong>
        </Link>
      )}
    </div>
  );
}
