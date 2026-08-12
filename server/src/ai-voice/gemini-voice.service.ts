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
  ) {}

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

    // Validate key format early to give clear errors
    if (!apiKey.startsWith('AIzaSy')) {
      this.logger.error(
        `[GeminiVoiceService] GEMINI_API_KEY has invalid format. Got prefix '${apiKey.substring(0, 6)}...' — expected 'AIzaSy...' (Google AI Studio key). OAuth tokens (AQ.xxx) and other formats are NOT supported for the Live API WebSocket.`,
      );
      throw new Error(
        `Invalid GEMINI_API_KEY format. The Live API requires a Google AI Studio API key starting with 'AIzaSy...'. Current key starts with '${apiKey.substring(0, 6)}...'. Get a free key at https://aistudio.google.com/apikey`,
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

    // Fetch merchant agent prompt configuration
    let systemInstructionText =
      'You are ORA, an intelligent AI sales agent for an e-commerce merchant. Be concise, polite, helpful, and naturally conversational. Help customers find products, check stock, and manage their cart.';
    try {
      const agentConfig = await this.agentConfigService.getConfig(
        options.businessId,
      );
      if (agentConfig && agentConfig.config && agentConfig.config.brandVoiceDescription) {
        systemInstructionText = `You are ORA, an intelligent AI sales agent for an e-commerce merchant. Merchant Brand Voice: ${agentConfig.config.brandVoiceDescription}. Be concise, polite, helpful, and naturally conversational. Help customers find products, check stock, and manage their cart.`;
      }
    } catch {
      // Fallback system instruction
    }

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

            // NOW it's safe to resolve — the session is live
            resolve(sessionControls);
            return;
          }

          // Process audio & text output from model
          if (response.serverContent?.modelTurn?.parts) {
            for (const part of response.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                options.onAudioData(part.inlineData.data);
              }
              if (part.text && options.onTextData) {
                options.onTextData(part.text);
              }
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

      // Define session controls (used after setup is confirmed)
      const sessionControls = {
        sendAudioChunk: (base64Pcm16k: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            const realtimeInput = {
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64Pcm16k,
                  },
                ],
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
