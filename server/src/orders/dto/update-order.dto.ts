import { IsOptional, IsEnum, IsObject } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsObject()
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
