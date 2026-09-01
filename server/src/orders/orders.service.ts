import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus, OrderSource } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { EventsService } from '../events/events.service';
import { EventType } from '../events/schemas/event.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationCategory, NotificationSeverity } from '../notifications/schemas/notification.schema';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(businessId: string, dto: CreateOrderDto): Promise<OrderDocument> {
    const currentYear = new Date().getFullYear();
    const count = await this.orderModel.countDocuments({
      businessId: businessId as any,
    });
    const formattedSeq = String(count + 1).padStart(6, '0');
    const orderNumber = `ORD-${currentYear}-${formattedSeq}`;

    const order = new this.orderModel({
      businessId: businessId as any,
      orderNumber,
      customerId: dto.customerId ? (dto.customerId as any) : undefined,
      items: dto.items,
      totalAmount: dto.totalAmount,
      currency: dto.currency || 'USD',
      status: OrderStatus.PENDING,
      source: dto.source || OrderSource.ORA_AGENT,
      shippingAddress: dto.shippingAddress || {},
      metadata: dto.metadata || {},
    });

    const saved = await order.save();

    // Log ORDER_PLACED event
    await this.eventsService.logEvent(businessId, EventType.ORDER_PLACED, {
      orderId: saved._id.toString(),
      orderNumber: saved.orderNumber,
      totalAmount: saved.totalAmount,
      itemCount: saved.items.length,
    });

    // Create a merchant notification
    await this.notificationsService
      .create(businessId, {
        title: `New Order Placed: ${orderNumber}`,
        message: `Shopper completed an order for ${saved.items.length} item(s) (${saved.currency} ${saved.totalAmount.toFixed(2)}).`,
        category: NotificationCategory.SALES,
        severity: NotificationSeverity.SUCCESS,
        metadata: {
          orderId: saved._id.toString(),
          orderNumber: saved.orderNumber,
          totalAmount: saved.totalAmount,
        },
      })
      .catch((err) => {
        this.logger.warn(`Failed to create order notification: ${err.message}`);
      });

    this.logger.log(
      `[OrdersService] Order ${orderNumber} created for business ${businessId}`,
    );

    return saved;
  }

  async findAll(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { businessId: businessId as any };

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(businessId: string, id: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!order) {
      throw new DomainException(
        'ORDER_NOT_FOUND',
        `Order with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return order;
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateOrderDto,
  ): Promise<OrderDocument> {
    const updatePayload: any = {};
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.shippingAddress !== undefined) updatePayload.shippingAddress = dto.shippingAddress;
    if (dto.metadata !== undefined) updatePayload.metadata = dto.metadata;

    const order = await this.orderModel
      .findOneAndUpdate(
        {
          _id: id as any,
          businessId: businessId as any,
        },
        { $set: updatePayload },
        { returnDocument: 'after' },
      )
      .exec();

    if (!order) {
      throw new DomainException(
        'ORDER_NOT_FOUND',
        `Order with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return order;
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: OrderStatus,
  ): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOneAndUpdate(
        {
          _id: id as any,
          businessId: businessId as any,
        },
        { $set: { status } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!order) {
      throw new DomainException(
        'ORDER_NOT_FOUND',
        `Order with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return order;
  }
}
