import path from 'node:path';

export interface BackendConfig {
  port: number;
  host: string;
  frontendOrigins: string[];
  databasePath: string;
  legacyDatabasePath: string | null;
}
export const BACKEND_CONFIG = Symbol('BACKEND_CONFIG');

export function loadBackendConfig(
  env: NodeJS.ProcessEnv = process.env,
): BackendConfig {
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer from 1 to 65535');
  const origins =
    env.FRONTEND_ORIGINS ||
    env.SHATRANJ_PUBLIC_ORIGIN ||
    'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001';
  const frontendOrigins = origins.split(',').map((value) => {
    const url = new URL(value.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error('FRONTEND_ORIGINS must contain exact HTTP(S) origins');
    return url.origin;
  });
  // Resolve from this module, so starting from the repository root or backend/ uses the same database.
  const backendRoot = path.resolve(__dirname, '../..');
  const databasePath = env.SHATRANJ_DATABASE_PATH
    ? path.resolve(env.SHATRANJ_DATABASE_PATH)
    : path.join(backendRoot, '.data', 'online.sqlite');
  const legacyDatabasePath = env.SHATRANJ_DATABASE_PATH
    ? null
    : path.resolve(backendRoot, '../frontend/.data/online.sqlite');
  return {
    port,
    host: env.HOST || '127.0.0.1',
    frontendOrigins,
    databasePath,
    legacyDatabasePath,
  };
}
