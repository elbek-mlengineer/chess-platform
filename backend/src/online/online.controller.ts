import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OnlineError } from '@shatranj/shared';
import { BACKEND_CONFIG, type BackendConfig } from '../config/backend-config';
import { sessionCookie, sessionLifetime } from '../auth/auth';
import { parseAction } from './online-input';
import { OnlineApplicationService } from './online-application.service';

function sessionToken(request: Request): string | undefined {
  const entry = request.headers.cookie
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${sessionCookie}=`));
  return entry?.slice(sessionCookie.length + 1);
}

@Controller('api/online')
export class OnlineController {
  constructor(
    private readonly online: OnlineApplicationService,
    @Inject(BACKEND_CONFIG) private readonly config: BackendConfig,
  ) {}
  @Get()
  get(@Req() request: Request, @Query('q') query: unknown) {
    return {
      state: this.online.state(
        sessionToken(request),
        typeof query === 'string' ? query : '',
      ),
    };
  }
  @Post()
  @HttpCode(200)
  async post(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Query('q') query: unknown,
  ) {
    const origin = request.headers.origin;
    if (
      !origin ||
      !this.config.frontendOrigins.includes(origin) ||
      !request.is('application/json')
    )
      throw new OnlineError('forbidden', 403);
    const result = await this.online.execute(
      parseAction(body),
      sessionToken(request),
      typeof query === 'string' ? query : '',
    );
    const options = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: new URL(origin).protocol === 'https:',
      path: '/',
    };
    if (result.sessionToken)
      response.cookie(sessionCookie, result.sessionToken, {
        ...options,
        maxAge: sessionLifetime,
      });
    if (result.clearSession) response.clearCookie(sessionCookie, options);
    return { state: result.state };
  }
}
