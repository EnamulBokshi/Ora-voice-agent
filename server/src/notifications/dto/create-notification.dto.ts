import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { NotificationCategory, NotificationSeverity } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  @IsEnum(NotificationSeverity)
  @IsOptional()
  severity?: NotificationSeverity;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
