import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./database";

const runtime = globalThis as typeof globalThis & {
  shatranjDatabase?: DatabaseSync;
};
export function onlineDatabase() {
  // Reuse one connection through development hot reloads. Records live on disk, not in this singleton.
  runtime.shatranjDatabase ??= openDatabase(
    process.env.SHATRANJ_DATABASE_PATH ||
      path.join(process.cwd(), ".data", "online.sqlite"),
  );
  return runtime.shatranjDatabase;
}
