import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export interface SuccessEnvelope<T> {
    success: true;
    data: T;
}
export declare class TransformInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessEnvelope<T>>;
}
