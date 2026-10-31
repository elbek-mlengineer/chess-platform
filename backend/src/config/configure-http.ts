import type { INestApplication } from '@nestjs/common';
import { json, type NextFunction, type Request, type Response } from 'express';
import type { BackendConfig } from './backend-config';
import { ApiExceptionFilter } from '../common/api-exception.filter';

/** Reused by production bootstrap and HTTP integration tests so security settings cannot drift. */
export function configureHttp(app: INestApplication, config: BackendConfig) {
  app.enableCors({
    origin: config.frontendOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  });
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store, private');
    response.setHeader('Vary', 'Origin, Cookie');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(json({ limit: '4kb' }));
  app.useGlobalFilters(new ApiExceptionFilter());
}
