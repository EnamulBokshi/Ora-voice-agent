import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/schemas/event.schema';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class AiToolsExecutor {
  private readonly logger = new Logger(AiToolsExecutor.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly ragService: RagService,
    private readonly knowledgeService: KnowledgeService,
    private readonly redisService: RedisService,
    private readonly eventsService: EventsService,
    private readonly ordersService: OrdersService,
  ) {}

  async executeTool(
    businessId: string,
    sessionId: string,
    toolName: string,
    args: Record<string, any>,
  ): Promise<Record<string, any>> {
    this.logger.log(
      `[AiToolsExecutor] Executing tool '${toolName}' for business ${businessId} (sessionId: ${sessionId})`,
    );

    try {
      switch (toolName) {
        case 'find_products':
        case 'search_products':
          return await this.handleFindProducts(businessId, args);
        case 'get_product_details':
          return await this.handleGetProductDetails(businessId, args);
        case 'check_inventory':
          return await this.handleCheckInventory(businessId, args);
        case 'add_to_cart':
          return await this.handleAddToCart(businessId, sessionId, args);
        case 'place_order':
          return await this.handlePlaceOrder(businessId, sessionId, args);
        case 'redirect_to_checkout':
          return await this.handleRedirectToCheckout(businessId, sessionId);
        case 'get_store_policy':
          return await this.handleGetStorePolicy(businessId, args);
        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (err: any) {
      this.logger.error(
        `[AiToolsExecutor] Error executing tool ${toolName}: ${err.message}`,
      );
      return { error: err.message };
    }
  }

  private async handleFindProducts(businessId: string, args: Record<string, any>) {
    // 1. Semantic RAG search for shortlist of candidate product IDs
    const ragRes = await this.ragService.searchCombined(businessId, args.query, {
      limit: 5,
    });

    // 2. Batch live verify price and stock availability for candidates
    const liveVerifiedProducts: any[] = [];
    for (const prod of ragRes.products) {
      const targetId =
        (prod as any).entityId ||
        (prod as any).id ||
        (prod as any)._id ||
        ((prod as any).data && (prod as any).data._id);
      if (!targetId) continue;
      const live = await this.productsService.verifyLive(businessId, targetId.toString());
      if (live) {
        liveVerifiedProducts.push({
          id: live._id.toString(),
          name: live.name,
          price: live.price,
          currency: live.currency,
          availability: live.availability,
          stockQuantity: live.stockQuantity,
          category: live.category,
          sourceTier: live.sourceTier,
          confidenceScore: live.confidenceScore,
        });
      }
    }

    return {
      success: true,
      query: args.query,
      products: liveVerifiedProducts,
      fallbackTriggered: ragRes.fallbackTriggered,
    };
  }

  private async handleGetProductDetails(businessId: string, args: Record<string, any>) {
    const product = await this.productsService.findOne(businessId, args.productId);
    return {
      success: true,
      product,
    };
  }

  private async handleCheckInventory(businessId: string, args: Record<string, any>) {
    const product = await this.productsService.verifyLive(businessId, args.productId);
    return {
      success: true,
      productId: product._id.toString(),
      name: product.name,
      stockQuantity: product.stockQuantity || 0,
      availability: product.availability,
      price: product.price,
    };
  }

  private async handleAddToCart(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    const product = await this.productsService.verifyLive(businessId, args.productId);
    const quantity = args.quantity || 1;

    const redisKey = `cart:conv:${sessionId}`;
    const rawCart = await this.redisService.getClient().get(redisKey);
    const cart = rawCart ? JSON.parse(rawCart) : { items: [] };

    cart.items.push({
      productId: product._id.toString(),
      name: product.name,
      price: product.price,
      quantity,
    });

    await this.redisService
      .getClient()
      .set(redisKey, JSON.stringify(cart), 'EX', 24 * 60 * 60);

    // Log CART_UPDATED event
    await this.eventsService.logEvent(businessId, EventType.CART_UPDATED, {
      sessionId,
      productId: product._id.toString(),
      quantity,
    });

    return {
      success: true,
      message: `Added ${quantity} x ${product.name} to cart.`,
      cart,
    };
  }

  private async handlePlaceOrder(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    const redisKey = `cart:conv:${sessionId}`;
    const rawCart = await this.redisService.getClient().get(redisKey);
    const cart = rawCart ? JSON.parse(rawCart) : { items: [] };

    if (!cart.items || cart.items.length === 0) {
      return {
        success: false,
        message: 'Cart is empty. Add products to cart before placing an order.',
      };
    }

    const totalAmount = cart.items.reduce(
      (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1),
      0,
    );

    const order = await this.ordersService.create(businessId, {
      items: cart.items,
      totalAmount,
      currency: 'USD',
      shippingAddress: args.shippingAddress
        ? { addressLine1: args.shippingAddress }
        : {},
      metadata: { sessionId, placedVia: 'voice_agent' },
    });

    // Clear cart in Redis after order completion
    await this.redisService.getClient().del(redisKey);

    return {
      success: true,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      message: `Order ${order.orderNumber} placed successfully!`,
    };
  }

  private async handleRedirectToCheckout(businessId: string, sessionId: string) {
    return {
      success: true,
      checkoutUrl: `http://localhost:3000/checkout?sessionId=${sessionId}&biz=${businessId}`,
      message: 'Redirecting customer to storefront checkout page.',
    };
  }

  private async handleGetStorePolicy(businessId: string, args: Record<string, any>) {
    const res = await this.ragService.searchKnowledge(businessId, args.query, {
      limit: 3,
    });
    return {
      success: true,
      policies: res.results,
    };
  }
}
