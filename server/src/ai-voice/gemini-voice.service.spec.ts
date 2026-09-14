import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { GeminiVoiceService } from './gemini-voice.service';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { ProductsService } from '../products/products.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { Business } from '../users/schemas/business.schema';
import { AdminUser } from '../users/schemas/admin-user.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { getToolsForArchetype } from './tools/ai-tools.definition';

describe('GeminiVoiceService - Context Boundary & Zero-Leak Isolation', () => {
  let service: GeminiVoiceService;
  let mockBusinessModel: any;
  let mockAdminUserModel: any;
  let mockCustomerModel: any;
  let mockAgentConfigService: any;
  let mockProductsService: any;
  let mockKnowledgeService: any;

  beforeEach(async () => {
    mockBusinessModel = {
      findById: jest.fn(),
    };
    mockAdminUserModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      }),
    };
    mockCustomerModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };
    mockAgentConfigService = {
      getConfig: jest.fn().mockResolvedValue({
        activeArchetype: 'ecommerce',
        config: { brandVoiceDescription: 'Warm and fast' },
        voice: { voiceId: 'Aoede' },
        playbook: {},
      }),
    };
    mockProductsService = {
      findAll: jest.fn().mockResolvedValue({
        items: [
          { name: 'Leather Running Shoes', price: 89, currency: 'USD', availability: 'in stock', category: 'Footwear' },
        ],
        pagination: { total: 1 },
      }),
    };
    mockKnowledgeService = {
      findAll: jest.fn().mockResolvedValue({
        items: [
          { title: 'Shipping Policy', content: 'We deliver within 3 days nationwide.' },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiVoiceService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock_gemini_key') },
        },
        {
          provide: AiToolsExecutor,
          useValue: {},
        },
        {
          provide: AgentConfigService,
          useValue: mockAgentConfigService,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: KnowledgeService,
          useValue: mockKnowledgeService,
        },
        {
          provide: getModelToken(Business.name),
          useValue: mockBusinessModel,
        },
        {
          provide: getModelToken(AdminUser.name),
          useValue: mockAdminUserModel,
        },
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
      ],
    }).compile();

    service = module.get<GeminiVoiceService>(GeminiVoiceService);
  });

  describe('Tool Declaration Boundary', () => {
    it('should include platform sales tools ONLY for isPlatform = true', () => {
      const platformTools = getToolsForArchetype('general', true);
      const toolNames = platformTools.map((t) => t.name);

      expect(toolNames).toContain('get_pricing_plans');
      expect(toolNames).toContain('capture_sales_lead');
      expect(toolNames).toContain('get_integration_guide');
      expect(toolNames).toContain('navigate_to_page');
      expect(toolNames).not.toContain('add_to_cart');
      expect(toolNames).not.toContain('place_order');
    });

    it('should NOT leak platform tools to merchant storefront agents', () => {
      const merchantTools = getToolsForArchetype('ecommerce', false);
      const toolNames = merchantTools.map((t) => t.name);

      expect(toolNames).not.toContain('get_pricing_plans');
      expect(toolNames).not.toContain('capture_sales_lead');
      expect(toolNames).not.toContain('get_integration_guide');
      expect(toolNames).toContain('find_products');
      expect(toolNames).toContain('get_product_details');
      expect(toolNames).toContain('add_to_cart');
      expect(toolNames).toContain('place_order');
    });
  });

  describe('System Instruction Prompt Boundary', () => {
    it('should inject ORA SaaS pricing and tryora.live sitemap ONLY for biz_live_ora_platform_system', async () => {
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_platform',
          name: 'ORA Platform',
          publishableKey: 'biz_live_ora_platform_system',
        }),
      });

      const instruction = await service.buildSystemInstruction('biz_platform');

      // Platform host agent checks
      expect(instruction).toContain('You represent the ORA SaaS platform');
      expect(instruction).toContain('Free Tier: $0 USD/mo');
      expect(instruction).toContain('Growth Plan: $49 USD/mo');
      expect(instruction).toContain('Scale Plan: $199 USD/mo');
      expect(instruction).toContain('/pricing');
      expect(instruction).toContain('/dashboard');
      expect(instruction).toContain('/admin');
    });

    it('should NOT leak ORA platform pricing, sitemaps, or admin routes to merchant stores', async () => {
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_merchant_123',
          name: 'Apex Footwear Store',
          publishableKey: 'biz_live_merchant_apex_987',
        }),
      });

      const instruction = await service.buildSystemInstruction('biz_merchant_123');

      // Merchant store agent checks
      expect(instruction).toContain('Apex Footwear Store');
      expect(instruction).toContain('Leather Running Shoes');
      expect(instruction).toContain('ZERO PLATFORM LEAKAGE RULE');

      // Strict negative assertions (MUST NOT LEAK)
      expect(instruction).not.toContain('$49 USD/mo');
      expect(instruction).not.toContain('$199 USD/mo');
      expect(instruction).not.toContain('Free Tier: $0');
      expect(instruction).not.toContain('Growth Plan');
      expect(instruction).not.toContain('Scale Plan');
      expect(instruction).not.toContain('/pricing');
      expect(instruction).not.toContain('/admin');
      expect(instruction).not.toContain('Stripe (USD cards) and bKash (BDT tokenized checkout)');
    });

    it('should enforce English default and forbid unprompted foreign languages in system instructions', async () => {
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_platform',
          name: 'ORA Platform',
          publishableKey: 'biz_live_ora_platform_system',
        }),
      });

      const instruction = await service.buildSystemInstruction('biz_platform');

      expect(instruction).toContain('PRIMARY DEFAULT LANGUAGE: ENGLISH');
      expect(instruction).toContain('NEVER speak in Chinese, Cantonese, Mandarin, Japanese');
      expect(instruction).toContain('CONDITIONAL LANGUAGE SWITCHING');
    });

    it('should include consultative sales objection handling playbook and off-topic cartoon deflection', async () => {
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_platform',
          name: 'ORA Platform',
          publishableKey: 'biz_live_ora_platform_system',
        }),
      });

      const instruction = await service.buildSystemInstruction('biz_platform');

      // Objection handling
      expect(instruction).toContain('SALES CONVERSION & OBJECTION HANDLING PLAYBOOK');
      expect(instruction).toContain('This site isn\'t for me');

      // Generalized off-topic deflection
      expect(instruction).toContain('STRICT OFF-TOPIC GUARDRAIL & ZERO-ENTERTAINMENT RULE');
      expect(instruction).toContain('ZERO-TOLERANCE FOR OFF-TOPIC CHAT');
      expect(instruction).toContain('UNIVERSAL DEFLECTION PATTERN');
    });

    it('should assign General Business Sales Representative persona when business is general and has no products', async () => {
      mockAgentConfigService.getConfig.mockResolvedValue({
        activeArchetype: 'general',
        config: { brandVoiceDescription: 'Warm and professional' },
        voice: { voiceId: 'Aoede' },
        playbook: {},
      });
      mockProductsService.findAll.mockResolvedValue({
        items: [],
        pagination: { total: 0 },
      });
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_consulting_456',
          name: 'Acme Advisory Group',
          publishableKey: 'biz_live_merchant_acme_456',
        }),
      });

      const instruction = await service.buildSystemInstruction('biz_consulting_456');

      expect(instruction).toContain('Acme Advisory Group');
      expect(instruction).toContain('warm, knowledgeable, and professional AI Sales Representative');
      expect(instruction).not.toContain('shopping assistant');
      expect(instruction).not.toContain('guide them through checkout');
      expect(instruction).not.toContain('add_to_cart / place_order');
      expect(instruction).toContain('capture_sales_lead');
    });

    it('should give general archetype lead capture tools and NO cart or checkout tools', () => {
      const generalTools = getToolsForArchetype('general', false);
      const toolNames = generalTools.map((t) => t.name);

      expect(toolNames).toContain('capture_sales_lead');
      expect(toolNames).toContain('search_knowledge_base');
      expect(toolNames).toContain('get_store_policy');
      expect(toolNames).not.toContain('add_to_cart');
      expect(toolNames).not.toContain('place_order');
      expect(toolNames).not.toContain('redirect_to_checkout');
      expect(toolNames).not.toContain('find_products');
    });
  });
});
