import type { Color, Square } from "chess.js";
import type { ClockState, GameResult, Premove } from "./chess";

export interface OnlineUser {
  id: string;
  username: string;
  online: boolean;
}
export interface FriendRequest {
  id: string;
  user: OnlineUser;
}
export interface Invitation extends FriendRequest {
  time: string;
  expiresAt: number;
}
export interface OnlineGame {
  id: string;
  white: OnlineUser;
  black: OnlineUser;
  moves: string[];
  time: string;
  clock: ClockState;
  result: GameResult | null;
  drawOffer: Color | null;
  premoves: Premove[];
  startedAt: number;
}
export type Relationship =
  "none" | "friend" | "incoming" | "outgoing" | "blocked";
export interface SearchUser extends OnlineUser {
  relationship: Relationship;
}
export interface OnlineState {
  me: OnlineUser | null;
  friends: OnlineUser[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  blocked: OnlineUser[];
  invitations: Invitation[];
  sentInvitations: Invitation[];
  games: OnlineGame[];
  users: SearchUser[];
  serverNow: number;
}
export type OnlineAction =
  | { action: "register"; username: string; password: string }
  | { action: "login"; username: string; password: string }
  | { action: "logout" }
  | { action: "request" | "remove" | "block" | "unblock"; userId: string }
  | {
      action: "accept-request" | "decline-request" | "cancel-request";
      id: string;
    }
  | {
      action: "invite";
      userId: string;
      time: string;
      color: "w" | "b" | "random";
    }
  | { action: "accept-invite" | "decline-invite" | "cancel-invite"; id: string }
  | {
      action: "move";
      gameId: string;
      from: Square;
      to: Square;
      promotion: string;
      ply: number;
    }
  | {
      action:
        | "resign"
        | "offer-draw"
        | "accept-draw"
        | "decline-draw"
        | "cancel-premove";
      gameId: string;
    };

export class OnlineError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
