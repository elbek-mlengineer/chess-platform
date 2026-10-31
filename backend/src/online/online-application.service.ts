import { Injectable } from '@nestjs/common';
import {
  OnlineError,
  type OnlineAction,
  type OnlineState,
} from '@shatranj/shared';
import { DatabaseService } from '../database/database.service';
import { authenticate, currentUser, logout, rateLimit } from '../auth/auth';
import { OnlineService } from './online-service';

export interface OnlineResponse {
  state: OnlineState;
  sessionToken?: string;
  clearSession?: boolean;
}

/** Coordinates authentication and domain operations; HTTP cookies stay in the controller. */
@Injectable()
export class OnlineApplicationService {
  constructor(private readonly database: DatabaseService) {}
  state(token: string | undefined, query: string): OnlineState {
    const db = this.database.connection;
    const now = Date.now();
    return new OnlineService(db).state(currentUser(db, token, now), query, now);
  }
  async execute(
    action: OnlineAction,
    token: string | undefined,
    query: string,
  ): Promise<OnlineResponse> {
    const db = this.database.connection;
    const now = Date.now();
    if (action.action === 'register' || action.action === 'login') {
      const sessionToken = await authenticate(
        db,
        action.action,
        action.username,
        action.password,
        now,
      );
      return { state: this.state(sessionToken, query), sessionToken };
    }
    if (action.action === 'logout') {
      if (token) logout(db, token);
      return { state: this.state(undefined, ''), clearSession: true };
    }
    const me = currentUser(db, token, now);
    if (!me) throw new OnlineError('signInRequired', 401);
    rateLimit(db, `write:${me.id}`, 180, 60_000, now);
    new OnlineService(db).act(me, action, now);
    return { state: this.state(token, query) };
  }
}
