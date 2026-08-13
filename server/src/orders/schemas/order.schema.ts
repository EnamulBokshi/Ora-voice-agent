import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { Customer } from '../../customers/schemas/customer.schema';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

export enum OrderSource {
  ORA_AGENT = 'ora_agent',
  MERCHANT_PLATFORM = 'merchant_platform',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  unitPrice: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  orderNumber: string; // Sequential: ORD-2026-000100

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Customer.name,
    index: true,
  })
  customerId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    index: true,
  })
  status: OrderStatus;

  @Prop({
    type: String,
    enum: Object.values(OrderSource),
    default: OrderSource.ORA_AGENT,
    index: true,
  })
  source: OrderSource;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  shippingAddress: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ businessId: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, source: 1 });
