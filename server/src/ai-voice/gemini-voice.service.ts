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
import { EncryptionUtil } from '../common/utils/encryption.util';

// Map of supported Gemini Live voices & fallback mapper for legacy OpenAI voice names
const VALID_GEMINI_VOICES = new Set(['Aoede', 'Fenrir', 'Kore', 'Puck', 'Charon']);

const LEGACY_VOICE_MAP: Record<string, string> = {
  alloy: 'Aoede',
  echo: 'Fenrir',
  fable: 'Puck',
  onyx: 'Charon',
  nova: 'Kore',
  shimmer: 'Aoede',
};

export function normalizeGeminiVoice(rawVoice?: string): string {
  if (!rawVoice) return 'Aoede';
  if (VALID_GEMINI_VOICES.has(rawVoice)) return rawVoice;

  const lower = rawVoice.toLowerCase();
  if (LEGACY_VOICE_MAP[lower]) {
    return LEGACY_VOICE_MAP[lower];
  }
  for (const v of VALID_GEMINI_VOICES) {
    if (v.toLowerCase() === lower) return v;
  }
  return 'Aoede';
}

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
  /** Called with each chunk of the user's spoken input transcription (server-side, from Gemini's STT) */
  onInputTranscript?: (text: string, isFinal: boolean) => void;
  /** Called with each chunk of ORA's audio output transcription (server-side, Gemini reads back what it spoke) */
  onOutputTranscript?: (text: string, isFinal: boolean) => void;
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
  private readonly instructionCache = new Map<string, { instruction: string; archetype: string; isPlatform: boolean; voiceName: string; expiresAt: number }>();

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
            const contextText = `[CLIENT_BROWSING_STATE_UPDATE: Visitor is now viewing page "${ctx.currentPath || '/'}" (Page Title: "${ctx.title || ''}"${ctx.activeSection ? `, Active Section: "${ctx.activeSection}"` : ''}). Browsing history: ${histStr}. Rule: The visitor is ALREADY on this page. Do NOT suggest navigating to ${ctx.currentPath || '/'} or ask if they want to go there.]`;
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
        const isPlatform = cached?.isPlatform || false;
        const voiceName = normalizeGeminiVoice(cached?.voiceName);

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
                functionDeclarations: getToolsForArchetype(archetype, isPlatform),
              },
            ],
            // ── Server-side transcription (parallel to audio, zero latency impact) ───
            // inputAudioTranscription: Gemini transcribes the user's microphone audio server-side.
            //   Chunks arrive as serverContent.inputTranscription.text (no browser SpeechRecognition needed).
            // outputAudioTranscription: Gemini transcribes its own synthesised audio back to text.
            //   Chunks arrive as serverContent.outputTranscription.text (solves the AUDIO-only modality gap).
            inputAudioTranscription: {},
            outputAudioTranscription: {},
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

          // Process server-side input transcription (user's spoken words → text)
          // Chunks arrive in real-time while the user speaks; finished=true marks end of utterance
          if (response.serverContent?.inputTranscription?.text) {
            const iText = (response.serverContent.inputTranscription.text as string).trim();
            const iFinished: boolean = response.serverContent.inputTranscription.finished ?? false;
            if (iText) {
              options.onInputTranscript?.(iText, iFinished);
            }
          }

          // Process server-side output transcription (ORA's spoken audio → text)
          // Arrives alongside audio PCM chunks; finished=true marks end of ORA's turn audio
          if (response.serverContent?.outputTranscription?.text) {
            const oText = (response.serverContent.outputTranscription.text as string).trim();
            const oFinished: boolean = response.serverContent.outputTranscription.finished ?? false;
            if (oText) {
              options.onOutputTranscript?.(oText, oFinished);
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
      let customSystemPrompt = '';
      let greetingInstructions = '';
      let avoidanceRules = '';
      let languageDirective = '';

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
      if (agentConfig?.config?.systemPrompt) {
        customSystemPrompt = `\nSTORE OWNER CUSTOM SYSTEM PROMPT:\n${agentConfig.config.systemPrompt}`;
      }
      if (agentConfig?.config?.customDirectives) {
        customDirectives = `\nOWNER / MERCHANT CUSTOM DIRECTIVES:\n${agentConfig.config.customDirectives}`;
      }
      if (agentConfig?.config?.greetingMessage) {
        greetingInstructions = `\nGREETING & CUSTOMER TREATMENT GUIDELINES:\n${agentConfig.config.greetingMessage}`;
      }
      if (agentConfig?.config?.avoidances) {
        avoidanceRules = `\nSTRICT AVOIDANCES & RESTRICTIONS (NEVER VIOLATE):\n${agentConfig.config.avoidances}`;
      }

      // Dynamic Language Directive Generation
      const configLang = (agentConfig?.config?.language || 'en').toLowerCase().trim();
      const languageMap: Record<string, { name: string; nativeName: string; sampleGreeting?: string }> = {
        bn: { name: 'Bengali', nativeName: 'বাংলা', sampleGreeting: 'আসসালামু আলাইকুম / নমস্কার! ORA-তে আপনাকে স্বাগতম। আজ কীভাবে সাহায্য করতে পারি?' },
        bangla: { name: 'Bengali', nativeName: 'বাংলা', sampleGreeting: 'আসসালামু আলাইকুম / নমস্কার! ORA-তে আপনাকে স্বাগতম। আজ কীভাবে সাহায্য করতে পারি?' },
        bengali: { name: 'Bengali', nativeName: 'বাংলা', sampleGreeting: 'আসসালামু আলাইকুম / নমস্কার! ORA-তে আপনাকে স্বাগতম। আজ কীভাবে সাহায্য করতে পারি?' },
        es: { name: 'Spanish', nativeName: 'Español', sampleGreeting: '¡Hola! Bienvenido a nuestra tienda. ¿En qué puedo ayudarte hoy?' },
        fr: { name: 'French', nativeName: 'Français', sampleGreeting: 'Bonjour et bienvenue ! Comment puis-je vous aider aujourd’hui ?' },
        de: { name: 'German', nativeName: 'Deutsch', sampleGreeting: 'Hallo und herzlich willkommen! Wie kann ich Ihnen heute behilflich sein?' },
        hi: { name: 'Hindi', nativeName: 'हिन्दी', sampleGreeting: 'नमस्ते! हमारी दुकान में आपका स्वागत है। आज मैं आपकी क्या मदद कर सकता हूँ?' },
        ar: { name: 'Arabic', nativeName: 'العربية', sampleGreeting: 'مرحباً بكم في متجرنا! كيف يمكنني مساعدتكم اليوم؟' },
        zh: { name: 'Mandarin Chinese', nativeName: '中文', sampleGreeting: '您好！欢迎光临我们的店铺。请问有什么可以帮您的？' },
        ja: { name: 'Japanese', nativeName: '日本語', sampleGreeting: 'いらっしゃいませ！本日はどのような商品をお探しでしょうか？' },
        ko: { name: 'Korean', nativeName: '한국어', sampleGreeting: '안녕하세요! 저희 매장에 오신 것을 환영합니다. 무엇을 도와드릴까요?' },
        pt: { name: 'Portuguese', nativeName: 'Português', sampleGreeting: 'Olá! Bem-vindo à nossa loja. Como posso ajudar você hoje?' },
        it: { name: 'Italian', nativeName: 'Italiano', sampleGreeting: 'Ciao e benvenuto nel nostro negozio! Come posso aiutarti oggi?' },
        nl: { name: 'Dutch', nativeName: 'Nederlands', sampleGreeting: 'Hallo en welkom in onze winkel! Waarmee kan ik u vandaag helpen?' },
        tr: { name: 'Turkish', nativeName: 'Türkçe', sampleGreeting: 'Merhaba, mağazamıza hoş geldiniz! Size bugün nasıl yardımcı olabilirim?' },
        vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', sampleGreeting: 'Xin chào! Chào mừng bạn đến với cửa hàng của chúng tôi. Tôi có thể giúp gì cho bạn?' },
        id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', sampleGreeting: 'Halo! Selamat datang di toko kami. Ada yang bisa saya bantu hari ini?' },
        ru: { name: 'Russian', nativeName: 'Русский', sampleGreeting: 'Здравствуйте! Добро пожаловать. Чем я могу помочь вам сегодня?' },
        pl: { name: 'Polish', nativeName: 'Polski', sampleGreeting: 'Dzień dobry! Witamy w naszym sklepie. W czym mogę dzisiaj pomóc?' },
        sv: { name: 'Swedish', nativeName: 'Svenska', sampleGreeting: 'Hej och välkommen till vår butik! Hur kan jag hjälpa dig i dag?' },
        tl: { name: 'Tagalog / Filipino', nativeName: 'Filipino', sampleGreeting: 'Kumusta! Maligayang pagdating sa aming tindahan. Paano kita matutulungan ngayon?' },
        ur: { name: 'Urdu', nativeName: 'اردو', sampleGreeting: 'السلام علیکم! ہماری دکان میں خوش آمدید۔ میں آج آپ کی کیا مدد کر سکتا ہوں؟' },
        ta: { name: 'Tamil', nativeName: 'தமிழ்', sampleGreeting: 'வணக்கம்! எங்கள் கடைக்கு உங்களை வரவேற்கிறோம். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?' },
        te: { name: 'Telugu', nativeName: 'తెలుగు', sampleGreeting: 'నమస్కారం! మా దుకాణానికి స్వాగతం. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?' },
        mr: { name: 'Marathi', nativeName: 'मराठी', sampleGreeting: 'नमस्कार! आमच्या दुकानात आपले स्वागत आहे. आज मी तुम्हाला कशी मदत करू शकतो?' },
        gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', sampleGreeting: 'નમસ્તે! અમારી દુકાનમાં તમારું સ્વાગત છે. આજે હું તમારી કેવી રીતે મદદ કરી શકું?' },
        th: { name: 'Thai', nativeName: 'ไทย', sampleGreeting: 'สวัสดีครับ/ค่ะ ยินดีต้อนรับสู่ร้านค้าของเรา มีอะไรให้ช่วยไหมครับ/ค่ะ' },
      };

      if (configLang === 'multilingual' || configLang === 'auto') {
        languageDirective = `\nLANGUAGE REQUIREMENT:\n• Automatically detect and respond naturally in whichever language or regional dialect the customer speaks (English, Bengali, Spanish, French, Hindi, Arabic, etc.).`;
      } else if (configLang === 'bn' || configLang === 'bangla' || configLang === 'bengali') {
        languageDirective = `\nLANGUAGE REQUIREMENT (STRICT):\n• You MUST speak exclusively in Bengali (Bangla / বাংলা). All greetings, product explanations, answers, and checkout guidance must be delivered in natural, fluent Bangla.\n• Greet the customer in Bangla (e.g. "আসসালামু আলাইকুম / নমস্কার! ORA-তে আপনাকে স্বাগতম। আজ আপনাকে কীভাবে সাহায্য করতে পারি?").\n• If the user explicitly speaks English, you may briefly answer in English, but default to Bangla.`;
      } else if (languageMap[configLang]) {
        const langInfo = languageMap[configLang];
        languageDirective = `\nLANGUAGE REQUIREMENT (STRICT):\n• You MUST speak exclusively in ${langInfo.name} (${langInfo.nativeName}). All greetings, product explanations, answers, and checkout guidance must be delivered in natural, fluent ${langInfo.name}.\n${langInfo.sampleGreeting ? `• Greet the customer naturally in ${langInfo.name} (e.g. "${langInfo.sampleGreeting}").\n` : ''}• If the user explicitly speaks another language, you may briefly answer in that language, but default to ${langInfo.name}.`;
      } else if (configLang && configLang !== 'en') {
        languageDirective = `\nLANGUAGE REQUIREMENT (STRICT):\n• You MUST speak and respond in ${configLang}. Ensure natural pronunciation, polite phrasing, and grammatically correct phrasing.`;
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

      const isOraPlatform = bizDoc?.publishableKey === 'biz_live_ora_platform_system';

      let catalogSummary = '';
      let hasProducts = false;
      if (!isOraPlatform && businessArchetype !== 'saas' && businessArchetype !== 'portfolio' && businessArchetype !== 'agency_services' && businessArchetype !== 'consulting') {
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
      if (docsRes && docsRes.items && docsRes.items.length > 0) {
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

      // ─── Persona & System Instruction Construction ────────────────────────
      if (isOraPlatform) {
        // ─── 1. ORA PLATFORM HOST AGENT (tryora.live) ─────────────────────────
        const persona = `You are ORA, the flagship Voice AI Sales & Onboarding Representative for the ORA Platform (tryora.live / ora.ai).

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

        const sitemapDirectory = `
APPLICATION SITEMAP & NAVIGATION DIRECTORY (Exact routes available in this application):
• Public & Marketing Routes:
  - "/" : Landing Page / Home (Hero section, live interactive demo, #features, #stats, #cta).
  - "/docs" : Storefront Setup & Integration Guide (Shopify, WooCommerce, Next.js, HTML embed guides, widget customization).
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
  - "#hero" : Hero Header Section.
  - "#features" : Platform Features & Zero-Config Capabilities.
  - "#stats" : Real-Time Performance Stats & Sub-400ms Metrics.
  - "#demo" : Live Interactive Voice Demo.
  - "#solutions" : Multi-channel E-commerce Solutions.
  - "#testimonials" : Merchant Reviews, Testimonials & Case Studies.
  - "#pricing" : Pricing Section Anchor.
  - "#faq" : Frequently Asked Questions.
  - "#cta" : Call to Action Section.

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
     * If they want to view documentation/guides, call navigate_to_page with destination "/docs".
   - When a user asks to register or sign up -> call navigate_to_page with destination "/auth?mode=register".
   - When a user asks to log in -> call navigate_to_page with destination "/auth?mode=login".
   - If the visitor is ALREADY on the requested destination, do NOT navigate—acknowledge that they are looking at it right now!`;

        const domainScopeGuardrail = `
DOMAIN SCOPE, CAPABILITIES & OFF-TOPIC GUARDRAIL RULES:
1. FULL SERVICE SCOPE & WHAT YOU CAN DO:
   - You are ORA, the real-time Voice AI representative deployed on the ORA Platform (tryora.live).
   - You are fully knowledgeable and authorized to answer:
     • Everything about the ORA platform: Free ($0), Growth ($49), Scale ($199) plans, Stripe & bKash checkout, dashboard analytics, and widget deployment.
     • Everything about ORA's Voice AI capabilities: real-time voice shopping, finding products, answering store policies, navigating web pages, placing orders, capturing contact info, multilingual support in Bengali/English/etc., 60-second store integration.
   - When a visitor asks "What can you do?", "How can you help me?", "Who are you?", or "What is ORA?", warmly explain your voice capabilities for the ORA Platform.

2. STRICT OFF-TOPIC GUARDRAIL & FRIENDLY PIVOT:
   - You are DEDICATED strictly to the ORA Platform and ORA's voice AI services.
   - If a visitor asks about completely unrelated external topics (such as cartoons like Doraemon, anime, movies, celebrity gossip, homework/math equations, world politics, general trivia):
     • Give a FRIENDLY, SHORT (1-sentence) acknowledgment.
     • IMMEDIATELY PIVOT back to ORA and how you can assist them.
     • NEVER get sidetracked into long off-topic discussions. Always steer the visitor back to ORA.`;

        baseInstruction = [
          persona,
          languageDirective,
          customSystemPrompt,
          greetingInstructions,
          avoidanceRules,
          businessSummary,
          merchantBrandVoice,
          customDirectives,
          contactIdentitySummary,
          knowledgeSummary,
          sitemapDirectory,
          domainScopeGuardrail,
          '',
          'CRITICAL RULES FOR REAL-TIME VOICE:',
          '1. EXTREME BREVITY & CONVERSATIONAL PACING (CRITICAL): You are in a live, real-time spoken call. Keep EVERY response under 1 to 2 short sentences (maximum 15-20 words total). Never give long monologues, never list multiple points or features in a row. Deliver the single most direct answer and yield the floor immediately so the user can speak.',
          '2. STOP TALKING IMMEDIATELY: Once you answer the user\'s immediate question, STOP speaking immediately. Do not add filler or unrequested explanations.',
          '3. NEVER output markdown (no **, no ##, no bullet points, no asterisks). You are SPEAKING out loud, not typing text.',
          '4. NEVER output internal reasoning or delay messages (do not say "Hold on while I check" or "Querying database").',
          '5. FAST-PATH DIRECT ANSWERS (ZERO-TOOL DELAY): If the visitor asks who you are, what ORA does, pricing plans, how to buy, contact email, website URL, features, or how to integrate, answer IMMEDIATELY from your preloaded memory above with sub-400ms latency. Do not block voice audio.',
          '6. WHEN TO USE TOOLS (WHILE SPEAKING):',
          '   - navigate_to_page: Call whenever a visitor asks to view a section or page from the sitemap directory above (e.g. "/docs", "/dashboard", "/pricing", "/auth?mode=login&from=/dashboard", "/auth?mode=register", "#features", "#testimonials"). Speak your response while triggering navigation!',
          '   - capture_sales_lead: Call whenever a prospect shares their email, phone, store domain, or desired plan for sales follow-up.',
          '   - get_integration_guide: Call when a developer or merchant asks how to integrate ORA into Shopify, WooCommerce, Next.js, or HTML.',
          '   - update_customer_profile: Call whenever the customer shares their name or preferences.',
          '   - update_agent_directives: Call when the owner/merchant provides new directives, rules, or instructions during voice setup.',
          '   - search_knowledge_base: ONLY when the customer asks for specific obscure details not covered in the knowledge summary above.',
          '7. When a tool returns empty results or if information is not found, politely inform the visitor without making up fake information.',
          '8. If the visitor speaks Bengali or another language, respond naturally in their language.',
          '9. STRICT OFF-TOPIC PIVOT: If asked about external trivia, cartoons (like Doraemon), pop culture, or math, give a friendly 1-sentence acknowledgment and immediately pivot back to ORA.',
        ]
          .filter(Boolean)
          .join('\n');
      } else {
        // ─── 2. MERCHANT STOREFRONT AGENT (STRICT ZERO-LEAK CONTEXT BOUNDARY) ──
        let persona = '';
        const entityLabel = siteName || ownerName || 'this store';

        if (businessArchetype === 'portfolio') {
          persona = `You are ORA, ${ownerName ? `${ownerName}'s` : 'the creator\'s'} personal AI assistant and representative for this website and portfolio. Your primary mission is to warmly introduce visitors, recruiters, and clients to ${ownerName || 'the engineer'}'s background, featured projects, tech stack, and achievements, and help them get in touch or book a technical consultation.`;
        } else if (businessArchetype === 'agency_services') {
          persona = `You are ORA, senior client strategy specialist for ${siteName || 'this agency'}. Your mission is to explain our design, engineering, and consulting services, highlight past case studies, and guide prospects to book a discovery call.`;
        } else if (businessArchetype === 'saas') {
          persona = `You are ORA, the AI software consultant and specialist for ${siteName || 'this platform'}. Your mission is to explain our software solutions, features, workflows, and help visitors understand how our platform solves their problems.`;
        } else if (businessArchetype === 'ecommerce' || hasProducts || businessArchetype === 'general') {
          persona = `You are ORA, a friendly, ultra-fast, and professional AI sales and shopping assistant for ${siteName || 'this store'}. You help shoppers discover products, check styles, colors, availability, live prices, answer store policies, and guide them through checkout.`;
        } else {
          persona = `You are ORA, a helpful and friendly AI assistant and representative for ${siteName || ownerName || 'this store'}.`;
        }

        const domainScopeGuardrail = `
DOMAIN SCOPE, CAPABILITIES & OFF-TOPIC GUARDRAIL RULES:
1. FULL SERVICE SCOPE & WHAT YOU CAN DO:
   - You are ORA, the real-time Voice AI representative deployed on "${entityLabel}".
   - You are fully knowledgeable and authorized to answer:
     • Everything about this specific store/website: products, catalog, styles, prices, stock availability, categories, orders, shipping, store policies, creator/founder info, contact details, and FAQs.
     • Store shopping assistance: helping customers find products, navigating pages, adding items to cart, placing orders, checking delivery terms.
   - ZERO PLATFORM LEAKAGE RULE:
     • You represent "${entityLabel}" ONLY. You are dedicated entirely to this store.
     • When a customer asks about prices, pricing, or costs, you MUST ONLY refer to the products, services, and catalog items of "${entityLabel}" (or call find_products to check live item prices).
   - When a visitor asks "What can you do?", "How can you help me?", or "Who are you?", warmly explain how you assist customers for ${entityLabel}.

2. STRICT OFF-TOPIC GUARDRAIL & FRIENDLY PIVOT:
   - You are DEDICATED strictly to ${entityLabel}.
   - If a visitor asks about completely unrelated external topics (such as cartoons like Doraemon, anime, movies, celebrity gossip, homework/math equations, world politics, general trivia):
     • Give a FRIENDLY, SHORT (1-sentence) acknowledgment.
     • IMMEDIATELY PIVOT back to ${entityLabel} and how you can assist them.
     • Example response: "Haha, Doraemon is a classic anime character! But I'm ORA, the AI assistant for ${entityLabel}—I'm here to help with our products, orders, and services. Is there something specific you're looking for today?"
     • NEVER get sidetracked into long off-topic discussions. Always steer the visitor back to ${entityLabel}.`;

        baseInstruction = [
          persona,
          languageDirective,
          customSystemPrompt,
          greetingInstructions,
          avoidanceRules,
          businessSummary,
          merchantBrandVoice,
          customDirectives,
          contactIdentitySummary,
          catalogSummary,
          knowledgeSummary,
          domainScopeGuardrail,
          '',
          'CRITICAL RULES FOR REAL-TIME VOICE:',
          '1. EXTREME BREVITY & CONVERSATIONAL PACING (CRITICAL): You are in a live, real-time spoken call. Keep EVERY response under 1 to 2 short sentences (maximum 15-20 words total). Never give long monologues, never list multiple points or features in a row. Deliver the single most direct answer and yield the floor immediately so the user can speak.',
          '2. STOP TALKING IMMEDIATELY: Once you answer the user\'s immediate question, STOP speaking immediately. Do not add filler or unrequested explanations.',
          '3. NEVER output markdown (no **, no ##, no bullet points, no asterisks). You are SPEAKING out loud, not typing text.',
          '4. NEVER output internal reasoning or delay messages (do not say "Hold on while I check" or "Querying database").',
          '5. FAST-PATH DIRECT ANSWERS (ZERO-TOOL DELAY): If the customer asks about contact info, creator bio, store policies, or featured catalog items listed above, answer IMMEDIATELY from your preloaded memory.',
          '6. WHEN TO USE TOOLS (WHILE SPEAKING):',
          '   - find_products: When the customer asks for a specific product, item, category, or price range.',
          '   - get_product_details: When the customer asks for specific details or full descriptions of a product.',
          '   - add_to_cart / place_order: When the customer explicitly asks to purchase or add items to their cart.',
          '   - redirect_to_checkout: When the customer asks to checkout or complete their order.',
          '   - navigate_to_page: When the customer asks to view cart, checkout, collections, product pages, or on-screen sections (e.g. "/cart", "/collections/all", "/products/...").',
          '   - search_knowledge_base / get_store_policy: When the customer asks for specific store policies, shipping rules, return procedures, or FAQs.',
          '   - update_customer_profile: When the customer shares their name, email, phone, or shipping address.',
          '   - get_customer_profile: When the customer asks what details you have saved for them.',
          '7. When a tool returns empty results or if information is not found, politely inform the visitor without making up fake products.',
          '8. If the visitor speaks Bengali or another language, respond naturally in their language.',
          '9. STRICT OFF-TOPIC PIVOT: If asked about external trivia or unrelated topics, give a friendly 1-sentence acknowledgment and immediately pivot back to this store.',
        ]
          .filter(Boolean)
          .join('\n');
      }

      const voiceName = normalizeGeminiVoice(agentConfig?.voice?.voiceId);

      // Cache base template for 5 minutes
      this.instructionCache.set(businessId, {
        instruction: baseInstruction,
        archetype: businessArchetype,
        isPlatform: isOraPlatform,
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

        const custEmail = cust?.emailEncrypted
          ? EncryptionUtil.decrypt(cust.emailEncrypted)
          : (cust?.metadata as any)?.verifiedContactDetails?.email || (cust?.metadata as any)?.unverifiedSpokenClaims?.email || null;
        const custPhone = cust?.phoneEncrypted
          ? EncryptionUtil.decrypt(cust.phoneEncrypted)
          : (cust?.metadata as any)?.verifiedContactDetails?.phone || (cust?.metadata as any)?.unverifiedSpokenClaims?.phone || null;
        const custAddress =
          (cust?.metadata as any)?.shippingAddress ||
          (cust?.metadata as any)?.verifiedContactDetails?.address ||
          (cust?.metadata as any)?.unverifiedSpokenClaims?.address ||
          null;

        const cachedBiz = this.instructionCache.get(businessId);
        const isPlatform = cachedBiz?.isPlatform ?? false;

        const guestPlaybook = isPlatform
          ? `* GUEST DISCOVERY & MEMORY PLAYBOOK (Platform Sales):
1. If the visitor asks "do you know me?", "who am I?", "what is my email?", "what is my phone?", "what details do you have for me?":
   - Answer IMMEDIATELY and accurately from your captured memory above.
2. When a guest asks to access or go to the dashboard:
   - Tell them: "To access the dashboard, you need to log in or create an account first. Let's get you signed in right now!"
   - Call navigate_to_page with "/auth?mode=login&from=/dashboard".
3. When a guest asks about pricing, custom solutions, or getting started, warmly answer their question and naturally ask for their details (Name, Email, Phone, Store/Company URL).
4. When the visitor introduces themselves or shares contact details/preferences:
   - IMMEDIATELY call the capture_sales_lead or update_customer_profile tool so you remember them!`
          : `* GUEST SHOPPING & RECOGNITION PLAYBOOK:
1. If the customer asks "do you know me?", "who am I?", "what details do you have for me?", or "where will you ship?":
   - Answer IMMEDIATELY and accurately from your captured memory above.
2. When the shopper introduces themselves (e.g. "I am David", "My name is David", "my email is david@gmail.com", "ship to Banani, Dhaka") or shares preferences:
   - IMMEDIATELY call update_customer_profile so you remember their name, contact, and shipping address for their order!
3. Help the shopper discover items, check prices and availability, and place orders smoothly.`;

        customerContext = `
ACTIVE USER & RECOGNITION CONTEXT (Guest Visitor):
- Customer Name: ${isKnownName ? cust!.name : 'Guest Visitor (Unauthenticated)'}
- Saved Email: ${custEmail || 'Not yet provided'}
- Saved Phone: ${custPhone || 'Not yet provided'}
- Saved Address: ${custAddress || 'Not yet provided'}
- Account Status: Guest Visitor (Unauthenticated)
- Device ID: ${devId || 'Active Browser Session'}
${prefs ? `- Saved Preferences: ${prefs}` : ''}

${guestPlaybook}`;
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

  getToolDeclarations(archetype?: string, isPlatform: boolean = false) {
    return getToolsForArchetype(archetype, isPlatform);
  }

  public invalidateInstructionCache(businessId?: string): void {
    if (businessId) {
      this.instructionCache.delete(businessId);
    } else {
      this.instructionCache.clear();
    }
  }
}
