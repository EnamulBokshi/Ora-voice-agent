import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import WebSocket from 'ws';
import { ORA_TOOL_DECLARATIONS } from './tools/ai-tools.definition';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { ProductsService } from '../products/products.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminUser, AdminUserDocument } from '../users/schemas/admin-user.schema';

export interface GeminiVoiceSessionOptions {
  businessId: string;
  sessionId: string;
  onAudioData: (base64AudioPcm: string) => void;
  onTextData?: (text: string) => void;
  /** Called when Gemini signals a barge-in / interruption */
  onInterrupted?: () => void;
  /** Called when Gemini signals the agent has finished its turn */
  onTurnComplete?: () => void;
  /** Called after each tool is executed server-side (toolName for UI hints only) */
  onToolResult?: (toolName: string) => void;
  onError?: (err: any) => void;
  onClose?: () => void;
}

@Injectable()
export class GeminiVoiceService {
  private readonly logger = new Logger(GeminiVoiceService.name);
  private readonly instructionCache = new Map<string, { instruction: string; expiresAt: number }>();

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
  ) { }

  async createVoiceSession(options: GeminiVoiceSessionOptions): Promise<{
    sendAudioChunk: (base64Pcm16k: string) => void;
    sendTextMessage: (text: string) => void;
    closeSession: () => void;
  }> {
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
    );

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

        // Send Setup Handshake Payload
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
                    voiceName: 'Puck',
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstructionText }],
            },
            tools: [
              {
                functionDeclarations: ORA_TOOL_DECLARATIONS,
              },
            ],
          },
        };

        ws.send(JSON.stringify(setupPayload));
        this.logger.log(
          `[GeminiVoiceService] Setup payload sent, waiting for Gemini acknowledgement...`,
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

                  // Notify proxy gateway for UI-only hint (no tool data sent to client)
                  options.onToolResult?.(call.name);

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
          `[GeminiVoiceService] WebSocket error (sessionId ${options.sessionId}): ${err.message}`,
        );
        if (!setupCompleted) {
          clearTimeout(setupTimeout);
          reject(
            new Error(
              `Gemini Live API connection failed: ${err.message}. Verify GEMINI_API_KEY is a valid Google AI Studio key.`,
            ),
          );
        } else {
          if (options.onError) options.onError(err);
        }
      });

      ws.on('close', (code: number, reason: Buffer) => {
        const reasonStr = reason ? reason.toString('utf8') : '';
        this.logger.warn(
          `[GeminiVoiceService] WebSocket closed for session ${options.sessionId} (code: ${code}, reason: '${reasonStr}')`,
        );

        if (!setupCompleted) {
          clearTimeout(setupTimeout);
          let errorDetail = `Gemini WebSocket closed before setup completed (code: ${code})`;
          if (code === 1008 || code === 1003) {
            errorDetail +=
              '. This usually means the API key is invalid or the model does not support BidiGenerateContent.';
          }
          if (reasonStr) {
            errorDetail += ` Reason: ${reasonStr}`;
          }
          reject(new Error(errorDetail));
        } else {
          if (code !== 1000 && options.onError) {
            options.onError(new Error(`Gemini session closed: ${reasonStr || `Code ${code}`}`));
          }
          if (options.onClose) options.onClose();
        }
      });
    });
  }

  async buildSystemInstruction(businessId: string): Promise<string> {
    const cached = this.instructionCache.get(businessId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.instruction;
    }

    let merchantBrandVoice = '';
    try {
      const agentConfig = await this.agentConfigService.getConfig(businessId);
      if (agentConfig?.config?.brandVoiceDescription) {
        merchantBrandVoice = `\nMerchant Brand Voice: ${agentConfig.config.brandVoiceDescription}`;
      }
    } catch {
      // Fallback — no custom brand voice
    }

    // 1. Preload Business Identity & Owner Contact Info (Email, Name, Domain)
    let contactIdentitySummary = '';
    try {
      if (this.businessModel) {
        const biz = await this.businessModel.findById(businessId).exec();
        let ownerUser: any = null;
        if (this.adminUserModel) {
          ownerUser = await this.adminUserModel
            .findOne({ businessId: businessId as any })
            .sort({ createdAt: 1 })
            .exec();
        }

        const identityLines: string[] = [];
        if (biz?.name) identityLines.push(`• Entity / Website Name: ${biz.name}`);
        if (biz?.domain) identityLines.push(`• Website Domain: ${biz.domain}`);
        if (ownerUser?.name) identityLines.push(`• Creator / Owner Name: ${ownerUser.name}`);
        if (ownerUser?.email) identityLines.push(`• Official Contact Email: ${ownerUser.email}`);

        if (identityLines.length > 0) {
          contactIdentitySummary = `\nCONTACT & IDENTITY INFO (Preloaded in your memory):\n${identityLines.join('\n')}\n* Answer contact, email, and creator questions IMMEDIATELY using these details!`;
        }
      }
    } catch {
      // Fallback — non-fatal
    }

    let catalogSummary = '';
    let hasProducts = false;
    try {
      if (this.productsService) {
        const productsRes = await this.productsService.findAll(businessId, { limit: 12 });
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
    } catch {
      // Fallback — proceed without catalog summary
    }

    let knowledgeSummary = '';
    let hasKnowledge = false;
    try {
      if (this.knowledgeService) {
        const docsRes = await this.knowledgeService.findAll(businessId, undefined, undefined, { limit: 8 });
        if (docsRes && docsRes.items && docsRes.items.length > 0) {
          hasKnowledge = true;
          const docSnippets = docsRes.items
            .map((d: any) => {
              const cleanSnippet = (d.content || '')
                .replace(/\s+/g, ' ')
                .slice(0, 250)
                .trim();
              return `  • [${d.title}]: ${cleanSnippet}${cleanSnippet.length >= 250 ? '...' : ''}`;
            })
            .join('\n');

          knowledgeSummary = `\nWEBSITE & BUSINESS KNOWLEDGE (Preloaded in your memory):\n${docSnippets}\n* Note: You can answer questions covered by these topics immediately without searching!`;
        }
      }
    } catch {
      // Fallback — proceed without knowledge summary
    }

    const persona = hasProducts
      ? 'You are ORA, a friendly, ultra-fast, and professional AI sales representative for this business.'
      : hasKnowledge
        ? 'You are ORA, an intelligent, friendly AI representative and personal assistant for this website and portfolio.'
        : 'You are ORA, a friendly and helpful AI representative for this website and business.';

    const instruction = [
      persona,
      merchantBrandVoice,
      contactIdentitySummary,
      catalogSummary,
      knowledgeSummary,
      '',
      'CRITICAL RULES FOR REAL-TIME VOICE:',
      '1. You are speaking out loud in a real-time voice conversation. Keep responses CONCISE (1-3 sentences max). Speak naturally like a knowledgeable human assistant.',
      '2. NEVER output markdown (no **, no ##, no bullet points, no asterisks). You are SPEAKING, not typing.',
      '3. NEVER output internal reasoning, thought headers, or status messages (e.g. do not say "Searching catalog..." or "Hold on while I check").',
      '4. FAST-PATH DIRECT ANSWERS (ZERO-TOOL): If the visitor asks for contact email, website URL, creator name/bio, what services you offer, policies, or featured items, answer DIRECTLY from your preloaded memory above. NEVER call search tools for basic contact/identity questions.',
      '5. WHEN TO USE TOOLS:',
      hasProducts ? '   - find_products: ONLY when the customer asks for a specific item, category, or price range NOT already listed above in your preloaded memory.' : '',
      hasProducts ? '   - add_to_cart / place_order: When the customer explicitly asks to purchase or add items to their cart.' : '',
      '   - search_knowledge_base / get_store_policy: ONLY when the customer asks for specific obscure details not covered in the knowledge summary above.',
      '6. When a tool returns empty results or if information is not found, politely inform the visitor without making up fake products.',
      '7. If the visitor speaks Bengali or another language, respond naturally in their language.',
    ]
      .filter(Boolean)
      .join('\n');

    // Cache for 5 minutes
    this.instructionCache.set(businessId, {
      instruction,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return instruction;
  }

  getToolDeclarations() {
    return ORA_TOOL_DECLARATIONS;
  }
}
