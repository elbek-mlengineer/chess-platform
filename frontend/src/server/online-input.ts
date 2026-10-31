import { OnlineError, type OnlineAction } from "@/lib/online";
import { square } from "./online-games";

export function parseAction(value: unknown): OnlineAction {
  if (!value || typeof value !== "object" || !("action" in value))
    throw new OnlineError("invalidInput");
  const action = value.action;
  function field(name: string, max = 128): string {
    if (!value || typeof value !== "object" || !(name in value))
      throw new OnlineError("invalidInput");
    const result = Reflect.get(value, name);
    if (typeof result !== "string" || result.length > max)
      throw new OnlineError("invalidInput");
    return result;
  }
  switch (action) {
    case "register":
    case "login":
      return {
        action,
        username: field("username", 24),
        password: field("password"),
      };
    case "logout":
      return { action };
    case "request":
    case "remove":
    case "block":
    case "unblock":
      return { action, userId: field("userId", 36) };
    case "accept-request":
    case "decline-request":
    case "cancel-request":
    case "accept-invite":
    case "decline-invite":
    case "cancel-invite":
      return { action, id: field("id", 36) };
    case "invite": {
      const color = field("color", 6);
      if (color !== "w" && color !== "b" && color !== "random")
        throw new OnlineError("invalidInput");
      return {
        action,
        userId: field("userId", 36),
        time: field("time", 10),
        color,
      };
    }
    case "move": {
      const ply = Reflect.get(value, "ply");
      if (typeof ply !== "number" || !Number.isSafeInteger(ply) || ply < 0)
        throw new OnlineError("invalidInput");
      return {
        action,
        gameId: field("gameId", 36),
        from: square(field("from", 2)),
        to: square(field("to", 2)),
        promotion: field("promotion", 1),
        ply,
      };
    }
    case "resign":
    case "offer-draw":
    case "accept-draw":
    case "decline-draw":
    case "cancel-premove":
      return { action, gameId: field("gameId", 36) };
    default:
      throw new OnlineError("invalidInput");
  }
}
