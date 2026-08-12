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
      this.logger.warn(
        '[GeminiVoiceService] GEMINI_API_KEY is not configured in environment!',
      );
    }

    const host = 'generativelanguage.googleapis.com';
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

    ws.on('open', () => {
      this.logger.log(
        `[GeminiVoiceService] WebSocket connected to Gemini 2.0 Live API for session ${options.sessionId}`,
      );

      const geminiModel =
        this.configService.get<string>('GEMINI_MODEL') ||
        process.env.GEMINI_MODEL ||
        'models/gemini-2.5-flash';

      // Send Setup Handshake Payload
      const setupPayload = {
        setup: {
          model: geminiModel,
          generationConfig: {
            responseModalities: ['AUDIO', 'TEXT'],
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
    });

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const messageStr = data.toString('utf8');
        const response = JSON.parse(messageStr);

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
      if (options.onError) options.onError(err);
    });

    ws.on('close', () => {
      this.logger.log(
        `[GeminiVoiceService] WebSocket closed for session ${options.sessionId}`,
      );
      if (options.onClose) options.onClose();
    });

    return {
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
  }
}
