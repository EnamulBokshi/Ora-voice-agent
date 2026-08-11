import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/schemas/event.schema';

@Injectable()
export class AiToolsExecutor {
  private readonly logger = new Logger(AiToolsExecutor.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly ragService: RagService,
    private readonly knowledgeService: KnowledgeService,
    private readonly redisService: RedisService,
    private readonly eventsService: EventsService,
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
        case 'search_products':
          return await this.handleSearchProducts(businessId, args);
        case 'get_product_details':
          return await this.handleGetProductDetails(businessId, args);
        case 'check_inventory':
          return await this.handleCheckInventory(businessId, args);
        case 'add_to_cart':
          return await this.handleAddToCart(businessId, sessionId, args);
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

  private async handleSearchProducts(businessId: string, args: Record<string, any>) {
    const ragRes = await this.ragService.searchCombined(businessId, args.query, {
      limit: 5,
    });

    return {
      success: true,
      query: args.query,
      products: ragRes.products,
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
    const product = await this.productsService.findOne(businessId, args.productId);
    return {
      success: true,
      productId: product._id.toString(),
      name: product.name,
      stockQuantity: product.stockQuantity || 0,
      availability: product.availability,
    };
  }

  private async handleAddToCart(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    const product = await this.productsService.findOne(businessId, args.productId);
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
