import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/schemas/event.schema';
import { OrdersService } from '../../orders/orders.service';
import { OrderSource } from '../../orders/schemas/order.schema';
import { AgentConfigService } from '../../agent-config/agent-config.service';
import { CustomersService } from '../../customers/customers.service';
import { BillingService } from '../../billing/billing.service';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';

/** How long a tenant's platform flag is trusted without re-reading Mongo. */
const PLATFORM_FLAG_TTL_MS = 5 * 60 * 1000;

/** How long a tenant's low-stock-urgency playbook flag is trusted without re-reading Mongo. */
const URGENCY_FLAG_TTL_MS = 5 * 60 * 1000;

/** How long a tenant's Shopify-connected flag is trusted without re-reading Mongo. */
const SHOPIFY_FLAG_TTL_MS = 5 * 60 * 1000;

/**
 * How many variants a tool payload may carry.
 *
 * A size-by-colour matrix runs to dozens of variants, and every one of them is text the
 * model has to read before it can speak. Nobody chooses from forty options out loud, so
 * the list is cut to what an agent can reasonably offer and the rest is a count.
 */
const MAX_VARIANTS_IN_PAYLOAD = 10;


@Injectable()
export class AiToolsExecutor {
  private readonly logger = new Logger(AiToolsExecutor.name);

  /**
   * Whether a tenant is ORA's own platform tenant. Cached because
   * navigate_to_page needs it on every call and it is effectively immutable:
   * a Mongo round trip here sits directly between the visitor asking for a
   * page and the page actually moving.
   */
  private readonly platformFlagCache = new Map<
    string,
    { isPlatform: boolean; expiresAt: number }
  >();

  /**
   * Whether a tenant's sales playbook asks for low-stock urgency hints.
   *
   * Cached for the same reason as the platform flag, and more urgently: reading it went
   * through AgentConfigService.getConfig(), which issues three Mongo findOne calls (agent
   * config, voice settings, playbook) and creates any that are missing. find_products
   * awaited all of that, in series between the catalog search and the stock check, to
   * read one boolean.
   */
  private readonly urgencyFlagCache = new Map<
    string,
    { mentionLowStockUrgency: boolean; expiresAt: number }
  >();

  /**
   * Whether a tenant sells through a Shopify storefront.
   *
   * This decides who owns the cart. A Shopify store already has one — in the shopper's
   * session cookie, the one its own checkout reads — so ORA must feed that cart rather
   * than keep a second, orderable cart of its own. Two carts means the same item can be
   * bought twice: once through ORA's Order collection, once through Shopify checkout,
   * with neither side aware of the other.
   */
  private readonly shopifyTenantCache = new Map<
    string,
    { isShopify: boolean; expiresAt: number }
  >();

  constructor(
    private readonly productsService: ProductsService,
    private readonly ragService: RagService,
    private readonly knowledgeService: KnowledgeService,
    private readonly redisService: RedisService,
    private readonly eventsService: EventsService,
    private readonly ordersService: OrdersService,
    private readonly agentConfigService: AgentConfigService,
    @Optional()
    private readonly customersService?: CustomersService,
    @Optional()
    private readonly billingService?: BillingService,
    @Optional()
    private readonly configService?: ConfigService,
    @Optional()
    @InjectModel(Business.name)
    private readonly businessModel?: Model<BusinessDocument>,
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
        case 'get_pricing_plans':
        case 'get_plans':
          return await this.handleGetPricingPlans(businessId, args);
        case 'navigate_to_page':
        case 'navigate':
          return await this.handleNavigateToPage(businessId, sessionId, args);
        case 'capture_sales_lead':
        case 'save_lead':
          return await this.handleCaptureSalesLead(businessId, sessionId, args);
        case 'get_integration_guide':
        case 'how_to_setup':
          return await this.handleGetIntegrationGuide(businessId, args);
        case 'search_knowledge_base':
        case 'get_business_info':
        case 'get_store_policy':
          return await this.handleSearchKnowledge(businessId, args);
        case 'update_customer_profile':
        case 'save_customer_name':
          return await this.handleUpdateCustomerProfile(businessId, sessionId, args);
        case 'get_customer_profile':
        case 'get_customer_info':
          return await this.handleGetCustomerProfile(businessId, sessionId);
        case 'update_agent_directives':
        case 'save_merchant_directives':
          return await this.handleUpdateAgentDirectives(businessId, args);
        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (err: any) {
      this.logger.error(
        `[AiToolsExecutor] Error executing tool ${toolName}: ${err.message}`,
      );
      return { error: err.message || 'Internal tool execution error.' };
    }
  }

  private async handleUpdateAgentDirectives(businessId: string, args: Record<string, any>) {
    await this.agentConfigService.updateConfig(businessId, {
      customDirectives: args.directives,
      ...(args.brandVoice ? { brandVoiceDescription: args.brandVoice } : {}),
    });
    return {
      success: true,
      message: 'Directives and instructions updated into persistent memory successfully.',
    };
  }

