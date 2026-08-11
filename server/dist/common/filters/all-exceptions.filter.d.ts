import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export interface ErrorEnvelope {
    success: false;
    error: {
        code: string;
        message: string;
        correlationId: string;
    };
}
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
}
