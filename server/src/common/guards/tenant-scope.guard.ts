import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayloadUser } from '../decorators/current-user.decorator';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayloadUser;

    if (!user || !user.businessId) {
      throw new ForbiddenException('Tenant scope violation: Missing businessId in authentication context.');
    }

    // Attach businessId directly to request object for easy query filtering in controllers/services
    request.businessId = user.businessId;

    return true;
  }
}
