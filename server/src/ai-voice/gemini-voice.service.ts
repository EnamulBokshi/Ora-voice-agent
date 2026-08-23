import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import WebSocket from 'ws';
import { ORA_TOOL_DECLARATIONS, getToolsForArchetype } from './tools/ai-tools.definition';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { ProductsService } from '../products/products.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminUser, AdminUserDocument } from '../users/schemas/admin-user.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';

export interface GeminiVoiceSessionOptions {
  businessId: string;
  sessionId: string;
  customerId?: string;
  deviceId?: string;
  authenticatedUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  clientContext?: {
    currentPath?: string;
    title?: string;
    history?: string[];
    activeSection?: string;
  };
  onAudioData: (base64AudioPcm: string) => void;
  onTextData?: (text: string) => void;
  /** Called when Gemini signals a barge-in / interruption */
  onInterrupted?: () => void;
  /** Called when Gemini signals the agent has finished its turn */
  onTurnComplete?: () => void;
  /** Called after each tool is executed server-side (toolName & result for UI actions) */
  onToolResult?: (toolName: string, result?: any) => void;
  onError?: (err: any) => void;
  onClose?: () => void;
}

export interface GeminiVoiceSessionControls {
  sendAudioChunk: (base64Pcm16k: string) => void;
  sendTextMessage: (text: string) => void;
  sendContextUpdate: (context: { currentPath?: string; title?: string; history?: string[]; activeSection?: string }) => void;
  closeSession: () => void;
}

@Injectable()
export class GeminiVoiceService {
  private readonly logger = new Logger(GeminiVoiceService.name);
  private readonly instructionCache = new Map<string, { instruction: string; archetype: string; voiceName: string; expiresAt: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly aiToolsExecutor: AiToolsExecutor,
    private readonly agentConfigService: AgentConfigService,
    @Optional()
    private readonly productsService?: ProductsService,
    @Optional()
    private readonly knowledgeService?: KnowledgeService,
    @Optional()
    @InjectModel(Business.name)
    private readonly businessModel?: Model<BusinessDocument>,
    @Optional()
    @InjectModel(AdminUser.name)
    private readonly adminUserModel?: Model<AdminUserDocument>,
    @Optional()
    @InjectModel(Customer.name)
    private readonly customerModel?: Model<CustomerDocument>,
  ) { }