  private async handleFindProducts(businessId: string, args: Record<string, any>) {
    const queryText = args && args.query ? String(args.query) : '';

    // 1. Start every independent lookup at once.
    //
    //    All three used to run in series, and the customer waited for the sum: the
    //    embedding API round trip, then three Mongo reads for one playbook boolean, then
    //    the stock check. Only the stock check genuinely depends on what came before it.
    //
    //    The keyword search is the interesting one. It hits indexed Mongo fields and
    //    returns in a few milliseconds, while the semantic search cannot start until an
    //    external embedding API answers. When the shopper names a product the catalog
    //    actually stocks — which is most of the time — the keyword result is both faster
    //    and better, so we answer from it and let the semantic search finish into the
    //    RAG cache unread rather than making the shopper wait for it.
    const ragPromise = this.ragService
      .searchCombined(businessId, queryText, { limit: 5 })
      .catch((err: any) => {
        this.logger.warn(`[AiToolsExecutor] Semantic search notice: ${err.message}`);
        return {
          products: [] as any[],
          knowledge: [] as any[],
          fallbackTriggered: true,
          fallbackTier: 'none' as const,
        };
      });

    const [keywordRes, mentionLowStockUrgency] = await Promise.all([
      this.searchCatalogByKeyword(businessId, queryText),
      this.resolveUrgencyFlag(businessId),
    ]);

    // 2. Confident keyword hit — answer now, without waiting on the embedding.
    if (keywordRes.confident.length > 0) {
      const fastVerified = await this.verifyProductDocs(businessId, keywordRes.confident);
      if (fastVerified.length > 0) {
        const fastProducts = fastVerified.map((live) =>
          this.toProductEntry(live, mentionLowStockUrgency),
        );
        // Reported as its own tier rather than as a fallback: nothing failed here, the
        // semantic search was simply not worth waiting for.
        return this.buildFindProductsResult(queryText, fastProducts, false, 'keyword_fast_path');
      }
    }

    const ragRes = await ragPromise;

    // 3. Live-verify price and stock for each semantic candidate.
    //
    //    RAG has already hydrated these documents from Mongo — it has to, in order to
    //    filter them on price, category and brand — so they are reused here. Asking
    //    verifyLiveBatch for the same ids meant a second identical Mongo query per
    //    spoken question. Candidates whose document did not hydrate (a vector entry
    //    outliving its product, or a Gap B live result never written to Mongo) still
    //    fall through to the id-based path below.
    const hydratedDocs: any[] = [];
    const unhydratedIds: string[] = [];

    for (const prod of ragRes.products) {
      const raw = prod as any;
      const doc = raw.data;
      if (doc && doc._id) {
        hydratedDocs.push(doc);
        continue;
      }
      const targetId = raw.entityId || raw.id || raw._id;
      if (targetId) unhydratedIds.push(targetId.toString());
    }

    let verifiedList: any[] = [];
    try {
      if (hydratedDocs.length > 0) {
        verifiedList = await this.verifyProductDocs(businessId, hydratedDocs);
      }

      if (unhydratedIds.length > 0 && typeof this.productsService.verifyLiveBatch === 'function') {
        const byId = await this.productsService.verifyLiveBatch(businessId, unhydratedIds);
        verifiedList = verifiedList.concat(byId);
      }

      if (verifiedList.length === 0 && typeof this.productsService.verifyLive === 'function') {
        const candidateIds = hydratedDocs
          .map((doc) => doc._id.toString())
          .concat(unhydratedIds);
        const individual = await Promise.all(
          candidateIds.map((id) =>
            this.productsService.verifyLive(businessId, id).catch(() => null),
          ),
        );
        verifiedList = individual.filter(Boolean);
      }
    } catch (err: any) {
      this.logger.warn(`[AiToolsExecutor] Batch verification notice: ${err.message}`);
    }

    const liveVerifiedProducts: Record<string, any>[] = verifiedList.map((live) =>
      this.toProductEntry(live, mentionLowStockUrgency),
    );

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

    // 5. If no catalog products matched but knowledge docs matched (e.g. uploaded price list / spec doc),
    // supply the knowledge context so Gemini can answer accurately
    if (liveVerifiedProducts.length === 0 && ragRes.knowledge && ragRes.knowledge.length > 0) {
      const knowledgeContext = ragRes.knowledge.map((k) => k.text).join('\n\n');
      return {
        success: true,
        query: args.query,
        products: [],
        totalFound: 0,
        knowledgeContext,
        message: `Found matching information in store knowledge base:\n${knowledgeContext}`,
        fallbackTriggered: true,
        fallbackTier: 'knowledge_doc',
      };
    }

    // 6. Direct MongoDB catalog fallback: if vector RAG was empty, use the catalog.
    //    The keyword search in step 1 already ran this exact query — it just did not
    //    clear the bar to answer from on its own — so its results are reused rather
    //    than asking Mongo the same question a second time.
    if (liveVerifiedProducts.length === 0) {
      try {
        const directItems = keywordRes.items.length > 0
          ? keywordRes.items
          : (await this.productsService.findAll(businessId, {
              search: (args && args.query) ? String(args.query) : '',
              limit: 5,
            })).items;

        if (directItems.length > 0) {
          for (const item of directItems) {
            const entry: Record<string, any> = {
              id: item._id.toString(),
              name: item.name,
              price: item.price,
              currency: item.currency || 'BDT',
              availability: item.availability,
              stockQuantity: item.stockQuantity,
              category: item.category,
              sourceTier: item.sourceTier,
              confidenceScore: 0.9,
              isLowStock: (item as any).isLowStock ?? false,
            };

            if (mentionLowStockUrgency && (item as any).isLowStock) {
              entry.urgencyHint = `Only ${item.stockQuantity} left in stock — selling fast!`;
            }

            liveVerifiedProducts.push(entry);
          }
        }
      } catch (err: any) {
        this.logger.warn(`[AiToolsExecutor] Direct catalog fallback note: ${err.message}`);
      }
    }

    if (liveVerifiedProducts.length === 0) {
      return {
        success: true,
        query: args.query,
        products: [],
        totalFound: 0,
        message:
          'No products found matching this query in the catalog right now. Tell the customer you could not find matching products.',
        fallbackTriggered: ragRes.fallbackTriggered,
        fallbackTier: ragRes.fallbackTier,
      };
    }

    return this.buildFindProductsResult(
      args.query,
      liveVerifiedProducts,
      ragRes.fallbackTriggered,
      ragRes.fallbackTier,
    );
  }

  /** Shapes one live-verified product document into the payload Gemini receives. */
  private toProductEntry(live: any, mentionLowStockUrgency: boolean): Record<string, any> {
    const entry: Record<string, any> = {
      id: live._id ? live._id.toString() : (live.id || live.nativeProductId),
      name: live.name,
      price: live.price,
      currency: live.currency || 'USD',
      availability: live.availability,
      stockQuantity: live.stockQuantity,
      category: live.category,
      sourceTier: live.sourceTier,
      confidenceScore: live.confidenceScore || 0.9,
      isLowStock: live.isLowStock ?? false,
    };

    if (mentionLowStockUrgency && live.isLowStock) {
      entry.urgencyHint = `Only ${live.stockQuantity} left in stock — selling fast!`;
    }

    return entry;
  }

