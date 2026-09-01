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
        config: { brandVoiceDescription: 'Warm and fast', businessArchetype: 'ecommerce' },
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

    it('should inject custom system prompt, Bangla language rules, greetings, and avoidances when configured', async () => {
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_bangla_store',
          name: 'Dhaka Threads',
          publishableKey: 'biz_live_dhaka_threads_456',
        }),
      });

      mockAgentConfigService.getConfig.mockResolvedValue({
        config: {
          brandVoiceDescription: 'Warm, respectful and consultative',
          businessArchetype: 'ecommerce',
          systemPrompt: 'You are the primary sales assistant for Dhaka Threads. Always offer 10% off with promo code EID10.',
          greetingMessage: 'Greet with "আসসালামু আলাইকুম! Dhaka Threads-এ স্বাগতম।" and ask what outfit they are looking for.',
          avoidances: 'Never mention competitors like Aarong or Yellow. Never discuss political matters.',
          language: 'bn',
        },
        voice: { voiceId: 'Aoede' },
        playbook: {},
      });

      const instruction = await service.buildSystemInstruction('biz_bangla_store');

      // Assert custom prompt elements are injected
      expect(instruction).toContain('STORE OWNER CUSTOM SYSTEM PROMPT');
      expect(instruction).toContain('Always offer 10% off with promo code EID10');
      expect(instruction).toContain('LANGUAGE REQUIREMENT (STRICT)');
      expect(instruction).toContain('Bengali (Bangla / বাংলা)');
      expect(instruction).toContain('GREETING & CUSTOMER TREATMENT GUIDELINES');
      expect(instruction).toContain('আসসালামু আলাইকুম! Dhaka Threads-এ স্বাগতম।');
      expect(instruction).toContain('STRICT AVOIDANCES & RESTRICTIONS');
      expect(instruction).toContain('Never mention competitors like Aarong or Yellow');
    });
  });
});
