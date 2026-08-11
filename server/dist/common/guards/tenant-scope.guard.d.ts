import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class TenantScopeGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
