import { randomInt, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { createSession, timeControls } from '@shatranj/shared';
import {
  OnlineError,
  type OnlineAction,
  type OnlineState,
  type OnlineUser,
  type Relationship,
} from '@shatranj/shared';
import { publicUser } from '../auth/auth';
import { numberColumn, textColumn, transaction } from '../database/database';
import {
  expireGame,
  finishOnlineGame,
  moveOnlineGame,
  participantColor,
  publicGame,
  readGame,
  saveGame,
} from './online-games';

export class OnlineService {
  constructor(private db: DatabaseSync) {}

  private user(id: string, now: number) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!row) throw new OnlineError('userNotFound', 404);
    return publicUser(row, now);
  }
  private blocked(first: string, second: string) {
    return !!this.db
      .prepare(
        'SELECT 1 FROM blocks WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)',
      )
      .get(first, second, second, first);
  }
  private friendship(first: string, second: string) {
    return this.db
      .prepare(
        'SELECT * FROM friendships WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)',
      )
      .get(first, second, second, first);
  }
  private cleanup(userId: string, now: number) {
    this.db.prepare('DELETE FROM invitations WHERE expires_at <= ?').run(now);
    const rows = this.db
      .prepare(
        'SELECT * FROM games WHERE reason IS NULL AND (white_id = ? OR black_id = ?)',
      )
      .all(userId, userId);
    for (const row of rows) {
      const original = readGame(this.db, row, now);
      const next = expireGame(original, now);
      if (next !== original) saveGame(this.db, next);
    }
  }
  private busy(userId: string) {
    return !!this.db
      .prepare(
        'SELECT 1 FROM games WHERE reason IS NULL AND (white_id = ? OR black_id = ?)',
      )
      .get(userId, userId);
  }
  state(me: OnlineUser | null, query: string, now: number): OnlineState {
    const empty: OnlineState = {
      me,
      friends: [],
      incoming: [],
      outgoing: [],
      blocked: [],
      invitations: [],
      sentInvitations: [],
      games: [],
      users: [],
      serverNow: now,
    };
    if (!me) return empty;
    return transaction(this.db, () => {
      this.cleanup(me.id, now);
      const links = this.db
        .prepare('SELECT * FROM friendships WHERE sender = ? OR receiver = ?')
        .all(me.id, me.id);
      for (const row of links) {
        const sender = textColumn(row, 'sender');
        const user = this.user(
          sender === me.id ? textColumn(row, 'receiver') : sender,
          now,
        );
        if (row.accepted === 1) empty.friends.push(user);
        else
          (sender === me.id ? empty.outgoing : empty.incoming).push({
            id: textColumn(row, 'id'),
            user,
          });
      }
      empty.friends.sort(
        (a, b) =>
          Number(b.online) - Number(a.online) ||
          a.username.localeCompare(b.username),
      );
      empty.blocked = this.db
        .prepare('SELECT receiver FROM blocks WHERE sender = ?')
        .all(me.id)
        .map((row) => this.user(textColumn(row, 'receiver'), now));
      for (const row of this.db
        .prepare('SELECT * FROM invitations WHERE sender = ? OR receiver = ?')
        .all(me.id, me.id)) {
        const sender = textColumn(row, 'sender');
        (sender === me.id ? empty.sentInvitations : empty.invitations).push({
          id: textColumn(row, 'id'),
          user: this.user(
            sender === me.id ? textColumn(row, 'receiver') : sender,
            now,
          ),
          time: textColumn(row, 'time'),
          expiresAt: numberColumn(row, 'expires_at'),
        });
      }
      empty.games = this.db
        .prepare(
          'SELECT * FROM games WHERE white_id = ? OR black_id = ? ORDER BY started_at DESC LIMIT 30',
        )
        .all(me.id, me.id)
        .map((row) => publicGame(readGame(this.db, row, now), me.id));
      const search = query.trim().slice(0, 24);
      if (search.length >= 2 && /^[a-zA-Z0-9_]+$/.test(search)) {
        // instr treats underscores literally; never turn user input into SQL patterns.
        empty.users = this.db
          .prepare(
            `SELECT * FROM users WHERE id <> ? AND instr(lower(username), lower(?)) > 0 AND NOT EXISTS (SELECT 1 FROM blocks WHERE sender = users.id AND receiver = ?) ORDER BY CASE WHEN lower(username) = lower(?) THEN 0 ELSE 1 END, username LIMIT 20`,
          )
          .all(me.id, search, me.id, search)
          .map((row) => {
            const user = publicUser(row, now);
            const link = this.friendship(me.id, user.id);
            let relationship: Relationship = 'none';
            if (empty.blocked.some((blocked) => blocked.id === user.id))
              relationship = 'blocked';
            else if (link)
              relationship =
                link.accepted === 1
                  ? 'friend'
                  : link.sender === me.id
                    ? 'outgoing'
                    : 'incoming';
            return { ...user, relationship };
          });
      }
      return empty;
    });
  }
  act(
    me: OnlineUser,
    action: Exclude<
      OnlineAction,
      { action: 'register' | 'login' } | { action: 'logout' }
    >,
    now: number,
  ) {
    // A rejected late move must not roll back the clock expiry itself.
    transaction(this.db, () => this.cleanup(me.id, now));
    transaction(this.db, () => {
      if ('userId' in action) {
        this.user(action.userId, now);
        if (action.userId === me.id) throw new OnlineError('selfRequest');
        if (action.action === 'unblock') {
          this.db
            .prepare('DELETE FROM blocks WHERE sender = ? AND receiver = ?')
            .run(me.id, action.userId);
          return;
        }
        if (action.action === 'remove' || action.action === 'block') {
          this.db
            .prepare(
              'DELETE FROM friendships WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)',
            )
            .run(me.id, action.userId, action.userId, me.id);
          this.db
            .prepare(
              'DELETE FROM invitations WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)',
            )
            .run(me.id, action.userId, action.userId, me.id);
          if (action.action === 'block')
            this.db
              .prepare('INSERT OR IGNORE INTO blocks VALUES (?, ?)')
              .run(me.id, action.userId);
          return;
        }
        if (this.blocked(me.id, action.userId))
          throw new OnlineError('unavailable', 409);
        const link = this.friendship(me.id, action.userId);
        if (action.action === 'request') {
          if (link) throw new OnlineError('requestExists', 409);
          for (const userId of [me.id, action.userId]) {
            const count = this.db
              .prepare(
                'SELECT count(*) AS count FROM friendships WHERE sender = ? OR receiver = ?',
              )
              .get(userId, userId);
            if (count && numberColumn(count, 'count') >= 500)
              throw new OnlineError('friendLimit');
          }
          this.db
            .prepare('INSERT INTO friendships VALUES (?, ?, ?, 0)')
            .run(randomUUID(), me.id, action.userId);
          return;
        }
        if (action.action === 'invite') {
          if (!link || link.accepted !== 1)
            throw new OnlineError('friendsOnly', 403);
          if (
            !timeControls.some((time) => time === action.time) ||
            !['w', 'b', 'random'].includes(action.color)
          )
            throw new OnlineError('invalidInput');
          this.cleanup(action.userId, now);
          if (this.busy(me.id) || this.busy(action.userId))
            throw new OnlineError('playerBusy', 409);
          const exists = this.db
            .prepare(
              'SELECT id FROM invitations WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)',
            )
            .get(me.id, action.userId, action.userId, me.id);
          if (exists) throw new OnlineError('invitationExists', 409);
          this.db
            .prepare('INSERT INTO invitations VALUES (?, ?, ?, ?, ?, ?)')
            .run(
              randomUUID(),
              me.id,
              action.userId,
              action.time,
              action.color,
              now + 600_000,
            );
          return;
        }
      }
      if ('id' in action) {
        const isFriend = action.action.endsWith('request');
        const table = isFriend ? 'friendships' : 'invitations';
        const row = this.db
          .prepare(`SELECT * FROM ${table} WHERE id = ?`)
          .get(action.id);
        if (!row) throw new OnlineError('requestGone', 409);
        const sender = textColumn(row, 'sender');
        const receiver = textColumn(row, 'receiver');
        const cancelling = action.action.startsWith('cancel');
        if ((cancelling ? sender : receiver) !== me.id)
          throw new OnlineError('forbidden', 403);
        if (isFriend && row.accepted === 1)
          throw new OnlineError('requestGone', 409);
        if (cancelling || action.action.startsWith('decline')) {
          this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(action.id);
          return;
        }
        if (this.blocked(sender, receiver))
          throw new OnlineError('unavailable', 409);
        if (isFriend) {
          this.db
            .prepare('UPDATE friendships SET accepted = 1 WHERE id = ?')
            .run(action.id);
          return;
        }
        const link = this.friendship(sender, receiver);
        if (!link || link.accepted !== 1)
          throw new OnlineError('friendsOnly', 403);
        this.cleanup(sender, now);
        if (this.busy(sender) || this.busy(receiver))
          throw new OnlineError('playerBusy', 409);
        const preference = textColumn(row, 'color');
        const senderWhite =
          preference === 'random' ? randomInt(2) === 0 : preference === 'w';
        const session = createSession(
          'local',
          'w',
          'easy',
          textColumn(row, 'time'),
          now,
        );
        this.db
          .prepare(
            `INSERT INTO games (id, white_id, black_id, moves, time, white_ms, black_ms, active, since, increment_ms, started_at) VALUES (?, ?, ?, '[]', ?, ?, ?, 'w', ?, ?, ?)`,
          )
          .run(
            session.id,
            senderWhite ? sender : receiver,
            senderWhite ? receiver : sender,
            session.time,
            session.clock.w,
            session.clock.b,
            now,
            session.clock.increment,
            now,
          );
        this.db
          .prepare(
            'DELETE FROM invitations WHERE sender IN (?, ?) OR receiver IN (?, ?)',
          )
          .run(sender, receiver, sender, receiver);
        return;
      }
      if ('gameId' in action) {
        const row = this.db
          .prepare('SELECT * FROM games WHERE id = ?')
          .get(action.gameId);
        if (!row) throw new OnlineError('gameNotFound', 404);
        let game = readGame(this.db, row, now);
        const ownColor = participantColor(game, me.id);
        if (game.result) throw new OnlineError('gameFinished', 409);
        if (action.action === 'move')
          game = moveOnlineGame(
            game,
            me.id,
            action.from,
            action.to,
            action.promotion,
            action.ply,
            now,
          );
        else if (action.action === 'resign')
          game = finishOnlineGame(
            game,
            { winner: ownColor === 'w' ? 'b' : 'w', reason: 'resignation' },
            now,
          );
        else if (action.action === 'cancel-premove')
          game =
            ownColor === 'w'
              ? { ...game, whitePremoves: [] }
              : { ...game, blackPremoves: [] };
        else if (action.action === 'offer-draw')
          game = { ...game, drawOffer: ownColor };
        else if (action.action === 'accept-draw') {
          if (!game.drawOffer || game.drawOffer === ownColor)
            throw new OnlineError('noDrawOffer', 409);
          game = finishOnlineGame(
            game,
            { winner: null, reason: 'agreement' },
            now,
          );
        } else if (action.action === 'decline-draw')
          game = { ...game, drawOffer: null };
        saveGame(this.db, game);
        return;
      }
      throw new OnlineError('invalidInput');
    });
  }
}
