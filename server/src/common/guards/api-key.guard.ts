import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { DomainException } from '../exceptions/domain.exception';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const publishableKey =
      request.headers['x-publishable-key'] ||
      request.query['publishableKey'] ||
      request.body?.publishableKey;

    if (!publishableKey) {
      throw new DomainException(
        'MISSING_PUBLISHABLE_KEY',
        'X-Publishable-Key header or publishableKey query parameter is required for widget requests.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const business = await this.businessModel
      .findOne({ publishableKey })
      .exec();

    if (!business) {
      throw new DomainException(
        'INVALID_PUBLISHABLE_KEY',
        'Invalid publishable widget key.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Attach resolved tenant business context
    request.business = business;
    request.businessId = business._id.toString();

    return true;
  }
}
