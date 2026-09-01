import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationCategory,
  NotificationSeverity,
} from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    businessId: string,
    dto: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const notification = new this.notificationModel({
      businessId: businessObjId,
      title: dto.title,
      message: dto.message,
      category: dto.category || NotificationCategory.SYSTEM,
      severity: dto.severity || NotificationSeverity.INFO,
      read: false,
      metadata: dto.metadata || {},
    });

    const saved = await notification.save();
    this.logger.log(
      `[NotificationsService] Notification '${dto.title}' created for business ${businessId}`,
    );
    return saved;
  }

  async findAll(businessId: string, query: QueryNotificationsDto) {
    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const filter: any = { businessId: businessObjId };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.unreadOnly === 'true') {
      filter.read = false;
    }

    const [items, total, unreadCount, salesCount, syncCount, systemCount] =
      await Promise.all([
        this.notificationModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.notificationModel.countDocuments(filter).exec(),
        this.notificationModel.countDocuments({
          businessId: businessObjId,
          read: false,
        }),
        this.notificationModel.countDocuments({
          businessId: businessObjId,
          category: NotificationCategory.SALES,
        }),
        this.notificationModel.countDocuments({
          businessId: businessObjId,
          category: NotificationCategory.SYNC,
        }),
        this.notificationModel.countDocuments({
          businessId: businessObjId,
          category: NotificationCategory.SYSTEM,
        }),
      ]);

    return {
      items,
      counts: {
        total,
        unread: unreadCount,
        sales: salesCount,
        sync: syncCount,
        system: systemCount,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(businessId: string): Promise<{ unreadCount: number }> {
    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const unreadCount = await this.notificationModel.countDocuments({
      businessId: businessObjId,
      read: false,
    });

    return { unreadCount };
  }

  async markAsRead(businessId: string, id: string): Promise<NotificationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new DomainException(
        'NOTIFICATION_NOT_FOUND',
        `Notification '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), businessId: businessObjId },
        { $set: { read: true } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!notification) {
      throw new DomainException(
        'NOTIFICATION_NOT_FOUND',
        `Notification '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return notification;
  }

  async markAllAsRead(businessId: string): Promise<{ modifiedCount: number }> {
    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const result = await this.notificationModel
      .updateMany(
        { businessId: businessObjId, read: false },
        { $set: { read: true } },
      )
      .exec();

    return { modifiedCount: result.modifiedCount };
  }

  async remove(businessId: string, id: string): Promise<{ deleted: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new DomainException(
        'NOTIFICATION_NOT_FOUND',
        `Notification '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const result = await this.notificationModel
      .deleteOne({ _id: new Types.ObjectId(id), businessId: businessObjId })
      .exec();

    if (result.deletedCount === 0) {
      throw new DomainException(
        'NOTIFICATION_NOT_FOUND',
        `Notification '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return { deleted: true };
  }

  async seedInitialForBusiness(businessId: string): Promise<void> {
    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const seeds = [
      {
        businessId: businessObjId,
        title: 'New Assisted Sale Completed',
        message: 'ORA assisted a shopper in purchasing 2 items ($184.00 total). Converted via live chat.',
        category: NotificationCategory.SALES,
        severity: NotificationSeverity.SUCCESS,
        read: false,
        metadata: { amount: 184, channel: 'chat' },
      },
      {
        businessId: businessObjId,
        title: 'Catalog Vector Index Synchronized',
        message: 'Store product catalog and knowledge documents have been re-indexed and embedded.',
        category: NotificationCategory.SYNC,
        severity: NotificationSeverity.INFO,
        read: false,
        metadata: { itemsIndexed: 24 },
      },
      {
        businessId: businessObjId,
        title: 'Voice Call Session Completed',
        message: 'Shopper finished a 2m 14s voice interaction inquiring about product specifications.',
        category: NotificationCategory.SALES,
        severity: NotificationSeverity.INFO,
        read: true,
        metadata: { duration: '02:14' },
      },
      {
        businessId: businessObjId,
        title: 'Storefront Widget Connected',
        message: 'Your publishable key is active and streaming live shopper telemetry to Live Desk.',
        category: NotificationCategory.SYSTEM,
        severity: NotificationSeverity.SUCCESS,
        read: true,
      },
      {
        businessId: businessObjId,
        title: 'Monthly Usage Alert',
        message: 'You have utilized 68% of your plan voice minutes for this billing cycle.',
        category: NotificationCategory.SYSTEM,
        severity: NotificationSeverity.WARNING,
        read: false,
        metadata: { percentUsed: 68 },
      },
    ];

    await this.notificationModel.insertMany(seeds);
  }
}
