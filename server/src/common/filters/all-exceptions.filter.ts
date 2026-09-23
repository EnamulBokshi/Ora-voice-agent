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

/** A Mongoose document-validation failure, recognised without importing mongoose. */
function isMongooseValidationError(
  exception: unknown,
): exception is Error & { errors?: Record<string, unknown> } {
  return (
    exception instanceof Error &&
    exception.name === 'ValidationError' &&
    typeof (exception as any).errors === 'object'
  );
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
    } else if (isMongooseValidationError(exception)) {
      // Mongoose speaks in schema paths: "Coupon validation failed: percentOff: Path
      // `percentOff` (0) is less than minimum allowed value (1)." That is a message for
      // whoever wrote the schema, not for the person filling in a form, and it names
      // internal fields. Report which fields were rejected and log the detail.
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'VALIDATION_ERROR';
      const fields = Object.keys(exception.errors ?? {});
      errorMessage =
        fields.length > 0
          ? `Some values were not accepted: ${fields.join(', ')}. Check them and try again.`
          : 'Some values were not accepted. Check them and try again.';
      this.logger.warn(
        `Mongoose validation error [${correlationId}]: ${(exception as Error).message}`,
      );
    } else if (exception instanceof Error) {
      const isProduction = process.env.NODE_ENV === 'production';
      errorMessage = isProduction
        ? 'An unexpected internal error occurred. Please try again later.'
        : exception.message;
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
