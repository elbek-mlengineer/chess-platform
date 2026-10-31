import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { OnlineState } from '@shatranj/shared';
import { AppModule } from '../src/app.module';
import {
  BACKEND_CONFIG,
  type BackendConfig,
} from '../src/config/backend-config';
import { configureHttp } from '../src/config/configure-http';

const origin = 'http://localhost:3000';
const config: BackendConfig = {
  port: 4000,
  host: '127.0.0.1',
  frontendOrigins: [origin, 'https://chess.example'],
  databasePath: ':memory:',
  legacyDatabasePath: null,
};
describe('Online HTTP API', () => {
  let app: INestApplication<App>;
  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BACKEND_CONFIG)
      .useValue(config)
      .compile();
    app = module.createNestApplication({ bodyParser: false });
    configureHttp(app, config);
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });
  const state = (response: request.Response): OnlineState => {
    // These integration tests assert the public API contract returned by the real HTTP adapter.
    const body = response.body as { state: OnlineState };
    expect(body.state).toBeDefined();
    return body.state;
  };
  const cookie = (response: request.Response) => {
    const header: unknown = response.headers['set-cookie'];
    if (!Array.isArray(header) || typeof header[0] !== 'string')
      throw new Error('Expected a session cookie');
    return header[0].split(';')[0];
  };
  function post(body: object, session = '', requestOrigin = origin) {
    return request(app.getHttpServer())
      .post('/api/online')
      .set('Origin', requestOrigin)
      .set('Cookie', session)
      .send(body);
  }
  it('reports health and returns uncached anonymous state without exposing users', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200, { status: 'ok' });
    const response = await request(app.getHttpServer())
      .get('/api/online?q=Alice')
      .expect(200);
    expect(state(response).me).toBeNull();
    expect(state(response).users).toEqual([]);
    expect(response.headers['cache-control']).toContain('no-store');
  });
  it('protects writes with session ownership, exact origin, content type and JSON limits', async () => {
    await post({ action: 'request', userId: 'unknown' }).expect(401, {
      error: 'signInRequired',
    });
    await post(
      { action: 'register', username: 'Alice', password: 'password123' },
      '',
      'https://other.example',
    ).expect(403, { error: 'forbidden' });
    await post({ action: 'unknown' }).expect(400, { error: 'invalidInput' });
    await post({
      action: 'register',
      username: 'Alice',
      password: 'x'.repeat(5000),
    }).expect(413, { error: 'invalidInput' });
    await request(app.getHttpServer())
      .post('/api/online')
      .set('Origin', origin)
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400, { error: 'invalidInput' });
    await request(app.getHttpServer())
      .post('/api/online')
      .set('Origin', origin)
      .set('Content-Type', 'text/plain')
      .send('hello')
      .expect(403);
  });
  it('supports two independent sessions from search through friendship, a five-move plan and logout', async () => {
    const aliceResponse = await post({
      action: 'register',
      username: 'Alice',
      password: 'password123',
    }).expect(200);
    const bobResponse = await post({
      action: 'register',
      username: 'Bob',
      password: 'password456',
    }).expect(200);
    const aliceCookie = cookie(aliceResponse);
    const bobCookie = cookie(bobResponse);
    expect(aliceResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('HttpOnly')]),
    );
    expect(aliceResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('SameSite=Lax')]),
    );
    const alice = state(aliceResponse).me;
    const bob = state(bobResponse).me;
    if (!alice || !bob) throw new Error('Expected both registered accounts');
    const search = await request(app.getHttpServer())
      .get('/api/online?q=bob')
      .set('Cookie', aliceCookie)
      .expect(200);
    expect(state(search).users[0].id).toBe(bob.id);
    await post({ action: 'request', userId: bob.id }, aliceCookie).expect(200);
    const incoming = state(
      await request(app.getHttpServer())
        .get('/api/online')
        .set('Cookie', bobCookie),
    ).incoming[0];
    expect(incoming.user.id).toBe(alice.id);
    const accepted = await post(
      { action: 'accept-request', id: incoming.id },
      bobCookie,
    ).expect(200);
    expect(state(accepted).friends[0].id).toBe(alice.id);
    await post(
      { action: 'invite', userId: bob.id, time: 'untimed', color: 'w' },
      aliceCookie,
    ).expect(200);
    const invitation = state(
      await request(app.getHttpServer())
        .get('/api/online')
        .set('Cookie', bobCookie),
    ).invitations[0];
    const game = state(
      await post(
        { action: 'accept-invite', id: invitation.id },
        bobCookie,
      ).expect(200),
    ).games[0];
    for (const [from, to] of [
      ['g8', 'f6'],
      ['f6', 'g4'],
      ['g4', 'h6'],
      ['h6', 'f5'],
      ['f5', 'd4'],
    ]) {
      await post(
        { action: 'move', gameId: game.id, from, to, promotion: 'q', ply: 0 },
        bobCookie,
      ).expect(200);
    }
    const moved = state(
      await post(
        {
          action: 'move',
          gameId: game.id,
          from: 'e2',
          to: 'e4',
          promotion: 'q',
          ply: 0,
        },
        aliceCookie,
      ).expect(200),
    );
    expect(moved.games[0].moves).toEqual(['e4', 'Nf6']);
    expect(moved.games[0].premoves).toEqual([]);
    const bobState = state(
      await request(app.getHttpServer())
        .get('/api/online')
        .set('Cookie', bobCookie),
    );
    expect(bobState.games[0].id).toBe(game.id);
    expect(bobState.games[0].premoves).toHaveLength(4);
    const loggedOut = await post({ action: 'logout' }, aliceCookie).expect(200);
    expect(state(loggedOut).me).toBeNull();
    await post({ action: 'resign', gameId: game.id }, aliceCookie).expect(401);
  });
  it('uses Secure cookies for the configured HTTPS frontend origin', async () => {
    const response = await post(
      { action: 'register', username: 'SecureUser', password: 'password123' },
      '',
      'https://chess.example',
    ).expect(200);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('Secure')]),
    );
  });
});