  /** The successful find_products payload, shared by the fast path and the semantic path. */
  private buildFindProductsResult(
    query: string,
    products: Record<string, any>[],
    fallbackTriggered: boolean,
    fallbackTier: string,
  ) {
    const productSummary = products
      .map(
        (p) =>
          `${p.name} at ${p.currency} ${p.price} (${p.availability}, Stock: ${p.stockQuantity}${p.urgencyHint ? ` - ${p.urgencyHint}` : ''})`,
      )
      .join('; ');

    return {
      success: true,
      query,
      products,
      totalFound: products.length,
      message: `Found ${products.length} product(s): ${productSummary}`,
      fallbackTriggered,
      fallbackTier,
    };
  }

  /**
   * Live price and stock for documents the caller already holds, without re-reading them.
   *
   * Falls back to the id-based path on a ProductsService that predates verifyLiveDocs.
   */
  private async verifyProductDocs(businessId: string, docs: any[]): Promise<any[]> {
    if (docs.length === 0) return [];
    try {
      if (typeof (this.productsService as any).verifyLiveDocs === 'function') {
        return await (this.productsService as any).verifyLiveDocs(businessId, docs);
      }
      if (typeof this.productsService.verifyLiveBatch === 'function') {
        return await this.productsService.verifyLiveBatch(
          businessId,
          docs.map((doc) => doc._id.toString()),
        );
      }
    } catch (err: any) {
      this.logger.warn(`[AiToolsExecutor] Document verification notice: ${err.message}`);
    }
    return [];
  }

