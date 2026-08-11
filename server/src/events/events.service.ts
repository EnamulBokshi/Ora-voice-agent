import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument, EventType } from './schemas/event.schema';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
  ) {}

  async logEvent(
    businessId: string,
    eventType: EventType,
    payload: Record<string, any> = {},
    correlationId?: string,
  ): Promise<EventDocument> {
    const event = new this.eventModel({
      businessId: businessId as any,
      eventType,
      payload,
      correlationId,
      timestamp: new Date(),
    });

    const saved = await event.save();
    this.logger.log(
      `[EventsService] Event logged: ${eventType} for business ${businessId}`,
    );
    return saved;
  }

  async findByBusiness(businessId: string, eventType?: EventType, limit = 50) {
    const filter: Record<string, any> = { businessId: businessId as any };
    if (eventType) filter.eventType = eventType;

    return this.eventModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}
