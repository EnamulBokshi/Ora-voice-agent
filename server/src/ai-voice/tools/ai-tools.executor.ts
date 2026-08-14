import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/schemas/event.schema';
import { OrdersService } from '../../orders/orders.service';
import { OrderSource } from '../../orders/schemas/order.schema';
import { AgentConfigService } from '../../agent-config/agent-config.service';

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
    private readonly agentConfigService: AgentConfigService,
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
    // 1. Semantic RAG search for shortlist of candidate product IDs (Gap A+B aware)
    const ragRes = await this.ragService.searchCombined(businessId, args.query, {
      limit: 5,
    });

    // 2. Fetch sales playbook for this tenant — needed for mentionLowStockUrgency (Fix 5)
    let mentionLowStockUrgency = false;
    try {
      const agentCfg = await this.agentConfigService.getConfig(businessId);
      mentionLowStockUrgency = agentCfg?.playbook?.mentionLowStockUrgency ?? false;
    } catch {
      // Non-fatal: proceed without urgency hints
    }

    // 3. Batch live-verify price and stock for each candidate in parallel
    const verifyPromises = ragRes.products.map(async (prod) => {
      const targetId =
        (prod as any).entityId ||
        (prod as any).id ||
        (prod as any)._id ||
        ((prod as any).data && (prod as any).data._id);
      if (!targetId) return null;

      try {
        const live = await this.productsService.verifyLive(businessId, targetId.toString());
        if (live) {
          const entry: Record<string, any> = {
            id: live._id.toString(),
            name: live.name,
            price: live.price,
            currency: live.currency,
            availability: live.availability,
            stockQuantity: live.stockQuantity,
            category: live.category,
            sourceTier: live.sourceTier,
            confidenceScore: live.confidenceScore,
            isLowStock: (live as any).isLowStock ?? false,
          };

          if (mentionLowStockUrgency && (live as any).isLowStock) {
            entry.urgencyHint = `Only ${live.stockQuantity} left in stock — selling fast!`;
          }

          return entry;
        }
      } catch {
        // Product may have been live-found via Gap B but not yet in Mongo — skip
      }
      return null;
    });

    const verifiedResults = await Promise.all(verifyPromises);
    const liveVerifiedProducts = verifiedResults.filter(Boolean) as Record<string, any>[];

    // 4. If RAG returned Gap B live results (not in Mongo yet), surface them directly
    //    They're already live-verified (sourced fresh from the platform)
    if (liveVerifiedProducts.length === 0 && ragRes.products.length > 0) {
      for (const prod of ragRes.products) {
        const raw = (prod as any).data || prod;
        if (!raw || !raw.name) continue;
        const entry: Record<string, any> = {
          id: raw.nativeProductId || raw.entityId || 'live',
          name: raw.name,
          price: raw.price || 0,
          currency: raw.currency || 'USD',
          availability: raw.availability,
          stockQuantity: raw.stockQuantity || 0,
          category: raw.category,
          sourceTier: raw.sourceTier,
          confidenceScore: raw.confidenceScore || 0.7,
          isLowStock: false,
        };
        liveVerifiedProducts.push(entry);
      }
    }

    if (liveVerifiedProducts.length === 0) {
      return {
        success: true,
        query: args.query,
        products: [],
        totalFound: 0,
        message:
          'No products found matching this query. The merchant catalog may be empty or does not contain items matching these search terms. Do NOT retry the same search. Tell the customer you could not find matching products.',
        fallbackTriggered: ragRes.fallbackTriggered,
        fallbackTier: ragRes.fallbackTier,
      };
    }

    return {
      success: true,
      query: args.query,
      products: liveVerifiedProducts,
      totalFound: liveVerifiedProducts.length,
      message: `Found ${liveVerifiedProducts.length} product(s) matching "${args.query}".`,
      fallbackTriggered: ragRes.fallbackTriggered,
      fallbackTier: ragRes.fallbackTier,
    };
  }

  private async handleGetProductDetails(businessId: string, args: Record<string, any>) {
    // Use verifyLive so isLowStock is always included
    const product = await this.productsService.verifyLive(businessId, args.productId);
    return {
      success: true,
      product: {
        id: product._id.toString(),
        name: product.name,
        description: (product as any).description,
        price: product.price,
        currency: product.currency,
        availability: product.availability,
        stockQuantity: product.stockQuantity,
        category: product.category,
        images: product.images,
        isLowStock: (product as any).isLowStock ?? false,
      },
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
      isLowStock: (product as any).isLowStock ?? false,
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
      source: OrderSource.ORA_AGENT,
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
    const query = (args && args.query) ? String(args.query) : 'store policy return refund shipping';
    const res = await this.ragService.searchKnowledge(businessId, query, {
      limit: 5,
    });

    const policySnippets = res.results.map((r) => r.text).join('\n\n');
    return {
      success: true,
      query,
      foundPolicies: res.results.length,
      policyDetails: policySnippets || 'Standard store policy: 14-day return in original condition.',
      policies: res.results,
    };
  }
}