  async createVoiceSession(options: GeminiVoiceSessionOptions): Promise<GeminiVoiceSessionControls> {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured. Add a valid Google AI Studio key (starts with AIzaSy...) to server/.env',
      );
    }

    // Support both legacy AIza... keys and new AQ.Ab... Auth keys from Google AI Studio
    if (!apiKey.startsWith('AIza') && !apiKey.startsWith('AQ.Ab')) {
      this.logger.warn(
        `[GeminiVoiceService] GEMINI_API_KEY has an unusual prefix: '${apiKey.substring(0, 6)}...'. Proceeding with WebSocket connection attempt.`,
      );
    }

    const host = 'generativelanguage.googleapis.com';

    // Default Live Bidi model identifier supported by Google AI Studio
    const geminiModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'models/gemini-2.5-flash-native-audio-latest';

    this.logger.log(
      `[GeminiVoiceService] Connecting to Gemini Live API — model: ${geminiModel}, session: ${options.sessionId}`,
    );

    const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const ws = new WebSocket(uri);

    const systemInstructionText = await this.buildSystemInstruction(
      options.businessId,
      options.customerId,
      options.deviceId,
      options.clientContext,
      options.authenticatedUser,
    );

    const cached = this.instructionCache.get(options.businessId);
    const archetype = cached?.archetype || 'general';

    // Track whether Gemini has acknowledged the setup handshake
    let setupCompleted = false;

    // Promise that resolves when Gemini acknowledges setup, or rejects on connection failure
    return new Promise((resolve, reject) => {
      // Timeout if setup takes too long (10 seconds)
      const setupTimeout = setTimeout(() => {
        if (!setupCompleted) {
          ws.close();
          reject(
            new Error(
              'Gemini Live API setup timed out after 10s. Check your API key and model.',
            ),
          );
        }
      }, 10000);

      // Define session controls (used after setup is confirmed)
      const sessionControls = {
        sendAudioChunk: (base64Pcm16k: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            const realtimeInput = {
              realtimeInput: {
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Pcm16k,
                },
              },
            };
            ws.send(JSON.stringify(realtimeInput));
          }
        },
        sendTextMessage: (text: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            const clientContent = {
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text }],
                  },
                ],
                turnComplete: true,
              },
            };
            ws.send(JSON.stringify(clientContent));
          }
        },
        sendContextUpdate: (ctx: { currentPath?: string; title?: string; history?: string[]; activeSection?: string }) => {
          if (ws.readyState === WebSocket.OPEN) {
            const histStr = ctx.history && ctx.history.length > 0 ? ctx.history.join(' -> ') : ctx.currentPath || '/';
            const contextText = `[CLIENT_BROWSING_STATE_UPDATE: Visitor is now viewing page "${ctx.currentPath || '/'}" (Page Title: "${ctx.title || ''}"${ctx.activeSection ? `, Active Section: "${ctx.activeSection}"` : ''}). Browsing history: ${histStr}. Note: The visitor is browsing the ORA platform site. Marketing headlines on the page (such as "Supercharge Your Store") are platform features, not a store name. Rule: The visitor is ALREADY on this page. Do NOT suggest navigating to ${ctx.currentPath || '/'} or ask if they want to go there.]`;
            const clientContent = {
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: contextText }],
                  },
                ],
                turnComplete: false,
              },
            };
            ws.send(JSON.stringify(clientContent));
          }
        },
        closeSession: () => {
          if (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
          ) {
            ws.close();
          }
        },
      };

      ws.on('open', () => {
        this.logger.log(
          `[GeminiVoiceService] WebSocket transport connected for session ${options.sessionId}`,
        );

        const cached = this.instructionCache.get(options.businessId);
        const archetype = cached?.archetype || 'general';
        const voiceName = cached?.voiceName || 'Aoede';

        // Send Setup Handshake Payload with dynamic merchant voice
        const setupPayload = {
          setup: {
            model: geminiModel,
            generationConfig: {
              responseModalities: ['AUDIO'],
              thinkingConfig: {
                thinkingBudget: 0,
              },
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName,
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstructionText }],
            },
            tools: [
              {
                functionDeclarations: getToolsForArchetype(archetype),
              },
            ],
          },
        };

        ws.send(JSON.stringify(setupPayload));
        this.logger.log(
          `[GeminiVoiceService] Setup payload sent (Archetype: ${archetype}, Voice: ${voiceName}), waiting for Gemini acknowledgement...`,
        );
      });

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const messageStr = data.toString('utf8');
          const response = JSON.parse(messageStr);

          // First message from Gemini should be the setupComplete acknowledgement
          if (response.setupComplete && !setupCompleted) {
            setupCompleted = true;
            clearTimeout(setupTimeout);
            this.logger.log(
              `[GeminiVoiceService] ✅ Gemini Live session setup CONFIRMED for session ${options.sessionId}`,
            );

            // NOW it's safe to resolve — the session is live
            resolve(sessionControls);
            return;
          }

          // Barge-in / interruption signal
          if (response.serverContent?.interrupted) {
            options.onInterrupted?.();
          }

          // Turn complete signal
          if (response.serverContent?.turnComplete) {
            options.onTurnComplete?.();
          }

          // Process audio & text output from model
          if (response.serverContent?.modelTurn?.parts) {
            for (const part of response.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                options.onAudioData(part.inlineData.data);
              }
              if (part.text && options.onTextData) {
                // Filter out thinking/reasoning text (bold headers, internal analysis)
                const text = part.text.trim();
                if (
                  text &&
                  !text.startsWith('**') &&
                  !text.startsWith('##') &&
                  !text.startsWith('# ')
                ) {
                  options.onTextData(text);
                }
              }
            }
          }

          // Process function/tool calls requested by Gemini
          if (response.toolCall) {
            const functionCalls = response.toolCall.functionCalls || [];
            if (functionCalls.length > 0) {
              const functionResponses = await Promise.all(
                functionCalls.map(async (call: any) => {
                  this.logger.log(
                    `[GeminiVoiceService] Gemini requested tool execution: ${call.name} (callId: ${call.id})`,
                  );

                  let toolResult: any;
                  try {
                    toolResult = await this.aiToolsExecutor.executeTool(
                      options.businessId,
                      options.sessionId,
                      call.name,
                      call.args || {},
                    );
                  } catch (err: any) {
                    this.logger.error(
                      `[GeminiVoiceService] Error executing tool ${call.name}: ${err.message}`,
                    );
                    toolResult = {
                      success: false,
                      error: err.message,
                      products: [],
                    };
                  }

                  // Notify proxy gateway with tool result and any action payload (e.g. navigation)
                  options.onToolResult?.(call.name, toolResult);

                  return {
                    id: call.id,
                    name: call.name,
                    response: { output: toolResult },
                  };
                }),
              );

              // Return batched tool execution outputs back to Gemini WebSocket
              const toolResponsePayload = {
                toolResponse: {
                  functionResponses,
                },
              };

              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(toolResponsePayload));
              }
            }
          }
        } catch (err: any) {
          this.logger.error(
            `[GeminiVoiceService] Error handling WebSocket message: ${err.message}`,
          );
        }
      });

      ws.on('error', (err) => {
        this.logger.error(
          `[GeminiVoiceService] WebSocket error for session ${options.sessionId}: ${err.message}`,
        );
        if (!setupCompleted) {
          clearTimeout(setupTimeout);
          reject(err);
        } else if (options.onError) {
          options.onError(err);
        }
      });

      ws.on('close', (code, reason) => {
        this.logger.log(
          `[GeminiVoiceService] WebSocket closed for session ${options.sessionId} (code: ${code}, reason: ${reason?.toString()})`,
        );
        if (!setupCompleted) {
          clearTimeout(setupTimeout);
          reject(new Error(`WebSocket closed before setup completed (code: ${code})`));
        } else if (options.onClose) {
          options.onClose();
        }
      });
    });
  }

  async buildSystemInstruction(
    businessId: string,
    customerId?: string,
    deviceId?: string,
    clientContext?: {
      currentPath?: string;
      title?: string;
      history?: string[];
      activeSection?: string;
    },
    authenticatedUser?: {
      id: string;
      name: string;
      email: string;
      role: string;
    },
  ): Promise<string> {
    let baseInstruction = '';
    let businessArchetype = 'general';
    const cached = this.instructionCache.get(businessId);
    if (cached && cached.expiresAt > Date.now()) {
      baseInstruction = cached.instruction;
      businessArchetype = cached.archetype || 'general';
    } else {
      let merchantBrandVoice = '';
      let businessSummary = '';
      let customDirectives = '';

      // Parallelize all independent DB calls concurrently with Promise.all
      const [agentConfig, bizDoc, ownerUser, productsRes, docsRes] = await Promise.all([
        this.agentConfigService.getConfig(businessId).catch(() => null),
        this.businessModel ? this.businessModel.findById(businessId).exec().catch(() => null) : Promise.resolve(null),
        this.adminUserModel
          ? this.adminUserModel
              .findOne({ businessId: businessId as any })
              .sort({ createdAt: 1 })
              .exec()
              .catch(() => null)
          : Promise.resolve(null),
        this.productsService ? this.productsService.findAll(businessId, { limit: 12 }).catch(() => null) : Promise.resolve(null),
        this.knowledgeService
          ? this.knowledgeService.findAll(businessId, undefined, undefined, { limit: 10 }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (agentConfig?.config?.brandVoiceDescription) {
        merchantBrandVoice = `\nMerchant Brand Voice / Tone: ${agentConfig.config.brandVoiceDescription}`;
      }
      if (agentConfig?.config?.businessArchetype) {
        businessArchetype = agentConfig.config.businessArchetype;
      }
      if (agentConfig?.config?.businessSummary) {
        businessSummary = `\nPlatform Overview: ${agentConfig.config.businessSummary}`;
      }
      if (agentConfig?.config?.customDirectives) {
        customDirectives = `\nOWNER / MERCHANT CUSTOM DIRECTIVES:\n${agentConfig.config.customDirectives}`;
      }

      // 1. Preload Business Identity & Owner Contact Info (Email, Name, Domain)
      let contactIdentitySummary = '';
      const siteName = bizDoc?.name || '';
      const ownerName = ownerUser?.name || '';

      const identityLines: string[] = [];
      if (bizDoc?.name) identityLines.push(`• Entity / Website Name: ${bizDoc.name}`);
      if (bizDoc?.domain) identityLines.push(`• Website Domain: ${bizDoc.domain}`);
      if (ownerUser?.name) identityLines.push(`• Creator / Owner Name: ${ownerUser.name}`);
      if (ownerUser?.email) identityLines.push(`• Official Contact Email: ${ownerUser.email}`);

      if (identityLines.length > 0) {
        contactIdentitySummary = `\nCONTACT & IDENTITY INFO (Preloaded in your memory):\n${identityLines.join('\n')}\n* Answer contact, email, and creator questions IMMEDIATELY using these details!`;
      }

      const isOraPlatform =
        businessArchetype === 'saas' ||
        bizDoc?.publishableKey === 'biz_live_ora_platform_system' ||
        (siteName || '').trim().toLowerCase() === 'ora platform' ||
        (siteName || '').trim().toLowerCase() === 'ora';

      let catalogSummary = '';
      let hasProducts = false;
      if (!isOraPlatform && businessArchetype !== 'saas' && businessArchetype !== 'portfolio' && businessArchetype !== 'agency_services') {
        if (productsRes && productsRes.items && productsRes.items.length > 0) {
          hasProducts = true;
          const categories = Array.from(
            new Set(productsRes.items.map((p) => p.category).filter(Boolean)),
          );
          const sampleLines = productsRes.items
            .map(
              (p) =>
                `  • ${p.name} — ${p.currency || 'USD'} ${p.price} (${p.availability || 'in stock'}${p.category ? `, ${p.category}` : ''})`,
            )
            .join('\n');

          catalogSummary = `\nSTORE CATALOG CONTEXT (Preloaded in your memory):\n- Categories: ${categories.join(', ') || 'General'}\n- Featured Inventory Items:\n${sampleLines}\n- Total Catalog Size: ${productsRes.pagination.total} items\n* Note: You can answer questions about these featured items directly without searching!`;
        }
      }

      let knowledgeSummary = '';
      let hasKnowledge = false;
      if (docsRes && docsRes.items && docsRes.items.length > 0) {
        hasKnowledge = true;
        const docSnippets = docsRes.items
          .map((d: any) => {
            const cleanSnippet = (d.content || '')
              .replace(/\s+/g, ' ')
              .slice(0, 300)
              .trim();
            return `  • [${d.title}]: ${cleanSnippet}${cleanSnippet.length >= 300 ? '...' : ''}`;
          })
          .join('\n');

        knowledgeSummary = `\nWEBSITE, PROJECTS & BUSINESS KNOWLEDGE (Preloaded in your memory):\n${docSnippets}\n* Note: You can answer questions covered by these topics immediately without calling search tools!`;
      }

      // ─── Adaptive Archetype Persona Construction ───────────────────────────
      let persona = '';

      if (isOraPlatform) {
        persona = `You are ORA, the flagship Voice AI Sales & Onboarding Representative for the ORA Platform (tryora.live / ora.ai).

PLATFORM IDENTITY & MISSION:
- You represent the ORA SaaS platform. ORA provides autonomous multimodal real-time Voice AI sales agents for e-commerce merchants, stores, and creators.
- You are NOT an e-commerce retail store. You do NOT sell physical goods, lighting, fans, or hardware.
- Taglines such as "Supercharge Your Store With Autonomous Voice AI" are marketing headlines describing what ORA does for merchants. NEVER refer to this website or yourself as "Supercharger store" or "the Supercharger store".
- The visitors speaking with you are merchants, online store owners, agency founders, and developers interested in testing ORA or subscribing to deploy ORA on their own stores.

PLANS & PRICING (Preloaded in memory — answer immediately without tool delay):
• Free Tier: $0 USD/mo (৳0 BDT) — 100 Voice Minutes, 20 Tier-1 Orders, 1 Connected Store, Basic RAG Search.
• Growth Plan: $49 USD/mo (৳5,500 BDT) — 2,000 Voice Minutes, 500 Tier-1 Orders, 3 Connected Stores, 5 Staff Seats, Full RAG Vector Search, Webhook Sync, Custom Brand Voice Directives.
• Scale Plan: $199 USD/mo (৳22,000 BDT) — Unlimited Voice Minutes, Unlimited Orders, 99 Connected Stores, 99 Seats, Dedicated SLA, Priority Support.
We support instant online checkout with Stripe (USD cards) and bKash (BDT tokenized checkout). When a visitor asks how to buy or see plans, explain the options directly in voice. If they are not already on the pricing page, invoke navigate_to_page with "/pricing". If they are ALREADY on /pricing, refer to the pricing options right in front of them without asking to navigate there.`;
      } else if (businessArchetype === 'portfolio') {
        persona = `You are ORA, ${ownerName ? `${ownerName}'s` : 'the creator\'s'} personal AI assistant and representative for this website and portfolio. Your primary mission is to warmly introduce visitors, recruiters, and clients to ${ownerName || 'the engineer'}'s background, featured projects, tech stack, and achievements, and help them get in touch or book a technical consultation.`;
      } else if (businessArchetype === 'agency_services') {
        persona = `You are ORA, senior client strategy specialist for ${siteName || 'this agency'}. Your mission is to explain our design, engineering, and consulting services, highlight past case studies, and guide prospects to book a discovery call.`;
      } else if (businessArchetype === 'ecommerce' || hasProducts) {
        persona = `You are ORA, a friendly, ultra-fast, and professional AI sales and shopping assistant for ${siteName || 'this store'}. You help shoppers discover products, check styles, availability, and guide them through checkout.`;
      } else {
        persona = `You are ORA, an intelligent, friendly AI representative and personal assistant for ${siteName || ownerName || 'this website'}.`;
      }

      const sitemapDirectory = `
APPLICATION SITEMAP & NAVIGATION DIRECTORY (Exact routes available in this application):
• Public & Marketing Routes:
  - "/" : Landing Page / Home (Hero section, live interactive demo, #features, #stats, #cta).
  - "/pricing" : Transparent Multimodal AI Pricing ($0 Free, $49 Growth, $199 Scale, Stripe & bKash checkout).
  - "/auth?mode=register" : Merchant Account Registration / Sign Up / Create Account.
  - "/auth?mode=login" : Merchant Login / Sign In.
  - "/auth?mode=login&from=/dashboard" : Merchant Login with direct redirect to Dashboard.
  - "/auth?mode=register&from=/dashboard" : Merchant Registration with direct redirect to Dashboard.
• Merchant Dashboard Routes (for registered store owners and operators):
  - "/dashboard" : Merchant Command Center, Real-Time Revenue, AI Performance & Store Overview.
  - "/live-desk" : Live Shopper Voice & Chat Monitor.
  - "/conversations" : Past Conversation History, Transcripts & Audio Logs.
  - "/agent" : Voice Agent Configuration, Brand Voice Directives, and Widget Embed Script.
  - "/customers" : Customer CRM & Shopper Identity Profiles.
  - "/billing" : Subscription Management, Payment Methods, and Invoices.
  - "/profile" : Merchant Store Profile & Settings.
• Platform Admin Routes:
  - "/admin" : SuperAdmin Command Center & Platform Control Plane.
• In-Page Section Anchors (on Landing Page):
  - "#features" : Platform Features & Zero-Config Capabilities.
  - "#stats" : Real-Time Performance Stats & Sub-400ms Metrics.
  - "#cta" : Call to Action Section.
  - "#solutions" : Multi-channel E-commerce Solutions.
  - "#docs" : Documentation, API & Integration Guide Anchor.

* DASHBOARD & AUTHENTICATION NAVIGATION RULES:
1. AUTHENTICATED USER ASKS FOR DASHBOARD:
   - When an authenticated logged-in user asks to "go to dashboard", "open dashboard", "show store metrics", "view my store", or "open command center":
     * If user role is "owner" or "staff": Respond verbally in 1 short sentence ("Taking you to your dashboard now, [Name]!") and IMMEDIATELY call navigate_to_page with destination "/dashboard".
     * If user role is "admin" or "super_admin": Respond verbally in 1 short sentence ("Taking you to the admin command center now, [Name]!") and IMMEDIATELY call navigate_to_page with destination "/admin".
     * If they ask for a specific section (e.g. live desk, billing, conversations, agent config, customers, profile): Call navigate_to_page with that specific dashboard route (e.g. "/live-desk", "/billing", "/conversations", "/agent", "/customers", "/profile").

2. UNAUTHENTICATED GUEST USER ASKS FOR DASHBOARD:
   - When an unauthenticated guest visitor asks to "go to dashboard", "open my dashboard", "log in", "sign in", "create account", "register", or "access merchant portal":
     * Inform them warmly in 1 short sentence: "To access the dashboard, you need to log in or create an account first. Let's get you signed in right now!"
     * IMMEDIATELY call navigate_to_page with destination "/auth?mode=login&from=/dashboard" (or "/auth?mode=register&from=/dashboard" if they asked to register/create account).

3. GENERAL NAVIGATION & MANUALS/DOCS:
   - When a user asks for documentation, manuals, or setup guides:
     * Explain our 60-second setup verbally and answer their questions directly (or call get_integration_guide if they specify a platform like Shopify, WooCommerce, Next.js, or HTML).
     * If they want to view documentation/features, call navigate_to_page with destination "#features" (or "#docs"). Never navigate to "/doc" or "/docs".
   - When a user asks to see pricing, cost, or plans -> call navigate_to_page with destination "/pricing".
   - When a user asks to go home or landing page -> call navigate_to_page with destination "/".
   - When a user asks to view features -> call navigate_to_page with destination "#features".
   - When a user asks to register or sign up -> call navigate_to_page with destination "/auth?mode=register".
   - When a user asks to log in -> call navigate_to_page with destination "/auth?mode=login".
   - If the visitor is ALREADY on the requested destination, do NOT navigate—acknowledge that they are looking at it right now!`;

      baseInstruction = [
        persona,
        businessSummary,
        merchantBrandVoice,
        customDirectives,
        contactIdentitySummary,
        catalogSummary,
        knowledgeSummary,
        sitemapDirectory,
        '',
        'CRITICAL RULES FOR REAL-TIME VOICE:',
        '1. You are speaking out loud in a real-time voice conversation. Keep responses CONCISE (1-3 sentences max). Speak naturally and enthusiastically like a human expert.',
        '2. NEVER output markdown (no **, no ##, no bullet points, no asterisks). You are SPEAKING out loud, not typing text.',
        '3. NEVER output internal reasoning or delay messages (do not say "Hold on while I check" or "Querying database").',
        '4. FAST-PATH DIRECT ANSWERS (ZERO-TOOL DELAY): If the visitor asks who you are, what ORA does, pricing plans, how to buy, contact email, website URL, features, or how to integrate, answer IMMEDIATELY from your preloaded memory above with sub-400ms latency. Do not block voice audio.',
        '5. WHEN TO USE TOOLS (WHILE SPEAKING):',
        businessArchetype === 'ecommerce' || hasProducts ? '   - find_products: ONLY when the customer asks for a specific item, category, or price range NOT already listed above.' : '',
        businessArchetype === 'ecommerce' || hasProducts ? '   - add_to_cart / place_order: When the customer explicitly asks to purchase or add items to their cart.' : '',
        '   - navigate_to_page: Call whenever a visitor asks to view a section or page from the sitemap directory above (e.g. "/dashboard", "/pricing", "/auth?mode=login&from=/dashboard", "/auth?mode=register", "#features"). Speak your response while triggering navigation!',
        '   - capture_sales_lead: Call whenever a prospect shares their email, phone, store domain, or desired plan for sales follow-up.',
        '   - get_integration_guide: Call when a developer or merchant asks how to integrate ORA into Shopify, WooCommerce, Next.js, or HTML.',
        '   - update_customer_profile: Call whenever the customer shares their name or preferences.',
        '   - update_agent_directives: Call when the owner/merchant provides new directives, rules, or instructions during voice setup.',
        '   - search_knowledge_base / get_store_policy: ONLY when the customer asks for specific obscure details not covered in the knowledge summary above.',
        '6. When a tool returns empty results or if information is not found, politely inform the visitor without making up fake products.',
        '7. If the visitor speaks Bengali or another language, respond naturally in their language.',
      ]
        .filter(Boolean)
        .join('\n');

      const voiceName = agentConfig?.voice?.voiceId || 'Aoede';

      // Cache base template for 5 minutes
      this.instructionCache.set(businessId, {
        instruction: baseInstruction,
        archetype: businessArchetype,
        voiceName: voiceName,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }

    // 2. Dynamically Inject Active User / Recognition Context (Per-Session)
    let customerContext = '';
    if (authenticatedUser) {
      customerContext = `
ACTIVE VISITOR CONTEXT (Authenticated Logged-In User):
- Visitor Name: ${authenticatedUser.name || 'Merchant User'}
- Email Address: ${authenticatedUser.email}
- Account Role: ${authenticatedUser.role || 'owner'}
- Authentication Status: Authenticated Logged-In User

* INTERACTION RULES FOR AUTHENTICATED USER:
1. Warmly recognize and greet them by name ("Welcome back, ${authenticatedUser.name || ''}!").
2. When the user asks "who am I?", "what is my email?", "do you know me?", or "what is my role/account?", answer IMMEDIATELY and accurately from the authenticated user context above with 100% confidence.
3. When the user asks to go to dashboard or open command center, IMMEDIATELY call navigate_to_page with "/dashboard" (or "/admin" if admin/super_admin) while confirming verbally.
4. You are ORA. Answer their questions about the platform, features, pricing, or their merchant store operations.`;
    } else if (this.customerModel && customerId) {
      try {
        const cust = await this.customerModel.findById(customerId).exec();
        const isKnownName = cust && cust.name && cust.name !== 'Guest Shopper';
        const prefs =
          cust?.extractedPreferences && Object.keys(cust.extractedPreferences).length > 0
            ? JSON.stringify(cust.extractedPreferences)
            : null;

        const devId = deviceId || (cust?.deviceIds && cust.deviceIds[0]) || null;

        customerContext = `
ACTIVE USER & RECOGNITION CONTEXT (Guest Visitor):
- Customer Name: ${isKnownName ? cust!.name : 'Guest Visitor (Unauthenticated)'}
- Account Status: Guest Visitor (Unauthenticated)
- Device ID: ${devId || 'Active Browser Session'}
${prefs ? `- Saved Preferences: ${prefs}` : ''}

* GUEST DISCOVERY & INFORMATION GATHERING PLAYBOOK:
1. If the visitor asks "do you know me?" or "who am I?":
   - If their name is known ("${isKnownName ? cust!.name : ''}"), warmly greet them by name ("Yes! You are ${isKnownName ? cust!.name : ''}. Great to see you again!").
   - If unknown, answer naturally: "You are visiting as a guest right now! May I have your name and email so I can assist you better?"
2. When a guest asks to access or go to the dashboard:
   - Tell them: "To access the dashboard, you need to log in or create an account first. Let's get you signed in right now!"
   - Call navigate_to_page with "/auth?mode=login&from=/dashboard".
3. When a guest asks about pricing, custom solutions, or getting started, warmly answer their question and naturally ask for their personal details (such as Name, Email, Phone number, Store/Company URL, or specific business requirements).
4. When the visitor introduces themselves (e.g. "I am Enamul", "My name is Enamul", "my email is ...") or shares contact details/preferences, IMMEDIATELY call the update_customer_profile or capture_sales_lead tool in the background so you remember them!`;
      } catch (err: any) {
        this.logger.warn(`[GeminiVoiceService] Customer context injection note: ${err.message}`);
      }
    }

    // 3. Dynamically Inject Real-Time Visitor Browsing Context
    let browsingContext = '';
    if (clientContext) {
      const histStr =
        clientContext.history && clientContext.history.length > 0
          ? clientContext.history.join(' -> ')
          : clientContext.currentPath || '/';
      browsingContext = `
REAL-TIME VISITOR BROWSING STATE (Live Telemetry from Visitor's Browser):
• Current Page: ${clientContext.currentPath || '/'} (${clientContext.title || 'Active Page'})
• Visible Section: ${clientContext.activeSection || 'Top of Page'}
• Session Browsing History: ${histStr}

* REAL-TIME BROWSING AWARENESS RULES:
1. You are 100% aware of where the visitor is in the web app right now.
2. If the visitor is ALREADY on the requested page (e.g. they ask about pricing while on /pricing, or about features while looking at features), acknowledge that they are currently on it (e.g. "As you can see right here on our pricing page...") and NEVER ask if they want to navigate there!
3. If they ask "where am I?", "what page is this?", or "what was the last page I visited?", answer accurately from the real-time browsing state above.`;
    }

    return [baseInstruction, customerContext, browsingContext].filter(Boolean).join('\n\n');
  }

  getToolDeclarations(archetype?: string) {
    return getToolsForArchetype(archetype);
  }

  public invalidateInstructionCache(businessId?: string): void {
    if (businessId) {
      this.instructionCache.delete(businessId);
    } else {
      this.instructionCache.clear();
    }
  }
}
