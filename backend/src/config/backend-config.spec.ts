import { loadBackendConfig } from './backend-config';
describe('backend configuration', () => {
  it('keeps backend and legacy paths independent of the shell working directory', () => {
    const config = loadBackendConfig({});
    expect(config.databasePath).toMatch(
      /backend[\\/]\.data[\\/]online\.sqlite$/,
    );
    expect(config.legacyDatabasePath).toMatch(
      /frontend[\\/]\.data[\\/]online\.sqlite$/,
    );
    expect(config.port).toBe(4000);
  });
  it('validates exact browser origins and disables implicit migration with a custom database', () => {
    const config = loadBackendConfig({
      FRONTEND_ORIGINS: 'https://chess.example,http://localhost:3002',
      SHATRANJ_DATABASE_PATH: 'custom.sqlite',
    });
    expect(config.frontendOrigins).toEqual([
      'https://chess.example',
      'http://localhost:3002',
    ]);
    expect(config.legacyDatabasePath).toBeNull();
    expect(() =>
      loadBackendConfig({ FRONTEND_ORIGINS: 'https://chess.example/path' }),
    ).toThrow();
    expect(() => loadBackendConfig({ PORT: 'bad' })).toThrow();
  });
});
