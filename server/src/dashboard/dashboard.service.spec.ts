import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { Product } from '../products/schemas/product.schema';
import { Order } from '../orders/schemas/order.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { Subscription } from '../billing/schemas/subscription.schema';
import { Event } from '../events/schemas/event.schema';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockProductModel = {
    countDocuments: jest.fn().mockResolvedValue(10),
  };

  const mockOrderModel = {
    countDocuments: jest.fn().mockResolvedValue(25),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    aggregate: jest.fn().mockResolvedValue([{ total: 5400, count: 12 }]),
  };

  const mockConversationModel = {
    countDocuments: jest.fn().mockResolvedValue(40),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  };

  const mockSubscriptionModel = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ planId: 'Scale', status: 'active' }),
    }),
  };

  const mockEventModel = {
    countDocuments: jest.fn().mockResolvedValue(15),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Conversation.name), useValue: mockConversationModel },
        { provide: getModelToken(Subscription.name), useValue: mockSubscriptionModel },
        { provide: getModelToken(Event.name), useValue: mockEventModel },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should aggregate dynamic dashboard statistics', async () => {
    const stats = await service.getStats('60c72b2f9b1d8b001c8e4d2a');

    expect(stats).toBeDefined();
    expect(stats.productTotal).toBe(10);
    expect(stats.orderTotal).toBe(25);
    expect(stats.conversationTotal).toBe(40);
    expect(stats.planName).toBe('Scale');
    expect(stats.planStatus).toBe('active');
    expect(stats.revenueTimeseries.daily).toHaveLength(7);
    expect(stats.revenueTimeseries.weekly).toHaveLength(4);
    expect(stats.funnel).toHaveLength(4);
    expect(stats.totalRevenue).toBe(5400);
  });
});
