import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { Subscription, SubscriptionDocument } from '../billing/schemas/subscription.schema';

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
  ) {}

  async getStats(businessId: string) {
    const query = { businessId: businessId as any };
    const [
      productTotal,
      orderTotal,
      conversationTotal,
      subscription,
      recentOrders,
      recentConversations,
    ] = await Promise.all([
      this.productModel.countDocuments(query),
      this.orderModel.countDocuments(query),
      this.conversationModel.countDocuments(query),
      this.subscriptionModel.findOne(query).exec(),
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
      this.conversationModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
    ]);

    return {
      productTotal,
      orderTotal,
      conversationTotal,
      planName: subscription?.planId ?? 'Free',
      planStatus: subscription?.status ?? 'active',
      recentOrders,
      recentConversations,
    };
  }
}
