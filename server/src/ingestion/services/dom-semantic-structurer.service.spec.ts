import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DomSemanticStructurerService } from './dom-semantic-structurer.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { ProductsService } from '../../products/products.service';
import { AgentConfig } from '../../agent-config/schemas/agent-config.schema';
import { AgentProfileService } from '../../common/agent-profile/agent-profile.service';

describe('DomSemanticStructurerService', () => {
  let service: DomSemanticStructurerService;
  let mockKnowledgeService: any;
  let mockProductsService: any;
  let mockAgentConfigModel: any;
  let mockAgentProfileService: any;

  beforeEach(async () => {
    mockKnowledgeService = {
      upsertExtractedDoc: jest.fn().mockResolvedValue({ updated: true, chunksCount: 1 }),
    };

    mockProductsService = {
      batchSync: jest.fn().mockResolvedValue({ inserted: 1, updated: 0, failed: 0 }),
    };

    const mockConfigDoc = {
      archetype: 'general',
      businessSummary: '',
      save: jest.fn().mockResolvedValue(true),
    };

    // The business starts on the default profile, which is the only state in
    // which a crawl is allowed to classify it.
    mockAgentProfileService = {
      getActiveArchetype: jest.fn().mockResolvedValue('general'),
      setActiveArchetype: jest.fn().mockImplementation(async (_id: string, a: string) => a),
    };

    mockAgentConfigModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConfigDoc),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomSemanticStructurerService,
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: getModelToken(AgentConfig.name), useValue: mockAgentConfigModel },
        { provide: AgentProfileService, useValue: mockAgentProfileService },
      ],
    }).compile();

    service = module.get<DomSemanticStructurerService>(DomSemanticStructurerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly infer portfolio archetype and ingest developer projects', async () => {
    const result = await service.processTelemetry('biz_123', {
      url: 'https://enamul.dev',
      pathname: '/',
      title: 'Enamul Bokshi — Full Stack Software Engineer',
      metaDescription: 'Portfolio and featured projects in Next.js, Node.js, AI Voice, and distributed systems.',
      headings: [
        { level: 'h1', text: 'Enamul Bokshi' },
        { level: 'h2', text: 'Featured Projects' },
        { level: 'h2', text: 'Tech Stack & Skills' },
      ],
      cards: [
        {
          title: 'ORA Voice AI',
          description: 'Autonomous multimodal real-time AI sales agent.',
          tags: ['Next.js', 'NestJS', 'WebSockets', 'Gemini Live'],
          link: 'https://github.com/ora-voice',
        },
      ],
      contacts: {
        emails: ['enamul@example.com'],
        links: ['https://github.com/enamul', 'https://linkedin.com/in/enamul'],
      },
      bodyTextSnippet: 'Software engineer specializing in distributed systems and real-time AI.',
    });

    expect(result.success).toBe(true);
    expect(result.archetype).toBe('portfolio');
    expect(result.projectsIngested).toBe(1);
    expect(mockKnowledgeService.upsertExtractedDoc).toHaveBeenCalled();
  });

  it('should correctly infer ecommerce archetype and ingest products', async () => {
    const result = await service.processTelemetry('biz_456', {
      url: 'https://mystore.com/products/sneakers',
      pathname: '/products/sneakers',
      title: 'Air Runner Sneakers',
      metaDescription: 'High performance running sneakers.',
      product: {
        name: 'Air Runner Sneakers',
        price: 120,
        currency: 'USD',
        availability: 'in_stock',
        sku: 'SKU-123',
      },
    });

    expect(result.success).toBe(true);
    expect(result.archetype).toBe('ecommerce');
    expect(result.productsIngested).toBe(1);
    expect(mockProductsService.batchSync).toHaveBeenCalled();
  });
});
