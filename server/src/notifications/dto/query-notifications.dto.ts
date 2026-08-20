import { IsOptional, IsEnum, IsBooleanString, IsNumberString } from 'class-validator';
import { NotificationCategory } from '../schemas/notification.schema';

export class QueryNotificationsDto {
  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  @IsBooleanString()
  @IsOptional()
  unreadOnly?: string;

  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;
}
