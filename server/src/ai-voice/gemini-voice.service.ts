import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { ORA_TOOL_DECLARATIONS } from './tools/ai-tools.definition';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import { AgentConfigService } from '../agent-config/agent-config.service';

export interface GeminiVoiceSessionOptions {
  businessId: string;
  sessionId: string;
  onAudioData: (base64AudioPcm: string) => void;
  onTextData?: (text: string) => void;
  onInterrupted?: () => void;
  onError?: (err: any) => void;
  onClose?: () => void;
}

@Injectable()
export class GeminiVoiceService {
  private readonly logger = new Logger(GeminiVoiceService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiToolsExecutor: AiToolsExecutor,
    private readonly agentConfigService: AgentConfigService,
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
        'GEMINI_API_KEY is not configured. Add a valid Google AI Studio key to server/.env',
      );
    }

    if (!apiKey.startsWith('AIza') && !apiKey.startsWith('AQ.Ab')) {
      this.logger.warn(
        `[GeminiVoiceService] GEMINI_API_KEY has an unusual prefix: '${apiKey.substring(0, 6)}...'. Proceeding with WebSocket connection attempt.`,
      );
    }

    const host = 'generativelanguage.googleapis.com';

    // Default Live Bidi model identifier (gemini-3.1-flash-live-preview)
    const rawModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'models/gemini-3.1-flash-live-preview';

    const geminiModel = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;

    this.logger.log(
      `[GeminiVoiceService] Connecting to Gemini Live API (v1beta) — model: ${geminiModel}, session: ${options.sessionId}`,
    );

    const uri = `wss://${host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const ws = new WebSocket(uri);

    // Fetch merchant agent prompt configuration
    let merchantBrandVoice = '';
    let mentionLowStockUrgency = false;
    try {
      const agentConfig = await this.agentConfigService.getConfig(
        options.businessId,
      );
      if (agentConfig?.config?.brandVoiceDescription) {
        merchantBrandVoice = `\nMerchant Brand Voice: ${agentConfig.config.brandVoiceDescription}`;
      }
      mentionLowStockUrgency = agentConfig?.playbook?.mentionLowStockUrgency ?? false;
    } catch {
      // Fallback — no custom brand voice or playbook
    }

    const systemInstructionText = [
      'You are ORA, a friendly, helpful and professional AI voice sales assistant for an e-commerce store.',
      merchantBrandVoice,
      '',
      'CRITICAL RULES FOR YOUR BEHAVIOR:',
      '1. LANGUAGE MATCHING RULE (MANDATORY): You MUST dynamically detect and mirror the customer\'s spoken language turn by turn. If the customer speaks English, reply ONLY in English (never in Bengali). If the customer speaks Bengali (বাংলা), reply in natural Bengali. If the customer speaks Banglish, reply in Banglish. Never use Bengali when addressed in English.',
      '2. You are speaking out loud in a real-time voice conversation. Keep responses SHORT (1-3 sentences max). Do NOT write essays or long paragraphs.',
      '3. NEVER output internal reasoning, thinking headers, bold markdown, bullet points, or analysis. Just speak naturally like a human shop assistant would.',
      '4. NEVER say things like "Initiating search" or "Processing request". Just do it silently and tell the customer the result.',
      '5. When a tool returns empty results (products: []), tell the customer: "I don\'t have any matching products in the catalog right now" — do NOT keep re-searching or asking the same question differently.',
      '6. When asked for a random product or general browse, search once with a broad term. If nothing comes back, say "The catalog appears to be empty right now."',
      '7. Do NOT use markdown formatting (no **, no ##, no bullet points). You are SPEAKING, not writing.',
      '8. Be warm, concise, and helpful. Greet customers naturally. Ask clarifying questions only when genuinely needed.',
      mentionLowStockUrgency
        ? '9. When a product in the tool response has an urgencyHint field, naturally work that urgency into your reply (e.g., "Just 2 left — grab it while you can!"). Keep it brief and genuine, not pushy.'
        : '',
      '',
      'TOOLS:',
      '- Use find_products to search the product catalog. Always use it when a customer asks about products.',
      '- Use add_to_cart to add items to the shopping cart.',
      '- Use place_order to complete a purchase from the cart.',
      '- Use get_store_policy to answer questions about shipping, returns, or store policies.',
    ].filter(Boolean).join('\n');

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

            resolve(sessionControls);
            return;
          }

          // Real-time output transcription from Gemini
          if (response.serverContent?.outputTranscription?.text && options.onTextData) {
            options.onTextData(response.serverContent.outputTranscription.text);
          }

          // Process audio & text output from model turn
          if (response.serverContent?.modelTurn?.parts) {
            for (const part of response.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                options.onAudioData(part.inlineData.data);
              }
              if (part.text && options.onTextData) {
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

          // User interruption handling
          if (response.serverContent?.interrupted) {
            this.logger.log(`[GeminiVoiceService] ⚡ User interrupted Gemini turn`);
            if (options.onInterrupted) {
              options.onInterrupted();
            }
          }

          // Process function/tool calls requested by Gemini
          if (response.toolCall) {
            const functionCalls = response.toolCall.functionCalls || [];
            for (const call of functionCalls) {
              this.logger.log(
                `[GeminiVoiceService] Gemini requested tool execution: ${call.name} (callId: ${call.id})`,
              );

              const toolResult = await this.aiToolsExecutor.executeTool(
                options.businessId,
                options.sessionId,
                call.name,
                call.args || {},
              );

              // Return tool execution output back to Gemini WebSocket
              const toolResponsePayload = {
                toolResponse: {
                  functionResponses: [
                    {
                      response: { output: toolResult },
                      id: call.id,
                    },
                  ],
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
            errorDetail += '. This usually means the API key is invalid or the model does not support BidiGenerateContent.';
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

      // Define session controls with latest Gemini Live audio parameter
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
    });
  }
}