  /**
   * Indexed keyword search over the catalog, returning only matches strong enough to
   * answer with directly.
   *
   * findAll() already does the hard part — it strips conversational stop words ("do you
   * have any", "what is the price of"), matches the remaining terms on word boundaries,
   * and re-ranks so title matches outrank description matches. What it cannot do is say
   * whether the top hit is good enough to skip the semantic search, so that judgement is
   * here: every meaningful word of the question has to appear in the product's name.
   * Anything looser ("something warm for winter") is exactly what the embedding is for.
   */
  private async searchCatalogByKeyword(
    businessId: string,
    queryText: string,
  ): Promise<{ confident: any[]; items: any[] }> {
    const empty = { confident: [] as any[], items: [] as any[] };
    const trimmed = (queryText || '').trim();
    if (!trimmed) return empty;
    if (typeof (this.productsService as any).findAll !== 'function') return empty;

    try {
      const STOP_WORDS = new Set([
        'do', 'you', 'have', 'show', 'me', 'any', 'what', 'is', 'are', 'the', 'price', 'of',
        'can', 'i', 'get', 'for', 'in', 'store', 'stock', 'tell', 'about', 'looking',
        'need', 'want', 'please', 'give', 'check', 'available', 'product', 'products',
        'item', 'items', 'much', 'cost', 'buy', 'purchase', 'order', 'a', 'an', 'and', 'or',
        'some', 'with', 'under', 'category', 'find', 'which', 'shop', 'there', 'got',
        'does', 'did', 'their', 'your', 'our', 'all', 'like', 'how', 'would', 'could',
        'see', 'look', 'view', 'let', 'take', 'know', 'browse', 'kind', 'type', 'kinds', 'types',
        'one', 'ones', 'nice', 'best', 'good', 'cool', 'top', 'new', 'latest',
      ]);

      const allTokens = trimmed
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z0-9]/g, ''))
        .filter((t) => t.length >= 2);

      const substantiveTerms = allTokens.filter((t) => !STOP_WORDS.has(t));
      const searchTerms = substantiveTerms.length > 0 ? substantiveTerms : allTokens.filter((t) => t.length >= 3);

      const res = await this.productsService.findAll(businessId, {
        search: searchTerms.length > 0 ? searchTerms.join(' ') : trimmed,
        limit: 5,
      } as any);
      if (!res || !res.items || res.items.length === 0) return empty;

      // A query with no substantive word of its own ("what do you sell?") has nothing
      // for a keyword match to be confident about, but its results are still worth
      // handing back for the catalog fallback further down.
      if (searchTerms.length === 0) return { confident: [], items: res.items };

      const confident = res.items.filter((item: any) => {
        const nameLower = (item.name || '').toLowerCase();
        const catLower = (item.category || '').toLowerCase();
        const brandLower = (item.brand || '').toLowerCase();
        const full = `${nameLower} ${catLower} ${brandLower}`;

        if (searchTerms.length > 1) {
          return searchTerms.every((term) => full.includes(term));
        }

        return searchTerms.some((term) => nameLower.includes(term) || catLower.includes(term));
      });

      return { confident, items: res.items };
    } catch (err: any) {
      this.logger.warn(`[AiToolsExecutor] Keyword fast-path notice: ${err.message}`);
      return { confident: [], items: [] };
    }
  }

  /**
   * Whether this tenant's playbook asks for low-stock urgency hints, cached in memory.
   * See urgencyFlagCache for why this is not read from Mongo on every tool call.
   */
  private async resolveUrgencyFlag(businessId: string): Promise<boolean> {
    const cached = this.urgencyFlagCache.get(businessId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.mentionLowStockUrgency;
    }

    let mentionLowStockUrgency = false;
    try {
      const agentCfg = await this.agentConfigService.getConfig(businessId);
      mentionLowStockUrgency = agentCfg?.playbook?.mentionLowStockUrgency ?? false;
    } catch {
      // Non-fatal: proceed without urgency hints, and do not cache a failed read.
      return false;
    }

    this.urgencyFlagCache.set(businessId, {
      mentionLowStockUrgency,
      expiresAt: Date.now() + URGENCY_FLAG_TTL_MS,
    });
    return mentionLowStockUrgency;
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
        ...this.describeVariants(product),
      },
    };
  }

  /**
   * Variant options for the model to read out and choose between. Omitted entirely for
   * single-variant products so the common case adds nothing to the tool payload.
   */
  private describeVariants(product: any): Record<string, any> {
    const shopify = product?.attributes?.shopify;
    const variants: any[] = Array.isArray(shopify?.variants) ? shopify.variants : [];
    if (variants.length < 2) return {};

    return {
      optionNames: Array.isArray(shopify?.optionNames) ? shopify.optionNames : [],
      totalVariants: variants.length,
      variants: variants.slice(0, MAX_VARIANTS_IN_PAYLOAD).map((variant) => ({
        variantId: variant.variantId,
        title: variant.title,
        price: variant.price,
        available: variant.available,
      })),
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

  /**
   * Resolves which Shopify variant an add_to_cart call means.
   *
   * Supports:
   * 1. Direct variantId if already known.
   * 2. Spoken variantOption fuzzy matching (e.g. "medium", "black", "size 10") in 1 turn.
   * 3. Single-variant products without asking.
   * 4. Multi-variant products without option: asks customer which option they want.
   * 5. Pre-synced catalogs without variants: falls back to nativeProductId.
   */
  private resolveCartVariant(
    product: any,
    requestedVariantId?: string,
    variantOption?: string,
  ):
    | { variantId: string | null; selectedTitle?: string }
    | { needsSelection: true; optionNames: string[]; totalVariants: number; variants: any[] } {
    const shopify = product?.attributes?.shopify;
    const variants: any[] = Array.isArray(shopify?.variants) ? shopify.variants : [];

    if (variants.length === 0) {
      // Not a Shopify-sourced product, or synced before variants were captured.
      // Fall back to requestedVariantId or nativeProductId so the storefront widget can attempt the add.
      const fallbackId = requestedVariantId ? String(requestedVariantId) : product?.nativeProductId ? String(product.nativeProductId) : null;
      return { variantId: fallbackId };
    }

    if (requestedVariantId) {
      const match = variants.find(
        (variant) => String(variant.variantId) === String(requestedVariantId),
      );
      if (match) return { variantId: match.variantId, selectedTitle: match.title };
    }

    // Fuzzy-match spoken variantOption (e.g. "Medium", "Red", "Large") in 1 single turn
    if (variantOption && typeof variantOption === 'string') {
      const opt = variantOption.trim().toLowerCase();
      // 1. Direct substring match on title
      let match = variants.find((v) => {
        const title = String(v.title || '').toLowerCase();
        return title === opt || title.includes(opt) || opt.includes(title);
      });
      // 2. Token-level matching
      if (!match) {
        const tokens = opt.split(/[\s,/-]+/).filter((t) => t.length >= 2);
        if (tokens.length > 0) {
          match = variants.find((v) => {
            const title = String(v.title || '').toLowerCase();
            return tokens.some((token) => title.includes(token));
          });
        }
      }
      if (match) {
        return { variantId: match.variantId, selectedTitle: match.title };
      }
    }

    if (variants.length === 1) return { variantId: variants[0].variantId, selectedTitle: variants[0].title };

    const purchasable = variants.filter((variant) => variant.available);
    const offered = purchasable.length > 0 ? purchasable : variants;
    return {
      needsSelection: true,
      optionNames: Array.isArray(shopify?.optionNames) ? shopify.optionNames : [],
      totalVariants: offered.length,
      variants: offered.slice(0, MAX_VARIANTS_IN_PAYLOAD).map((variant) => ({
        variantId: variant.variantId,
        title: variant.title,
        price: variant.price,
        available: variant.available,
      })),
    };
  }

  private async handleAddToCart(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    const product = await this.productsService.verifyLive(businessId, args.productId);
    const quantity = args.quantity || 1;

    const isShopify = await this.isShopifyTenant(businessId);
    const resolved = this.resolveCartVariant(product, args.variantId, args.variantOption);

    if ('needsSelection' in resolved) {
      return {
        success: false,
        needsVariantSelection: true,
        productId: product._id.toString(),
        name: product.name,
        optionNames: resolved.optionNames,
        totalVariants: resolved.totalVariants,
        variants: resolved.variants,
        message:
          resolved.totalVariants > resolved.variants.length
            ? `${product.name} comes in ${resolved.totalVariants} options; the first ${resolved.variants.length} are listed. Ask the customer which one they want, then call add_to_cart again with that variantOption or variantId.`
            : `${product.name} comes in more than one option. Ask the customer which one they want, then call add_to_cart again with that variantOption or variantId.`,
      };
    }
    const variantId = resolved.variantId;
    const selectedTitle = (resolved as any).selectedTitle;

    // Retrieve active customer bound to this session
    let customerId: string | null = null;
    try {
      const rawSessionCustomer = await this.redisService
        .getClient()
        .get(`session:${sessionId}:customer`);
      if (rawSessionCustomer) {
        customerId = JSON.parse(rawSessionCustomer).customerId;
      }
    } catch {}

    const redisKey = `cart:conv:${sessionId}`;
    const rawCart = await this.redisService.getClient().get(redisKey);
    const cart = rawCart ? JSON.parse(rawCart) : { items: [] };

    // Update quantity if item exists, or push new
    // Same product, different variant is a different line item: a Medium and a Large
    // shirt must not collapse into quantity 2 of whichever was added first.
    const existingItem = cart.items.find(
      (i: any) =>
        i.productId === product._id.toString() && (i.variantId || null) === variantId,
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: product._id.toString(),
        variantId,
        name: product.name,
        price: product.price,
        quantity,
        // Set by syncStorefrontCart once the browser confirms the storefront took it.
        mirroredToStorefront: false,
      });
    }
    cart.updatedAt = Date.now();
    // Who may turn this cart into an order. On a Shopify tenant the cart below is a
    // record of the conversation, mirrored into the storefront cart by the widget;
    // Shopify's own checkout is what actually sells.
    cart.authority = isShopify ? 'shopify' : 'ora';

    if (isShopify && !variantId) {
      // No variant id means the catalogue was synced before variants were captured, so
      // the widget has nothing to mirror into the storefront cart. Failing the tool here
      // is worse than the gap it reports: the model treats a failed call as a problem to
      // solve, re-plans, re-searches and answers two turns later. The line is kept and
      // flagged instead; a catalogue re-sync closes the gap for good.
      this.logger.warn(
        `[AiToolsExecutor] ${product.name} (business ${businessId}) has no Shopify variant id, so it cannot reach the storefront cart. Re-sync this catalogue.`,
      );
    }

    const saveOps = [
      this.redisService.getClient().set(redisKey, JSON.stringify(cart), 'EX', 24 * 60 * 60),
    ];
    if (customerId) {
      cart.customerId = customerId;
      saveOps.push(
        this.redisService
          .getClient()
          .set(`cart:customer:${customerId}`, JSON.stringify(cart), 'EX', 7 * 24 * 60 * 60),
      );
    }
    await Promise.all(saveOps);

    // Log CART_UPDATED event
    await this.eventsService.logEvent(businessId, EventType.CART_UPDATED, {
      sessionId,
      customerId,
      productId: product._id.toString(),
      quantity,
    });

    const itemLabel =
      selectedTitle && selectedTitle !== 'Default Title'
        ? `${product.name} (${selectedTitle})`
        : product.name;

    const result: any = {
      success: true,
      message: `Added ${quantity} x ${itemLabel} to cart.`,
      cart,
    };

    // The storefront cart lives in the shopper's browser session cookie, which no server
    // token can reach, so the browser has to make the /cart/add.js call itself. The
    // gateway forwards `action` to the widget verbatim.
    if (variantId) {
      result.action = {
        type: 'shopify_add_to_cart',
        variantId,
        quantity,
        product: {
          id: product._id.toString(),
          name: product.name,
          price: product.price,
          image: (product.images && product.images[0]) || null,
        },
      };
    }

    return result;
  }

  /**
   * Reconciles ORA's cart with what the storefront cart actually accepted.
   *
   * The browser makes the /cart/add.js call, so only the browser knows whether it
   * succeeded. Shopify rejects a sold-out or unknown variant with a 422 after the agent
   * has already said "added", and if nothing undid that line ORA would hold an item the
   * store does not — the two-cart divergence in miniature. The widget therefore reports
   * back, and a rejected line is removed here.
   *
   * Returns a sentence for the model when it needs to correct itself, or null when the
   * mirror succeeded and there is nothing to say.
   */
  async syncStorefrontCart(
    businessId: string,
    sessionId: string,
    payload: { ok?: boolean; variantId?: string; productId?: string; reason?: string },
  ): Promise<string | null> {
    const redisKey = `cart:conv:${sessionId}`;

    let cart: any;
    try {
      const rawCart = await this.redisService.getClient().get(redisKey);
      cart = rawCart ? JSON.parse(rawCart) : null;
    } catch (err: any) {
      this.logger.warn(`[AiToolsExecutor] Cart sync read failed: ${err.message}`);
      return null;
    }
    if (!cart || !Array.isArray(cart.items)) return null;

    const matches = (item: any) =>
      payload.variantId
        ? String(item.variantId || '') === String(payload.variantId)
        : String(item.productId || '') === String(payload.productId || '');

    const line = cart.items.find(matches);
    if (!line) return null;

    if (payload.ok) {
      line.mirroredToStorefront = true;
    } else {
      cart.items = cart.items.filter((item: any) => !matches(item));
    }
    cart.updatedAt = Date.now();

    try {
      await this.redisService
        .getClient()
        .set(redisKey, JSON.stringify(cart), 'EX', 24 * 60 * 60);
    } catch (err: any) {
      this.logger.warn(`[AiToolsExecutor] Cart sync write failed: ${err.message}`);
    }

    if (payload.ok) return null;

    this.logger.warn(
      `[AiToolsExecutor] Storefront rejected ${line.name} for business ${businessId}: ${payload.reason || 'unknown reason'}`,
    );

    return `[SYSTEM_UPDATE: The store could not add ${line.name} to the customer's cart${
      payload.reason ? ` (${payload.reason})` : ''
    }. It is not in their cart. Tell the customer plainly, and offer an alternative or the product page.]`;
  }

  private async handlePlaceOrder(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    // Retrieve active customer bound to this session
    let customerId: string | null = null;
    try {
      const rawSessionCustomer = await this.redisService
        .getClient()
        .get(`session:${sessionId}:customer`);
      if (rawSessionCustomer) {
        customerId = JSON.parse(rawSessionCustomer).customerId;
      }
    } catch {}

    // A Shopify tenant's order is created by Shopify's checkout, from the cart in the
    // shopper's browser. Writing an ORA order here as well would sell the same items
    // twice — once in ORA's Orders collection, once when the shopper completes the
    // storefront checkout they were already sent to — so hand the shopper over instead.
    if (await this.isShopifyTenant(businessId)) {
      return {
        success: false,
        handoffToStorefrontCheckout: true,
        message:
          'This store completes purchases through its own secure checkout. Tell the customer you are taking them to the cart to finish the order, and do not claim the order has been placed.',
        action: {
          type: 'navigate',
          destination: '/cart',
          reason: 'Complete the purchase in the storefront checkout',
        },
      };
    }

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

    const orderPayload: any = {
      items: cart.items,
      totalAmount,
      currency: 'USD',
      source: OrderSource.ORA_AGENT,
      shippingAddress: args.shippingAddress
        ? { addressLine1: args.shippingAddress }
        : {},
      metadata: { sessionId, placedVia: 'voice_agent' },
    };
    if (customerId) {
      orderPayload.customerId = customerId;
    }

    const order = await this.ordersService.create(businessId, orderPayload);

    // Clear cart in Redis after order completion
    const delOps = [this.redisService.getClient().del(redisKey)];
    if (customerId) {
      delOps.push(this.redisService.getClient().del(`cart:customer:${customerId}`));
    }
    await Promise.all(delOps);

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
      message: 'Directing customer to storefront cart to complete checkout.',
      action: {
        type: 'navigate',
        destination: '/cart',
        reason: 'Proceed to store cart and checkout',
      },
    };
  }

  private async handleSearchKnowledge(businessId: string, args: Record<string, any>) {
    const query = args && args.query ? String(args.query) : 'about projects bio services contact faq policy';
    const res = await this.ragService.searchKnowledge(businessId, query, {
      limit: 5,
    });

    const snippets = res.results.map((r) => r.text).join('\n\n');
    return {
      success: true,
      query,
      foundItems: res.results.length,
      details: snippets || 'No relevant knowledge document found for this specific query.',
      results: res.results,
    };
  }

  private async handleUpdateCustomerProfile(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    let customerId: string | null = null;
    try {
      const rawSessionCustomer = await this.redisService
        .getClient()
        .get(`session:${sessionId}:customer`);
      if (rawSessionCustomer) {
        customerId = JSON.parse(rawSessionCustomer).customerId;
      }
    } catch {}

    if (!customerId || !this.customersService) {
      return { success: false, message: 'No active customer found for this session.' };
    }

    const updates: Record<string, any> = {};
    if (args.name) updates.name = args.name;
    if (args.preferences) updates.extractedPreferences = args.preferences;

    if (args.email || args.phone || args.address || args.shippingAddress) {
      // Store unverified spoken claims in metadata (Zero-Leak isolation)
      updates.metadata = {
        unverifiedSpokenClaims: {
          email: args.email,
          phone: args.phone,
          address: args.address || args.shippingAddress,
          capturedAt: new Date(),
        },
      };
    }

    const updated = await this.customersService.update(businessId, customerId, updates as any);

    // Also update Redis session customer cache so subsequent turns know the customer's name immediately
    try {
      const redis = this.redisService.getClient();
      const existing = await redis.get(`session:${sessionId}:customer`);
      const parsed = existing ? JSON.parse(existing) : {};
      parsed.name = updated.name;
      await redis.set(`session:${sessionId}:customer`, JSON.stringify(parsed), 'EX', 86400);
    } catch {}

    const detailsData: Record<string, any> = {};
    if (args.name || updated.name) detailsData.name = args.name || updated.name;
    if (args.email) detailsData.email = args.email;
    if (args.phone) detailsData.phone = args.phone;
    if (args.address || args.shippingAddress) detailsData.address = args.address || args.shippingAddress;
    if (args.preferences || updated.extractedPreferences) detailsData.preferences = args.preferences || updated.extractedPreferences;

    const summaryStr = [
      detailsData.name ? `Name: "${detailsData.name}"` : null,
      detailsData.email ? `Email: "${detailsData.email}"` : null,
      detailsData.phone ? `Phone: "${detailsData.phone}"` : null,
      detailsData.address ? `Address: "${detailsData.address}"` : null,
    ].filter(Boolean).join(', ');

    return {
      success: true,
      message: `Customer profile successfully saved in memory (${summaryStr}). You can now answer the customer using these saved details!`,
      customer: detailsData,
      action: {
        type: 'confirm_details',
        data: detailsData,
        reason: 'Prompt user to review and verify their contact or shipping information',
      },
    };
  }

  private async handleGetCustomerProfile(businessId: string, sessionId: string) {
    let customerId: string | null = null;
    try {
      const rawSessionCustomer = await this.redisService
        .getClient()
        .get(`session:${sessionId}:customer`);
      if (rawSessionCustomer) {
        customerId = JSON.parse(rawSessionCustomer).customerId;
      }
    } catch {}

    if (!customerId || !this.customersService) {
      return { success: false, message: 'No customer profile found in memory yet.' };
    }

    try {
      const customer = await this.customersService.findOne(businessId, customerId);
      if (!customer) {
        return { success: false, message: 'No customer profile found.' };
      }

      const email = customer.email || (customer.metadata as any)?.verifiedContactDetails?.email || (customer.metadata as any)?.unverifiedSpokenClaims?.email || null;
      const phone = customer.phone || (customer.metadata as any)?.verifiedContactDetails?.phone || (customer.metadata as any)?.unverifiedSpokenClaims?.phone || null;
      const address = (customer.metadata as any)?.shippingAddress || (customer.metadata as any)?.verifiedContactDetails?.address || (customer.metadata as any)?.unverifiedSpokenClaims?.address || null;

      const profileSummary = [
        customer.name ? `Name: "${customer.name}"` : 'Name: Guest',
        email ? `Email: "${email}"` : 'Email: Not provided',
        phone ? `Phone: "${phone}"` : 'Phone: Not provided',
        address ? `Address: "${address}"` : 'Address: Not provided',
      ].join(', ');

      return {
        success: true,
        profile: {
          name: customer.name,
          email,
          phone,
          address,
          preferences: customer.extractedPreferences,
        },
        message: `Saved customer profile: ${profileSummary}. Answer the customer's question directly using this information.`,
      };
    } catch (err: any) {
      return { success: false, message: 'Could not retrieve customer details.' };
    }
  }

  private async handleGetPricingPlans(businessId: string, args: Record<string, any>) {
    const isPlatform = await this.isPlatformTenant(businessId);

    if (!isPlatform) {
      return {
        success: false,
        message: 'This store offers physical/digital catalog items rather than SaaS subscriptions. For prices and availability, please refer to the store products.',
      };
    }

    let plansData: any[] = [];
    try {
      if (this.billingService) {
        plansData = await this.billingService.getPlans();
      }
    } catch (err: any) {
      this.logger.warn(`[AiToolsExecutor] Error fetching plans from BillingService: ${err.message}`);
    }
    if (!plansData || plansData.length === 0) {
      plansData = [
        {
          planId: 'free',
          name: 'Free Tier',
          priceUsd: 0,
          priceBdt: 0,
          billingInterval: 'month',
          limits: { conversationMinutes: 100, ordersPerMonth: 20, connectedStores: 1, seats: 1 },
          features: [
            '100 Live Voice Minutes / month',
            '20 Tier-1 Orders',
            '1 Connected Storefront / Connector',
            'Basic RAG Search',
          ],
        },
        {
          planId: 'growth',
          name: 'Growth Plan',
          priceUsd: 49,
          priceBdt: 5500,
          billingInterval: 'month',
          limits: { conversationMinutes: 2000, ordersPerMonth: 500, connectedStores: 3, seats: 5 },
          features: [
            '2,000 Live Voice Minutes / month',
            '500 Tier-1 Orders',
            '3 Connected Stores',
            '5 Staff Seats',
            'Full RAG Vector Search & Webhook Sync',
          ],
        },
        {
          planId: 'scale',
          name: 'Scale Plan',
          priceUsd: 199,
          priceBdt: 22000,
          billingInterval: 'month',
          limits: { conversationMinutes: 100000, ordersPerMonth: 100000, connectedStores: 99, seats: 99 },
          features: [
            'Unlimited Live Voice Minutes / month',
            'Unlimited Orders',
            '99 Connected Stores',
            '99 Staff Seats',
            'Dedicated Account Manager & Priority Support',
          ],
        },
      ];
    } else {
      plansData = plansData.map((p) => ({
        planId: p.planId,
        name: p.name,
        priceUsd: p.priceUsdCents ? p.priceUsdCents / 100 : (p.priceMonthlyUsd || 0),
        priceBdt: p.priceBdtPaisa ? p.priceBdtPaisa / 100 : (p.priceMonthlyBdt || 0),
        billingInterval: p.billingInterval || 'month',
        limits: p.limits || {
          conversationMinutes: p.conversationMinutesIncluded || 100,
          connectedStores: p.connectedStoresLimit || 1,
        },
        features: p.features || [],
      }));
    }

    const preferBdt = args.currency && /bdt|taka/i.test(args.currency);
    const summaryLines = plansData.map((p) => {
      const priceStr = preferBdt ? `৳${p.priceBdt} BDT/mo` : `$${p.priceUsd} USD/mo (or ৳${p.priceBdt} BDT/mo)`;
      const limitsStr = `${p.limits?.conversationMinutes || 0} voice mins/mo, ${p.limits?.connectedStores || 1} store(s)`;
      return `• **${p.name}**: ${priceStr} — includes ${limitsStr}. Key features: ${(p.features || []).slice(0, 3).join(', ')}`;
    });

    return {
      success: true,
      plans: plansData,
      currency: preferBdt ? 'BDT' : 'USD',
      summary: summaryLines.join('\n'),
      notes: 'We support instant online checkout via Stripe (USD credit/debit cards) and bKash (BDT tokenized agreement).',
      action: {
        type: 'navigate',
        destination: '/pricing',
        reason: 'Show full pricing table and comparison matrix',
      },
    };
  }

  /** Cached lookup of the platform tenant flag; see platformFlagCache. */
  private async isPlatformTenant(businessId: string): Promise<boolean> {
    const cached = this.platformFlagCache.get(businessId);
    if (cached && cached.expiresAt > Date.now()) return cached.isPlatform;
    if (!this.businessModel) return false;

    let isPlatform = false;
    try {
      const biz = await this.businessModel
        .findById(businessId)
        .select('publishableKey')
        .lean()
        .exec();
      isPlatform = biz?.publishableKey === 'biz_live_ora_platform_system';
    } catch {
      return false; // Do not cache a failed read.
    }

    this.platformFlagCache.set(businessId, {
      isPlatform,
      expiresAt: Date.now() + PLATFORM_FLAG_TTL_MS,
    });
    return isPlatform;
  }

  /**
   * Whether this tenant's storefront owns the cart. See shopifyTenantCache.
   *
   * An uninstalled app leaves `shopifyShopDomain` behind for re-install, so the
   * uninstall timestamp has to be checked too: once the app is gone there is no
   * storefront cart to defer to, and ORA's own cart becomes authoritative again.
   */
  private async isShopifyTenant(businessId: string): Promise<boolean> {
    const cached = this.shopifyTenantCache.get(businessId);
    if (cached && cached.expiresAt > Date.now()) return cached.isShopify;
    if (!this.businessModel) return false;

    let isShopify = false;
    try {
      const biz: any = await this.businessModel
        .findById(businessId)
        .select('platform shopifyShopDomain shopifyInstalledAt shopifyUninstalledAt')
        .lean()
        .exec();

      const installed =
        Boolean(biz?.shopifyShopDomain) &&
        (!biz?.shopifyUninstalledAt ||
          (biz?.shopifyInstalledAt &&
            new Date(biz.shopifyInstalledAt) > new Date(biz.shopifyUninstalledAt)));

      isShopify = biz?.platform === 'shopify' || installed;
    } catch {
      return false; // Do not cache a failed read.
    }

    this.shopifyTenantCache.set(businessId, {
      isShopify,
      expiresAt: Date.now() + SHOPIFY_FLAG_TTL_MS,
    });
    return isShopify;
  }

  private async handleNavigateToPage(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    const isPlatform = await this.isPlatformTenant(businessId);

    const rawDest = (args.destination || '').trim();
    let cleanDest = rawDest;
    if (!cleanDest.startsWith('/') && !cleanDest.startsWith('#')) {
      cleanDest = `/${cleanDest}`;
    }

    if (isPlatform) {
      // Sanitize and alias common route hallucination variations to valid Next.js routes
      if (cleanDest === '/register' || cleanDest === '/signup' || cleanDest === '/auth/register') {
        cleanDest = '/auth?mode=register';
      } else if (cleanDest === '/login' || cleanDest === '/signin' || cleanDest === '/auth/login') {
        cleanDest = '/auth?mode=login';
      } else if (cleanDest === '/home' || cleanDest === '/landing') {
        cleanDest = '/';
      } else if (cleanDest === '/setup' || cleanDest.startsWith('/setup?') || cleanDest.startsWith('/setup/')) {
        // Setup guide was consolidated into Agent Configuration
        cleanDest = '/agent';
      } else if (cleanDest === '/invoices' || cleanDest === '/subscription') {
        cleanDest = '/billing';
      } else if (cleanDest === '/settings') {
        cleanDest = '/profile';
      } else if (cleanDest === '#pricing' || cleanDest === '#plans' || cleanDest === '/plans') {
        // Pricing is its own route; there is no pricing section on the landing
        // page, so scrolling to it would silently do nothing.
        cleanDest = '/pricing';
      } else if (cleanDest === '#faq' || cleanDest === '#demo') {
        // Neither section exists. Send the visitor somewhere real instead of
        // reporting a successful navigation that never happens.
        cleanDest = cleanDest === '#faq' ? '/pricing' : '/';
      } else if (
        cleanDest === '/doc' ||
        cleanDest === '/docs' ||
        cleanDest === '/manual' ||
        cleanDest === '/manuals' ||
        cleanDest === '/guide' ||
        cleanDest === '/guides' ||
        cleanDest === '/documentation' ||
        cleanDest === '#docs'
      ) {
        cleanDest = '/docs';
      }

      const ALLOWED_TARGETS = [
        '/',
        '/docs',
        '/pricing',
        '/auth',
        '/dashboard',
        '/live-desk',
        '/conversations',
        '/agent',
        '/customers',
        '/billing',
        '/usage',
        '/profile',
        '/admin',
        '/solutions',
        '#hero',
        '#features',
        '#solutions',
        '#docs',
        '#stats',
        '#testimonials',
        '#cta',
      ];

      const isValid = ALLOWED_TARGETS.some(
        (t) => cleanDest === t || cleanDest.startsWith(`${t}?`) || cleanDest.startsWith(`${t}/`),
      );

      if (!isValid) {
        // If not explicitly in the list, keep cleanDest if it's a valid relative path, else default to /
        if (!cleanDest.startsWith('/') && !cleanDest.startsWith('#')) {
          cleanDest = '/';
        }
      }

      return {
        success: true,
        message: `Navigation triggered to ${cleanDest}. You already announced this to the visitor. Do NOT speak any follow-up response. Remain silent.`,
        action: {
          type: 'navigate',
          destination: cleanDest,
          reason: args.reason || 'Requested by customer or AI assistant',
        },
      };
    } else {
      // Merchant Storefront navigation: allow store-relative paths (e.g. /, /cart, /checkout, /collections, /products/...)
      // Strictly prevent routing to platform dashboard or admin pages
      const BLOCKED_PREFIXES = ['/dashboard', '/admin', '/billing', '/agent', '/live-desk', '/conversations', '/profile'];
      if (BLOCKED_PREFIXES.some((b) => cleanDest.startsWith(b))) {
        return {
          success: false,
          message: 'Internal management routes are not available on this storefront.',
        };
      }

      return {
        success: true,
        message: `Navigation triggered to ${cleanDest}. You already announced this to the shopper. Do NOT speak any follow-up response. Remain silent.`,
        action: {
          type: 'navigate',
          destination: cleanDest,
          reason: args.reason || 'Requested by shopper',
        },
      };
    }
  }

  private async handleCaptureSalesLead(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    const { name, email, phone, storeUrl, interestedPlan, notes } = args;

    // 1. Try persisting through CustomerService if session customer exists
    let customerId: string | null = null;
    try {
      const rawSessionCustomer = await this.redisService
        .getClient()
        .get(`session:${sessionId}:customer`);
      if (rawSessionCustomer) {
        customerId = JSON.parse(rawSessionCustomer).customerId;
      }
    } catch {}

    if (customerId && this.customersService) {
      await this.customersService.update(businessId, customerId, {
        name: name || undefined,
        metadata: {
          salesLead: {
            email,
            phone,
            storeUrl,
            interestedPlan,
            notes,
            capturedAt: new Date(),
          },
        },
      } as any).catch(() => {});
    }

    // 2. Cache in Redis lead store for CRM notification
    try {
      const redis = this.redisService.getClient();
      const leadKey = `lead:${businessId}:${Date.now()}`;
      await redis.set(
        leadKey,
        JSON.stringify({
          businessId,
          sessionId,
          name,
          email,
          phone,
          storeUrl,
          interestedPlan,
          notes,
          capturedAt: new Date().toISOString(),
        }),
        'EX',
        86400 * 30, // 30 days
      );
    } catch {}

    // 3. Emit event for sales dashboard notification
    try {
      if (this.eventsService) {
        await this.eventsService.logEvent(
          businessId,
          EventType.SALES_LEAD_CAPTURED,
          {
            name,
            email,
            storeUrl,
            interestedPlan,
            notes,
          },
        );
      }
    } catch {}

    return {
      success: true,
      message: `Thank you${name ? ` ${name}` : ''}! Your contact details (${email}) have been saved. Prompting review on screen.`,
      leadCaptured: { name, email, storeUrl, interestedPlan },
      action: {
        type: 'confirm_details',
        data: {
          name,
          email,
          phone,
          storeUrl,
          notes,
        },
        reason: 'Prompt user to review lead contact information',
      },
    };
  }

  private async handleGetIntegrationGuide(businessId: string, args: Record<string, any>) {
    const platform = (args.platform || 'html').toLowerCase();
    const frontendUrl =
      this.configService?.get<string>('FRONTEND_URL') ||
      (this.configService?.get<string>('NODE_ENV') === 'production'
        ? 'https://tryora.live'
        : 'http://localhost:3000');
    const apiUrl =
      this.configService?.get<string>('BACKEND_URL') ||
      (this.configService?.get<string>('NODE_ENV') === 'production'
        ? 'https://tryora.live'
        : 'http://localhost:5000');

    let guideMarkdown = '';
    if (platform.includes('shopify')) {
      guideMarkdown = `### Shopify Integration in 60 Seconds\n1. Open your Shopify Admin -> Online Store -> Themes -> Edit code.\n2. In \`theme.liquid\`, right before \`</head>\`, paste:\n\`\`\`html\n<script src="${frontendUrl}/widget/ora-widget.js" data-ora-key="YOUR_PUBLISHABLE_KEY" async></script>\n\`\`\`\n3. Click Save! ORA immediately ingests your products via passive telemetry and mounts the live voice agent.`;
    } else if (platform.includes('woo') || platform.includes('wordpress')) {
      guideMarkdown = `### WooCommerce Integration\n1. Add the ORA embed snippet to your theme's \`header.php\` before \`</head>\`:\n\`\`\`html\n<script src="${frontendUrl}/widget/ora-widget.js" data-ora-key="YOUR_PUBLISHABLE_KEY" async></script>\n\`\`\`\n2. ORA will automatically synchronize your product catalog and live inventory.`;
    } else if (platform.includes('next') || platform.includes('react')) {
      guideMarkdown = `### Next.js & React Integration\nIn your root \`app/layout.tsx\`:\n\`\`\`tsx\nimport Script from 'next/script';\n\n<Script\n  src="${frontendUrl}/widget/ora-widget.js"\n  data-ora-key="YOUR_PUBLISHABLE_KEY"\n  data-ora-api="${apiUrl}"\n  strategy="afterInteractive"\n/>\n\`\`\`\nORA automatically handles SPA route changes and hydration!`;
    } else {
      guideMarkdown = `### Universal HTML Integration\nAdd this single line anywhere in your HTML before \`</body>\`:\n\`\`\`html\n<script src="${frontendUrl}/widget/ora-widget.js" data-ora-key="YOUR_PUBLISHABLE_KEY" async></script>\n\`\`\`\nORA auto-scrapes your headings, projects, products, and contact info in real-time.`;
    }

    return {
      success: true,
      platform,
      guide: guideMarkdown,
      action: {
        type: 'navigate',
        destination: '/docs',
        reason: 'View complete documentation and SDK references',
      },
    };
  }
}

