import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    correlationId: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      `req-${Math.random().toString(36).substring(2, 10)}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred.';

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      errorCode = exception.code;
      errorMessage = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        errorCode = resObj.code || resObj.error || 'HTTP_ERROR';
        if (Array.isArray(resObj.message)) {
          errorMessage = resObj.message.join('; ');
        } else {
          errorMessage = resObj.message || exception.message;
        }
      } else {
        errorMessage = exception.message;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      this.logger.error(
        `Unhandled Exception [${correlationId}]: ${exception.message}`,
        exception.stack,
      );
    }

    const errorPayload: ErrorEnvelope = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        correlationId,
      },
    };

    response.status(status).json(errorPayload);
  }
}
