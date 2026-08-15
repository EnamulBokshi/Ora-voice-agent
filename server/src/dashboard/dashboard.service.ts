import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import {
  Conversation,
  ConversationDocument,
  ConversationStatus,
  ConversationChannel,
} from '../conversations/schemas/conversation.schema';
import { Subscription, SubscriptionDocument } from '../billing/schemas/subscription.schema';
import { Event, EventDocument, EventType } from '../events/schemas/event.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
  ) {}

  private calculateTrend(current: number, previous: number): string {
    if (previous === 0) {
      return current > 0 ? '+100%' : '0%';
    }
    const diff = ((current - previous) / previous) * 100;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  }

  async getStats(businessId: string) {
    const businessObjId = Types.ObjectId.isValid(businessId)
      ? new Types.ObjectId(businessId)
      : (businessId as any);

    const query = { businessId: businessObjId };

    const now = new Date();
    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last28DaysStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const [
      productTotal,
      orderTotal,
      conversationTotal,
      activeChats,
      activeVoiceCalls,
      subscription,
      recentOrders,
      recentConversations,
      totalRevenueAgg,
      curr7DaysOrderAgg,
      prev7DaysOrderAgg,
      curr7DaysConvCount,
      prev7DaysConvCount,
      dailyRevenueAgg,
      eventRecommendationsCount,
      eventCartUpdatedCount,
      completedOrdersCount,
    ] = await Promise.all([
      // 1. Total products
      this.productModel.countDocuments(query),
      // 2. Total orders
      this.orderModel.countDocuments(query),
      // 3. Total conversations
      this.conversationModel.countDocuments(query),
      // 4. Active chat sessions
      this.conversationModel.countDocuments({
        ...query,
        status: ConversationStatus.ACTIVE,
        channel: ConversationChannel.WIDGET_CHAT,
      }),
      // 5. Active voice calls
      this.conversationModel.countDocuments({
        ...query,
        status: ConversationStatus.ACTIVE,
        channel: ConversationChannel.WIDGET_VOICE,
      }),
      // 6. Subscription
      this.subscriptionModel.findOne(query).exec(),
      // 7. Recent 5 orders
      this.orderModel.find(query).sort({ createdAt: -1 }).limit(5).exec(),
      // 8. Recent 5 conversations
      this.conversationModel.find(query).sort({ createdAt: -1 }).limit(5).exec(),
      // 9. Total Influenced Revenue (all non-canceled orders)
      this.orderModel.aggregate([
        {
          $match: {
            businessId: businessObjId,
            status: { $ne: OrderStatus.CANCELED },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
          },
        },
      ]),
      // 10. Current 7-day revenue & orders
      this.orderModel.aggregate([
        {
          $match: {
            businessId: businessObjId,
            status: { $ne: OrderStatus.CANCELED },
            createdAt: { $gte: last7DaysStart, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // 11. Previous 7-day revenue & orders
      this.orderModel.aggregate([
        {
          $match: {
            businessId: businessObjId,
            status: { $ne: OrderStatus.CANCELED },
            createdAt: { $gte: prev7DaysStart, $lt: last7DaysStart },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // 12. Current 7-day conversations count
      this.conversationModel.countDocuments({
        businessId: businessObjId,
        createdAt: { $gte: last7DaysStart, $lte: now },
      }),
      // 13. Previous 7-day conversations count
      this.conversationModel.countDocuments({
        businessId: businessObjId,
        createdAt: { $gte: prev7DaysStart, $lt: last7DaysStart },
      }),
      // 14. Daily revenue in last 28 days for timeseries chart
      this.orderModel.aggregate([
        {
          $match: {
            businessId: businessObjId,
            status: { $ne: OrderStatus.CANCELED },
            createdAt: { $gte: last28DaysStart, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      // 15. Funnel - Products Recommended
      this.eventModel.countDocuments({
        businessId: businessObjId,
        eventType: EventType.PRODUCT_RECOMMENDED,
      }),
      // 16. Funnel - Cart Updates
      this.eventModel.countDocuments({
        businessId: businessObjId,
        eventType: EventType.CART_UPDATED,
      }),
      // 17. Funnel - Completed Orders
      this.orderModel.countDocuments({
        businessId: businessObjId,
        status: {
          $in: [
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ],
        },
      }),
    ]);

    // Trends computation
    const curr7DayRev = curr7DaysOrderAgg[0]?.total || 0;
    const prev7DayRev = prev7DaysOrderAgg[0]?.total || 0;
    const revenueTrend = this.calculateTrend(curr7DayRev, prev7DayRev);

    const curr7DayOrders = curr7DaysOrderAgg[0]?.count || 0;
    const prev7DayOrders = prev7DaysOrderAgg[0]?.count || 0;
    const ordersTrend = this.calculateTrend(curr7DayOrders, prev7DayOrders);

    const conversationsTrend = this.calculateTrend(curr7DaysConvCount, prev7DaysConvCount);

    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Daily & Weekly timeseries processing
    const dailyMap = new Map<string, number>();
    for (const entry of dailyRevenueAgg) {
      dailyMap.set(entry._id, entry.revenue || 0);
    }

    const dailySeries: Array<{ label: string; date: string; value: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailySeries.push({
        label,
        date: dateKey,
        value: dailyMap.get(dateKey) ?? 0,
      });
    }

    const weeklySeries: Array<{ label: string; value: number }> = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      let weekSum = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart.getTime() + d * 24 * 60 * 60 * 1000);
        const key = day.toISOString().slice(0, 10);
        weekSum += dailyMap.get(key) ?? 0;
      }
      const weekIndex = 4 - w;
      weeklySeries.push({
        label: `Week ${weekIndex}`,
        value: weekSum,
      });
    }

    // Sales Funnel processing
    const inquiriesCount = conversationTotal;
    const recommendationsCount = eventRecommendationsCount;
    const cartCount = eventCartUpdatedCount;
    const ordersCount = completedOrdersCount > 0 ? completedOrdersCount : orderTotal;

    const funnel = [
      {
        label: 'Shopper Inquiries',
        count: inquiriesCount,
        pct: 100,
      },
      {
        label: 'Products Recommended',
        count: recommendationsCount,
        pct: inquiriesCount > 0
          ? Math.min(100, Math.round((recommendationsCount / inquiriesCount) * 1000) / 10)
          : 0,
      },
      {
        label: 'Items Added to Cart',
        count: cartCount,
        pct: inquiriesCount > 0
          ? Math.min(100, Math.round((cartCount / inquiriesCount) * 1000) / 10)
          : 0,
      },
      {
        label: 'Orders Completed',
        count: ordersCount,
        pct: inquiriesCount > 0
          ? Math.min(100, Math.round((ordersCount / inquiriesCount) * 1000) / 10)
          : 0,
        isLast: true,
      },
    ];

    const overallConversion = inquiriesCount > 0
      ? Math.min(100, Math.round((ordersCount / inquiriesCount) * 1000) / 10)
      : 0;

    return {
      productTotal,
      orderTotal,
      conversationTotal,
      activeChats,
      activeVoiceCalls,
      totalRevenue,
      revenueTrend,
      ordersTrend,
      conversationsTrend,
      planName: subscription?.planId ?? 'Growth',
      planStatus: subscription?.status ?? 'active',
      revenueTimeseries: {
        daily: dailySeries,
        weekly: weeklySeries,
        growthRate: revenueTrend,
        totalRevenue,
      },
      funnel,
      overallConversion,
      recentOrders,
      recentConversations,
    };
  }

  async getRevenueAnalytics(businessId: string) {
    const stats = await this.getStats(businessId);
    return stats.revenueTimeseries;
  }

  async getFunnelAnalytics(businessId: string) {
    const stats = await this.getStats(businessId);
    return {
      funnel: stats.funnel,
      overallConversion: stats.overallConversion,
    };
  }
}

