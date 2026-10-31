import { NextRequest, NextResponse } from "next/server";
import { OnlineError } from "@/lib/online";
import {
  authenticate,
  currentUser,
  logout,
  rateLimit,
  sessionCookie,
  sessionLifetime,
} from "@/server/auth";
import { parseAction } from "@/server/online-input";
import { OnlineService } from "@/server/online-service";
import { onlineDatabase } from "@/server/online-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noCache = { "Cache-Control": "no-store, private", Vary: "Cookie" };

function failure(error: unknown) {
  if (error instanceof OnlineError)
    return NextResponse.json(
      { error: error.code },
      { status: error.status, headers: noCache },
    );
  console.error("Online service failed", error);
  return NextResponse.json(
    { error: "serverError" },
    { status: 503, headers: noCache },
  );
}
function getState(request: NextRequest, token: string | undefined) {
  const db = onlineDatabase();
  const now = Date.now();
  const me = currentUser(db, token, now);
  return new OnlineService(db).state(
    me,
    request.nextUrl.searchParams.get("q") || "",
    now,
  );
}
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      { state: getState(request, request.cookies.get(sessionCookie)?.value) },
      { headers: noCache },
    );
  } catch (error) {
    return failure(error);
  }
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > 4096)
    throw new OnlineError("invalidInput", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new OnlineError("invalidInput");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new OnlineError("invalidInput", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new OnlineError("invalidInput");
  }
}
export async function POST(request: NextRequest) {
  try {
    // JSON + exact same origin protects cookie-authenticated writes against cross-site requests.
    const origin = request.headers.get("origin");
    const expectedOrigin =
      process.env.SHATRANJ_PUBLIC_ORIGIN || request.nextUrl.origin;
    if (
      origin !== expectedOrigin ||
      !request.headers.get("content-type")?.startsWith("application/json")
    )
      throw new OnlineError("forbidden", 403);
    const action = parseAction(await readBody(request));
    const db = onlineDatabase();
    const now = Date.now();
    let token = request.cookies.get(sessionCookie)?.value;
    let clearCookie = false;
    if (action.action === "register" || action.action === "login")
      token = await authenticate(
        db,
        action.action,
        action.username,
        action.password,
        now,
      );
    else if (action.action === "logout") {
      if (token) logout(db, token);
      token = undefined;
      clearCookie = true;
    } else {
      const me = currentUser(db, token, now);
      if (!me) throw new OnlineError("signInRequired", 401);
      rateLimit(db, `write:${me.id}`, 180, 60_000, now);
      new OnlineService(db).act(me, action, now);
    }
    const response = NextResponse.json(
      { state: getState(request, token) },
      { headers: noCache },
    );
    if (token !== request.cookies.get(sessionCookie)?.value || clearCookie) {
      response.cookies.set(sessionCookie, token || "", {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(expectedOrigin).protocol === "https:",
        path: "/",
        maxAge: clearCookie ? 0 : sessionLifetime / 1000,
      });
    }
    return response;
  } catch (error) {
    return failure(error);
  }
}
