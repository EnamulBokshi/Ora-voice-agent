import { Injectable, Logger, Optional } from '@nestjs/common';
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
    @Optional()
    private readonly customersService?: CustomersService,
    @Optional()
    private readonly billingService?: BillingService,
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
    // 1. Semantic RAG search for shortlist of candidate product IDs
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

    // 3. Batch live-verify price and stock for each candidate in a single roundtrip
    const candidateIds = ragRes.products
      .map((prod) => {
        const targetId =
          (prod as any).entityId ||
          (prod as any).id ||
          (prod as any)._id ||
          ((prod as any).data && (prod as any).data._id);
        return targetId ? targetId.toString() : null;
      })
      .filter(Boolean) as string[];

    let verifiedList: any[] = [];
    if (candidateIds.length > 0) {
      try {
        if (typeof this.productsService.verifyLiveBatch === 'function') {
          verifiedList = await this.productsService.verifyLiveBatch(businessId, candidateIds);
        }
        if (verifiedList.length === 0 && typeof this.productsService.verifyLive === 'function') {
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
    }

    const liveVerifiedProducts: Record<string, any>[] = verifiedList.map((live) => {
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
    });

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

    // 6. Direct MongoDB catalog fallback: if vector RAG was empty, query DB directly
    if (liveVerifiedProducts.length === 0) {
      try {
        const directDb = await this.productsService.findAll(businessId, {
          search: (args && args.query) ? String(args.query) : '',
          limit: 5,
        });

        if (directDb.items.length > 0) {
          for (const item of directDb.items) {
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

    const productSummary = liveVerifiedProducts
      .map(
        (p) =>
          `${p.name} at ${p.currency} ${p.price} (${p.availability}, Stock: ${p.stockQuantity}${p.urgencyHint ? ` - ${p.urgencyHint}` : ''})`,
      )
      .join('; ');

    return {
      success: true,
      query: args.query,
      products: liveVerifiedProducts,
      totalFound: liveVerifiedProducts.length,
      message: `Found ${liveVerifiedProducts.length} product(s): ${productSummary}`,
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
    const existingItem = cart.items.find((i: any) => i.productId === product._id.toString());
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: product._id.toString(),
        name: product.name,
        price: product.price,
        quantity,
      });
    }
    cart.updatedAt = Date.now();

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
      checkoutUrl: `http://localhost:3000/checkout?sessionId=${sessionId}&biz=${businessId}`,
      message: 'Redirecting customer to storefront checkout page.',
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

    if (args.email || args.phone) {
      // Store unverified spoken claims in metadata (Zero-Leak isolation)
      updates.metadata = {
        unverifiedSpokenClaims: {
          email: args.email,
          phone: args.phone,
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

    return {
      success: true,
      message: `Customer profile successfully saved with name: ${updated.name}`,
    };
  }

  private async handleGetPricingPlans(businessId: string, args: Record<string, any>) {
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

  private async handleNavigateToPage(
    businessId: string,
    sessionId: string,
    args: Record<string, any>,
  ) {
    const rawDest = (args.destination || '').trim();
    let cleanDest = rawDest;
    if (!cleanDest.startsWith('/') && !cleanDest.startsWith('#')) {
      cleanDest = `/${cleanDest}`;
    }

    // Sanitize and alias common route hallucination variations to valid Next.js routes
    if (cleanDest === '/register' || cleanDest === '/signup' || cleanDest === '/auth/register') {
      cleanDest = '/auth?mode=register';
    } else if (cleanDest === '/login' || cleanDest === '/signin' || cleanDest === '/auth/login') {
      cleanDest = '/auth?mode=login';
    } else if (cleanDest === '/home' || cleanDest === '/landing') {
      cleanDest = '/';
    } else if (
      cleanDest === '/doc' ||
      cleanDest === '/docs' ||
      cleanDest === '/manual' ||
      cleanDest === '/manuals' ||
      cleanDest === '/guide' ||
      cleanDest === '/guides' ||
      cleanDest === '/documentation'
    ) {
      cleanDest = '#features';
    }

    const ALLOWED_TARGETS = [
      '/',
      '/pricing',
      '/auth',
      '/dashboard',
      '/live-desk',
      '/conversations',
      '/agent',
      '/customers',
      '/billing',
      '/profile',
      '/admin',
      '#features',
      '#stats',
      '#cta',
      '#solutions',
      '#docs',
    ];

    const isValid = ALLOWED_TARGETS.some(
      (t) => cleanDest === t || cleanDest.startsWith(`${t}?`) || cleanDest.startsWith(`${t}/`),
    );

    if (!isValid) {
      cleanDest = '#features';
    }

    return {
      success: true,
      message: `Navigating visitor to ${cleanDest}`,
      action: {
        type: 'navigate',
        destination: cleanDest,
        reason: args.reason || 'Requested by customer or AI assistant',
      },
    };
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
      message: `Thank you${name ? ` ${name}` : ''}! Your contact details (${email}) have been saved. Our team will follow up promptly.`,
      leadCaptured: { name, email, storeUrl, interestedPlan },
    };
  }

  private async handleGetIntegrationGuide(businessId: string, args: Record<string, any>) {
    const platform = (args.platform || 'html').toLowerCase();

    let guideMarkdown = '';
    if (platform.includes('shopify')) {
      guideMarkdown = `### Shopify Integration in 60 Seconds\n1. Open your Shopify Admin -> Online Store -> Themes -> Edit code.\n2. In \`theme.liquid\`, right before \`</head>\`, paste:\n\`\`\`html\n<script src="https://cdn.ora.ai/widget/ora-widget.js" data-ora-key="YOUR_PUBLISHABLE_KEY" async></script>\n\`\`\`\n3. Click Save! ORA immediately ingests your products via passive telemetry and mounts the live voice agent.`;
    } else if (platform.includes('woo') || platform.includes('wordpress')) {
      guideMarkdown = `### WooCommerce Integration\n1. Install the ORA WooCommerce Plugin or add the snippet to \`header.php\`:\n\`\`\`html\n<script src="https://cdn.ora.ai/widget/ora-widget.js" data-ora-key="YOUR_PUBLISHABLE_KEY" async></script>\n\`\`\`\n2. Set up WooCommerce REST API keys in your ORA dashboard for instant order placement.`;
    } else if (platform.includes('next') || platform.includes('react')) {
      guideMarkdown = `### Next.js & React Integration\nIn your root \`app/layout.tsx\`:\n\`\`\`tsx\nimport Script from 'next/script';\n\n<Script\n  src="http://localhost:3000/widget/ora-widget.js"\n  data-ora-key="YOUR_PUBLISHABLE_KEY"\n  data-ora-api="http://localhost:5000"\n  strategy="afterInteractive"\n/>\n\`\`\`\nORA automatically handles SPA route changes and hydration!`;
    } else {
      guideMarkdown = `### Universal HTML Integration\nAdd this single line anywhere in your HTML before \`</body>\`:\n\`\`\`html\n<script src="https://cdn.ora.ai/widget/ora-widget.js" data-ora-key="YOUR_PUBLISHABLE_KEY" async></script>\n\`\`\`\nORA auto-scrapes your headings, projects, products, and contact info in real-time.`;
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

