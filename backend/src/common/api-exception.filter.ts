import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { OnlineError } from '@shatranj/shared';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 503;
    let code = 'serverError';
    if (exception instanceof OnlineError) {
      status = exception.status;
      code = exception.code;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = status < 500 ? 'invalidInput' : 'serverError';
    } else if (
      exception instanceof Error &&
      'status' in exception &&
      (exception.status === 400 || exception.status === 413)
    ) {
      status = exception.status;
      code = 'invalidInput';
    } else
      this.logger.error(
        'API request failed',
        exception instanceof Error ? exception.stack : String(exception),
      );
    response.status(status).json({ error: code });
  }
}
