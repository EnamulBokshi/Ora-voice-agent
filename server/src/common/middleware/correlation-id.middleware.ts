import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existingHeader = req.headers['x-correlation-id'];
    const correlationId = Array.isArray(existingHeader)
      ? existingHeader[0]
      : existingHeader || `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    (req as any).correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}
