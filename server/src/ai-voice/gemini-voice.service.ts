import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import WebSocket from 'ws';
import { ORA_TOOL_DECLARATIONS, getToolsForArchetype } from './tools/ai-tools.definition';
import {
  resolveAgentCapability,
  toolUsageHints,
} from './tools/archetype-capabilities';
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

// ── Gemini Live input activity detection (noise robustness) ──────────────────
/**
 * HIGH so Gemini opens a turn on a normal speech onset rather than demanding a
 * pronounced one.
 *
 * This was LOW, stacked on top of the widget's own noise gate. Two independent
 * conservative detectors in series multiply: audio that already cleared the widget
 * gate was then discarded again here, so a softly-spoken customer produced no input
 * transcript at all — and because `markActivity()` is driven by transcripts, the
 * session then idled out while they were talking.
 *
 * Noise rejection belongs to the widget gate, which is the only one of the two that
 * can see the room's noise floor. This detector's job is only to segment turns in
 * audio the gate already judged to be speech.
 *
 * The Live API accepts START_SENSITIVITY_HIGH, START_SENSITIVITY_LOW and
 * START_SENSITIVITY_UNSPECIFIED — there is no DEFAULT member.
 */
const START_OF_SPEECH_SENSITIVITY = 'START_SENSITIVITY_HIGH';

/**
 * HIGH so Gemini commits quickly once the customer stops talking.
 *
 * This was LOW, which is the single biggest contributor to a slow-feeling reply: it
 * deliberately waits longer before accepting that a turn has ended. Noise rejection is
 * the widget gate's job (it does not forward non-speech audio at all) and START
 * sensitivity stays LOW as a second line, so there is no reason to also pay for
 * hesitation at the end of every utterance.
 */
const END_OF_SPEECH_SENSITIVITY = 'END_SENSITIVITY_HIGH';

/** Audio kept before the detected speech onset, so the first syllable is not clipped. */
const SPEECH_PREFIX_PADDING_MS = 200;

/**
 * Silence required after speech before Gemini closes the customer's turn.
 *
 * Must stay BELOW the widget's post-speech hangover window (VAD_HANGOVER_MS, 480ms),
 * because the widget's noise gate stops sending audio once that hangover elapses. If
 * this were the longer of the two, Gemini would still be waiting for silence it can no
 * longer hear and the turn would hang instead of ORA replying.
 *
 * Nothing else ends the turn: neither the widget nor this service ever sends
 * audioStreamEnd or an explicit activityEnd, so Gemini's own detector hearing this much
 * quiet audio is the only signal. That makes the ordering above a hard constraint, not a
 * tuning preference — raising this value above the widget's hangover hangs every turn.
 *
 * 250ms rather than 400ms: this is dead time on every single turn, paid before ORA can
 * even begin generating. Natural mid-sentence pauses are still longer than this in
 * practice, so it does not cut a speaker off mid-thought.
 *
 * The gain is real but small. Replaying recorded speech into a live session, measured
 * from the last speech sample to the first audio byte back: 250ms answers in ~1075ms and
 * 1000ms in ~1485ms, so only about half of any reduction reaches the customer, and the
 * curve flattens below 250ms — 100ms measured no faster. Expect roughly 80ms against the
 * old 400ms, not the ~150ms a linear reading of this number would suggest. The remaining
 * ~1s is Gemini's own end-of-speech decision plus generation and is not tunable here.
 */
const SPEECH_SILENCE_DURATION_MS = 250;

/**
 * Hang guard for a single tool call.
 *
 * Gemini stays silent until every requested tool has been answered, and the Live API
 * requires a response for each call id. A stalled connector HTTP request (Shopify or
 * WooCommerce with no timeout of its own) could therefore freeze a voice session
 * indefinitely with the shopper listening to nothing.
 *
 * This is deliberately generous: it exists to bound a pathological stall, not to cut
 * normal lookups short. Returning a partial result early and injecting the real data
 * when it lands would create exactly the mid-conversation "new findings" interruption
 * that was reported as a bug, so a timed-out call resolves once and stays resolved.
 */
const TOOL_EXECUTION_TIMEOUT_MS = 8000;

/**
 * Resolves with the tool's result, or with `onTimeout()` once the guard elapses.
 * Never rejects, so one bad tool cannot reject the whole Promise.all batch and leave
 * Gemini without a response for the other call ids.
 */
function withToolTimeout<T>(
  work: Promise<T>,
  toolName: string,
  onTimeout: (toolName: string) => T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(onTimeout(toolName));
    }, TOOL_EXECUTION_TIMEOUT_MS);

    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    work.then(finish, () => finish(onTimeout(toolName)));
  });
}

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

/**
 * What this session is for.
 * - customer: the storefront agent — sells, navigates, answers shoppers.
 * - training: the merchant teaching their own agent. It collects facts about
 *   the business and must not sell, navigate, or role-play as the storefront.
 */
export type VoiceSessionMode = 'customer' | 'training';

/**
 * The only tool a training session gets. Looking up what is already known
 * prevents the agent from asking the owner to repeat themselves; everything
 * else in the storefront toolset would be actively wrong here.
 */
export const TRAINING_TOOL_NAMES = ['search_knowledge_base'] as const;

export interface GeminiVoiceSessionOptions {
  businessId: string;
  sessionId: string;
  /** Defaults to 'customer'. Only an authenticated owner may open 'training'. */
  sessionMode?: VoiceSessionMode;
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
  private readonly instructionCache = new Map<string, { instruction: string; archetype: string; isPlatform: boolean; hasCatalog: boolean; voiceName: string; expiresAt: number }>();

  /**
   * Kept apart from the customer cache on purpose: the two instructions are
   * opposites, and one leaking into the other would put a sales agent in front
   * of a merchant trying to teach it, or a note-taker in front of a shopper.
   */
  private readonly trainingInstructionCache = new Map<
    string,
    { instruction: string; voiceName: string; expiresAt: number }
  >();
  private readonly keyCooldowns = new Map<string, number>();

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

  private maskKey(key: string): string {
    if (!key || key.length < 10) return '***';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Retrieves all configured Gemini API keys from environment.
   * Supports:
   * - GEMINI_API_KEYS (newline-separated or comma-separated)
   * - Numbered vars: GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
   * - GEMINI_API_KEY (newline-separated or single)
   */
  getGeminiApiKeys(): string[] {
    const keys: string[] = [];

    // 1. GEMINI_API_KEYS (supports newline-separated or comma-separated)
    const multiKeys =
      this.configService.get<string>('GEMINI_API_KEYS') ||
      process.env.GEMINI_API_KEYS;
    if (multiKeys) {
      keys.push(...multiKeys.split(/[\r\n,]+/).map((k) => k.trim()).filter(Boolean));
    }

    // 2. Numbered env vars: GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
    for (let i = 1; i <= 10; i++) {
      const k =
        this.configService.get<string>(`GEMINI_API_KEY_${i}`) ||
        process.env[`GEMINI_API_KEY_${i}`];
      if (k && k.trim()) {
        keys.push(k.trim());
      }
    }

    // 3. GEMINI_API_KEY (supports newline-separated, single, or comma-separated)
    const singleOrMulti =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;
    if (singleOrMulti) {
      keys.push(...singleOrMulti.split(/[\r\n,]+/).map((k) => k.trim()).filter(Boolean));
    }

    // Deduplicate preserving order, filter out invalid/empty keys
    return Array.from(new Set(keys)).filter((k) => k.length > 5);
  }

  /**
   * Returns healthy keys not currently in cooldown. If all keys are in cooldown,
   * falls back to sorting keys by earliest cooldown expiration.
   */
  getAvailableApiKeys(): string[] {
    const allKeys = this.getGeminiApiKeys();
    const now = Date.now();
    const healthyKeys = allKeys.filter((k) => {
      const cooldownUntil = this.keyCooldowns.get(k);
      return !cooldownUntil || cooldownUntil <= now;
    });

    if (healthyKeys.length > 0) {
      return healthyKeys;
    }

    return [...allKeys].sort(
      (a, b) => (this.keyCooldowns.get(a) || 0) - (this.keyCooldowns.get(b) || 0),
    );
  }

  markKeyError(key: string, reason: string, cooldownMs = 15 * 60 * 1000): void {
    const masked = this.maskKey(key);
    this.logger.warn(
      `[GeminiVoiceService] Marking API key ${masked} in cooldown for ${cooldownMs / 1000}s. Reason: ${reason}`,
    );
    this.keyCooldowns.set(key, Date.now() + cooldownMs);
  }

  async createVoiceSession(options: GeminiVoiceSessionOptions): Promise<GeminiVoiceSessionControls> {
    const candidateKeys = this.getAvailableApiKeys();
    if (candidateKeys.length === 0) {
      throw new Error(
        'No GEMINI_API_KEY configured. Add one or more keys to server/.env',
      );
    }

    // Default Live Bidi model identifier supported by Google AI Studio
    const rawModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      this.configService.get<string>('GEMINI_LIVE_MODEL') ||
      process.env.GEMINI_MODEL ||
      process.env.GEMINI_LIVE_MODEL ||
      'models/gemini-3.1-flash-live-preview';
    const geminiModel = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;

    const systemInstructionText = await this.buildSystemInstruction(
      options.businessId,
      options.customerId,
      options.deviceId,
      options.clientContext,
      options.authenticatedUser,
      options.sessionMode,
    );

    let lastError: Error | null = null;

    for (let i = 0; i < candidateKeys.length; i++) {
      const apiKey = candidateKeys[i];
      const maskedKey = this.maskKey(apiKey);

      try {
        this.logger.log(
          `[GeminiVoiceService] Connecting to Gemini Live API [key: ${maskedKey} (${i + 1}/${candidateKeys.length})] — model: ${geminiModel}, session: ${options.sessionId}`,
        );
        return await this.connectWithKey(
          apiKey,
          geminiModel,
          systemInstructionText,
          options,
        );
      } catch (err: any) {
        lastError = err;
        const msg = err.message || '';
        const isFatalKeyError =
          msg.includes('1011') ||
          msg.includes('1008') ||
          msg.includes('depleted') ||
          msg.includes('denied') ||
          msg.includes('quota') ||
          msg.includes('429');

        if (isFatalKeyError) {
          const cooldown =
            msg.includes('depleted') || msg.includes('1011')
              ? 30 * 60 * 1000
              : msg.includes('denied') || msg.includes('1008')
              ? 60 * 60 * 1000
              : 5 * 60 * 1000;
          this.markKeyError(apiKey, msg, cooldown);
        }

        if (i < candidateKeys.length - 1) {
          this.logger.warn(
            `[GeminiVoiceService] Key ${maskedKey} failed (${msg}). Failing over to next key in pool...`,
          );
        }
      }
    }

    throw lastError || new Error('All Gemini API keys in pool failed to connect.');
  }

  private connectWithKey(
    apiKey: string,
    geminiModel: string,
    systemInstructionText: string,
    options: GeminiVoiceSessionOptions,
  ): Promise<GeminiVoiceSessionControls> {
    // Support both legacy AIza... keys and new AQ.Ab... Auth keys from Google AI Studio
    if (!apiKey.startsWith('AIza') && !apiKey.startsWith('AQ.Ab')) {
      this.logger.warn(
        `[GeminiVoiceService] GEMINI_API_KEY has an unusual prefix: '${apiKey.substring(0, 6)}...'. Proceeding with WebSocket connection attempt.`,
      );
    }

    const host = 'generativelanguage.googleapis.com';
    const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    const isTrainingSession = options.sessionMode === 'training';
    const cached = this.instructionCache.get(options.businessId);
    const archetype = cached?.archetype || 'general';

    // Track whether Gemini has acknowledged the setup handshake
    let setupCompleted = false;

    /**
     * Opened here, and not before the await above, so that no event can be emitted
     * before there is anything listening for it.
     *
     * The socket used to be constructed ahead of buildSystemInstruction, which reads
     * Mongo and can take seconds on a cold instruction cache. Both of the events that
     * matter are lost in that window: an 'open' that arrives early is never seen, so
     * the setup frame is never sent and the connection dies on the 10s timeout; and an
     * 'error' — which is what Google sends when the API key is over its concurrent
     * session quota — is emitted with no listener, so Node's EventEmitter throws it
     * instead of delivering it. That throw does not reject this promise, so the
     * gateway's try/catch never sees it and the customer's socket is left open and
     * silent forever.
     *
     * The promise executor below runs synchronously, so the handlers are attached in
     * the same tick as the construction and the window is closed.
     */
    const ws = new WebSocket(uri);

    // Promise that resolves when Gemini acknowledges setup, or rejects on connection failure
    return new Promise((resolve, reject) => {
      // Timeout if setup takes too long (10 seconds)
      const setupTimeout = setTimeout(() => {
        if (!setupCompleted) {
          try {
            ws.terminate();
          } catch {}
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
            // Deliberately terse and free of instructions. This arrives in the
            // user role — Gemini Live has no mid-session system role — so any
            // directive written here reads to the model as something the
            // visitor said, and comes back out of ORA's mouth as an
            // explanation of her own rules. The behavioural rule that used to
            // live in this string now sits in the system instruction, where it
            // is stated once instead of being re-delivered on every scroll.
            let productSnippet = '';
            if (ctx.currentPath && ctx.currentPath.includes('/products/')) {
              const slug = ctx.currentPath.split('/products/')[1]?.split(/[?#]/)[0]?.replace(/\/$/, '');
              if (slug) productSnippet = ` | active_product_slug=${slug}`;
            }
            const contextText = `[PAGE_STATE] path=${ctx.currentPath || '/'}${ctx.title ? ` | title=${ctx.title}` : ''}${productSnippet}${ctx.activeSection ? ` | section=${ctx.activeSection}` : ''} | visited=${histStr}`;
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
        const trainingMeta = isTrainingSession
          ? this.trainingInstructionCache.get(options.businessId)
          : undefined;
        const archetype = cached?.archetype || 'general';
        const isPlatform = cached?.isPlatform || false;
        const hasCatalog = cached?.hasCatalog || false;
        const voiceName = normalizeGeminiVoice(trainingMeta?.voiceName ?? cached?.voiceName);

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
                // A training session gets exactly one tool: looking up what the
                // agent already knows. Giving it the storefront tools is what
                // made it behave like a shopper's agent — offering to navigate
                // and sell to the merchant who is trying to teach it.
                functionDeclarations: isTrainingSession
                  ? TRAINING_TOOL_NAMES.map((name) =>
                      ORA_TOOL_DECLARATIONS.find((t) => t.name === name),
                    ).filter(Boolean)
                  : getToolsForArchetype(archetype, isPlatform, hasCatalog),
              },
            ],
            // ── Server-side transcription (parallel to audio, zero latency impact) ───
            // inputAudioTranscription: Gemini transcribes the user's microphone audio server-side.
            //   Chunks arrive as serverContent.inputTranscription.text (no browser SpeechRecognition needed).
            // outputAudioTranscription: Gemini transcribes its own synthesised audio back to text.
            //   Chunks arrive as serverContent.outputTranscription.text (solves the AUDIO-only modality gap).
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            // ── Input activity detection (noise robustness) ──────────────────────
            // Left unset, Gemini's automatic VAD runs on defaults tuned for a quiet
            // room: a TV, traffic or a nearby conversation reads as the customer
            // speaking and barges in on ORA mid-answer.
            //
            // HIGH start sensitivity opens a turn on a normal speech onset; the
            // widget's own noise gate upstream is what keeps non-speech out, so this
            // detector only has to segment turns. prefixPaddingMs keeps the first
            // syllable, and HIGH end sensitivity commits quickly once they stop.
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: START_OF_SPEECH_SENSITIVITY,
                endOfSpeechSensitivity: END_OF_SPEECH_SENSITIVITY,
                prefixPaddingMs: SPEECH_PREFIX_PADDING_MS,
                silenceDurationMs: SPEECH_SILENCE_DURATION_MS,
              },
            },
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
                // Strict CoT filter: NEVER leak model thoughts, chain-of-thought, or internal reasoning
                if ((part as any).thought) {
                  continue;
                }
                const text = part.text.trim();
                if (
                  text &&
                  !text.startsWith('**') &&
                  !text.startsWith('##') &&
                  !text.startsWith('# ') &&
                  !text.toLowerCase().startsWith('thought') &&
                  !text.toLowerCase().startsWith('thinking') &&
                  !text.toLowerCase().startsWith('internal:') &&
                  !text.toLowerCase().startsWith('[thought')
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
                    toolResult = await withToolTimeout(
                      this.aiToolsExecutor.executeTool(
                        options.businessId,
                        options.sessionId,
                        call.name,
                        call.args || {},
                      ),
                      call.name,
                      (name) => {
                        this.logger.error(
                          `[GeminiVoiceService] Tool ${name} exceeded ${TOOL_EXECUTION_TIMEOUT_MS}ms for session ${options.sessionId}; returning a timeout result so the turn can close.`,
                        );
                        return {
                          success: false,
                          error: 'TOOL_TIMEOUT',
                          message:
                            'That lookup did not come back in time. Tell the customer you could not retrieve it just now and offer to try again.',
                          products: [],
                        };
                      },
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
          try {
            ws.terminate();
          } catch {}
          reject(err);
        } else if (options.onError) {
          options.onError(err);
        }
      });

      ws.on('close', (code, reason) => {
        const reasonStr = reason ? reason.toString() : '';
        this.logger.log(
          `[GeminiVoiceService] WebSocket closed for session ${options.sessionId} (code: ${code}, reason: ${reasonStr})`,
        );
        if (!setupCompleted) {
          clearTimeout(setupTimeout);
          try {
            ws.terminate();
          } catch {}
          reject(
            new Error(
              `WebSocket closed before setup completed (code: ${code}${reasonStr ? `, reason: ${reasonStr}` : ''})`,
            ),
          );
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
    sessionMode?: VoiceSessionMode,
  ): Promise<string> {
    if (sessionMode === 'training') {
      return this.buildTrainingInstruction(businessId, authenticatedUser);
    }

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
        this.productsService ? this.productsService.findAll(businessId, { limit: 24 }).catch(() => null) : Promise.resolve(null),
        this.knowledgeService
          ? this.knowledgeService.findAll(businessId, undefined, undefined, { limit: 10 }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (agentConfig?.config?.brandVoiceDescription) {
        merchantBrandVoice = `\nMerchant Brand Voice / Tone: ${agentConfig.config.brandVoiceDescription}`;
      }
      // The archetype now identifies the profile that `getConfig` resolved,
      // rather than being a field stored on it.
      if (agentConfig?.activeArchetype) {
        businessArchetype = agentConfig.activeArchetype;
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

      const hasCatalog = !!(
        productsRes &&
        productsRes.items &&
        productsRes.items.length > 0
      );

      // The prompt and the tool declarations are both derived from this one
      // decision, so they cannot disagree.
      const capability = resolveAgentCapability({
        archetype: businessArchetype,
        isPlatform: isOraPlatform,
        hasCatalog,
      });
      const isEcommerce = capability.isCommerce;

      let catalogSummary = '';
      let sampleProductNames = '';
      if (isEcommerce) {
        if (productsRes && productsRes.items && productsRes.items.length > 0) {
          sampleProductNames = productsRes.items
            .slice(0, 8)
            .map((p: any) => p.name)
            .filter(Boolean)
            .join(', ');
          const categories = Array.from(
            new Set(productsRes.items.map((p) => p.category).filter(Boolean)),
          );
          const sampleLines = productsRes.items
            .map((p) => {
              const handle = (p as any).attributes?.shopify?.handle;
              const handleStr = handle ? `, handle: "${handle}"` : '';
              const idStr = p._id ? ` (ID: ${p._id.toString()}${handleStr})` : '';
              return `  • ${p.name}${idStr} — ${p.currency || 'USD'} ${p.price} (${p.availability || 'in stock'}${p.category ? `, ${p.category}` : ''})`;
            })
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

      // Every mid-session signal — greeting cue, idle nudge, page state — has
      // to be delivered in the user role, because the Live API has no system
      // role after setup. Without this rule the model treats them as visitor
      // speech and answers them out loud.
      const silentMarkerRule = `
SILENT SYSTEM MARKERS (NEVER SPEAK ABOUT THESE):
- Some messages you receive are not the visitor talking. They are silent stage directions from the system, and always start with a bracketed marker: [PAGE_STATE], [SYSTEM_TRIGGER: ...], [SYSTEM_UPDATE: ...].
- Act on them silently. NEVER read them aloud, quote them, summarise them, translate them, or answer them as if the visitor had spoken.
- When you receive a [PAGE_STATE] marker, maintain absolute silence. Do NOT speak, do NOT greet again, do NOT acknowledge the page change, and do NOT call or announce any navigation tool. Simply register the new page context silently and wait for the visitor to speak.
- NEVER mention that you received an update, a trigger, a notification, or new information about the page.
- Example — WRONG: "I see you've moved to the pricing page, and my instructions say not to suggest navigating there." Example — RIGHT: say nothing about it, and simply use the fact that they are on the pricing page when it becomes relevant.
- If a marker arrives while you are mid-sentence, finish your sentence naturally. Do not restart, do not acknowledge, do not change subject.`;

      // ─── Persona & System Instruction Construction ────────────────────────
      if (isOraPlatform) {
        // ─── 1. ORA PLATFORM HOST AGENT (tryora.live) ─────────────────────────
        const persona = `You are ORA, the flagship Voice AI Sales & Onboarding Representative for the ORA Platform (tryora.live / ora.ai).

PLATFORM IDENTITY & MISSION:
- You represent the ORA SaaS platform. ORA provides autonomous multimodal real-time Voice AI sales agents for any business or website — companies, service providers, agencies, clinics, SaaS products, creators and portfolios, as well as online stores.
- NEVER describe ORA as being only for e-commerce, only for online stores, or as limited to any single industry. E-commerce is one of the things ORA supports well, not the boundary of what it does. If a visitor runs a law firm, a clinic, a restaurant, an agency, a personal site or anything else, ORA works for them too — say so plainly.
- You are NOT a retail store yourself. You do NOT sell physical goods, lighting, fans, or hardware.
- Taglines such as "Supercharge Your Store With Autonomous Voice AI" are marketing headlines, and "store" there is shorthand for the visitor's own site or business. NEVER refer to this website or yourself as "Supercharger store" or "the Supercharger store".
- The visitors speaking with you are business owners, company staff, service providers, agency founders, creators, and developers interested in testing ORA or subscribing to deploy ORA on their own website or business.

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
  - "/pricing" : Transparent Multimodal AI Pricing ($0 Free, $49 Growth, $199 Scale, Stripe & bKash checkout). Pricing is its OWN page — always send visitors to "/pricing", never to a "#pricing" anchor.
  - "/solutions" : Solutions & Capabilities by business type.
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
  - "/usage" : Live Voice Minutes Consumption, Quota Limits & Billing Usage.
  - "/profile" : Merchant Store Profile & Settings.
• Platform Admin Routes:
  - "/admin" : SuperAdmin Command Center & Platform Control Plane.
• In-Page Section Anchors — these exist ONLY on the landing page "/", and this list is exhaustive. Never invent an anchor that is not named here; an anchor that does not exist leaves the page sitting still while you claim to have moved it.
  - "#hero" : Hero Header Section.
  - "#features" : Platform Features & Zero-Config Capabilities.
  - "#solutions" : Multi-channel Voice AI Solutions (commerce, services and general business).
  - "#docs" : Storefront Setup & Integration Overview.
  - "#stats" : Real-Time Performance Stats & Sub-400ms Metrics.
  - "#testimonials" : Merchant Reviews, Testimonials & Case Studies.
  - "#cta" : Call to Action Section.

* NAVIGATION RULES:
0. ALWAYS ANNOUNCE THE DESTINATION BEFORE MOVING THE PAGE (applies to EVERY navigation, no exceptions):
   - NEVER navigate silently. The visitor is listening, not watching — a page that changes with no spoken warning is disorienting.
   - Say ONE short phrase naming where you are taking them — 6 to 10 words, never a full explanation. Examples: "Taking you to the pricing page now!", "Opening the sign-up page for you.", "Here are our setup docs.", "Jumping down to features."
   - Vary the wording naturally; do not repeat the same sentence every time.
   - Say it FIRST, then trigger the tool, so your voice is already speaking as the page moves.
   - SPEED IS CRITICAL: call navigate_to_page in the SAME turn as that phrase. Never wait for the visitor to reply, and never split it across two turns.
   - ONE-SHOT ANNOUNCEMENT: Your announcement MUST be spoken before or in the same turn as calling navigate_to_page. Once the tool executes, your turn is 100% finished. Do NOT say "Navigating to..." or repeat the destination after the tool returns. Stay completely silent after the tool call.
   - NEVER ask for permission when the visitor has already asked to see something. "Would you like me to take you there?" costs them an entire extra exchange — they already told you where they want to go, so just announce it and move.

1. AUTHENTICATED USER ASKS FOR DASHBOARD:
   - When an authenticated logged-in user asks to "go to dashboard", "open dashboard", "show store metrics", "view my store", or "open command center":
     * If user role is "owner" or "staff": Respond verbally in 1 short sentence ("Taking you to your dashboard now, [Name]!") and IMMEDIATELY call navigate_to_page with destination "/dashboard".
     * If user role is "admin" or "super_admin": Respond verbally in 1 short sentence ("Taking you to the admin command center now, [Name]!") and IMMEDIATELY call navigate_to_page with destination "/admin".
     * If they ask for a specific section (e.g. live desk, billing, conversations, agent config, customers, usage, profile): Say where you are taking them in 1 short sentence ("Opening your live desk now!") and call navigate_to_page with that specific dashboard route (e.g. "/live-desk", "/billing", "/conversations", "/agent", "/customers", "/usage", "/profile").
     * If they ask to get set up, onboard their store, or configure ORA: Say in 1 short sentence ("Opening Agent Configuration for you now!") and call navigate_to_page with destination "/agent".

2. UNAUTHENTICATED GUEST USER ASKS FOR DASHBOARD:
   - When an unauthenticated guest visitor asks to "go to dashboard", "open my dashboard", "log in", "sign in", "create account", "register", or "access merchant portal":
     * Inform them warmly in 1 short sentence: "To access the dashboard, you need to log in or create an account first. Let's get you signed in right now!"
     * IMMEDIATELY call navigate_to_page with destination "/auth?mode=login&from=/dashboard" (or "/auth?mode=register&from=/dashboard" if they asked to register/create account).

3. GENERAL NAVIGATION & MANUALS/DOCS:
   - When a user asks for documentation, manuals, or setup guides:
     * Explain our 60-second setup verbally and answer their questions directly (or call get_integration_guide if they specify a platform like Shopify, WooCommerce, Next.js, or HTML).
     * If they want to view documentation/guides, say "Sure — opening our setup docs for you now!" and call navigate_to_page with destination "/docs".
   - When a user asks to register or sign up -> say "Great — taking you to the sign-up page now!" and call navigate_to_page with destination "/auth?mode=register".
   - When a user asks to log in -> say "Taking you to the login page now!" and call navigate_to_page with destination "/auth?mode=login".
   - When a user asks about plans or to see pricing -> say "Taking you to our pricing page!" and call navigate_to_page with destination "/pricing" (or "#pricing" if they are already on the landing page).
   - For any other page or section in the sitemap above -> announce it in 1 short sentence naming the destination, then call navigate_to_page.
   - If the visitor is ALREADY on the requested destination, do NOT navigate—acknowledge that they are looking at it right now, without explaining why you are not navigating.
   - You always know which page the visitor is on. Never offer to take them to the page they are already viewing, and never announce that you know where they are.`;

        const domainScopeGuardrail = `
DOMAIN SCOPE, CAPABILITIES & OFF-TOPIC GUARDRAIL RULES:
1. FULL SERVICE SCOPE & WHAT YOU CAN DO:
   - You are ORA, the real-time Voice AI representative deployed on the ORA Platform (tryora.live).
   - You are fully knowledgeable and authorized to answer:
     • Everything about the ORA platform: Free ($0), Growth ($49), Scale ($199) plans, Stripe & bKash checkout, dashboard analytics, and widget deployment.
     • Everything about ORA's Voice AI capabilities: answering visitor questions from the business's own knowledge base and documents, real-time voice conversations, navigating web pages, capturing leads and contact info, booking and enquiry follow-up, multilingual support in Bengali/English/etc., and 60-second integration into any website. Where the business sells products, ORA also does live product discovery, order placement and checkout.
   - When a visitor asks "What can you do?", "How can you help me?", "Who are you?", or "What is ORA?", describe ORA as a voice AI agent for any business or website, and give the shopping and catalogue abilities as one example among others — never as the whole answer. Do not ask them to confirm they run an online store before helping.

2. STRICT OFF-TOPIC GUARDRAIL & ZERO-ENTERTAINMENT RULE:
   - You are DEDICATED strictly to the ORA Platform and ORA's voice AI sales.
   - ZERO-TOLERANCE FOR OFF-TOPIC CHAT: Never engage in discussions, chit-chat, storytelling, opinions, or debates about ANY external or unrelated subjects (including cartoons, entertainment, movies, fictional characters, personal life stories, jokes, politics, or general trivia).
   - UNIVERSAL DEFLECTION PATTERN (Max 1 short phrase + immediate proactive pivot):
     • Do NOT answer questions, give facts, or elaborate on unrelated external topics.
     • English: "That's an interesting topic, but I'm here as ORA's Voice AI specialist! I'd love to show you how our voice agents can assist your visitors and grow your business or website. What kind of project or business are you working on?"
     • Bengali (if user is speaking Bengali): "বিষয়টি চমৎকার, তবে আমি ORA প্ল্যাটফর্মের এআই স্পেশালিস্ট! আমাদের ভয়েস এজেন্ট কীভাবে আপনার বিজনেসের কাজে আসতে পারে তা দেখতে কি আগ্রহী?"
   - MULTI-TURN OFF-TOPIC PERSISTENCE: If the visitor persists with off-topic chatting, politely and firmly hold the boundary: "I'd love to chat, but my only role here is helping you with ORA's voice solutions! What can I help you explore today?"
   - NEVER get sidetracked into multi-turn off-topic discussions. Always steer the visitor back to ORA.`;

        const salesPlaybook = `
SALES CONVERSION & OBJECTION HANDLING PLAYBOOK:
1. MINDSET: You are a high-performing, empathetic, and consultative human representative. Your goal is to guide visitors towards conversion (signing up at /auth?mode=register, picking a plan at /pricing, or capturing their lead details).
2. OBJECTION HANDLING (When visitor says "This site isn't for me", "I don't need this", "Not interested", "Too expensive", or "Just looking"):
   - NEVER passively surrender or say "Okay, bye!" or "No problem, goodbye!".
   - Step 1 (Empathy & Zero Pressure): Acknowledge their perspective warmly: "I completely understand! No pressure at all."
   - Step 2 (Curiosity & Discovery): Gently ask: "Curious though—what kind of project, website, or business are you working on right now?"
   - Step 3 (Value Reframe): Relate ORA's direct impact: "Many people thought the same until they saw ORA engage visitors 24/7, answer questions, and boost inquiries and conversions automatically, with zero coding in 60 seconds."
   - Step 4 (Low-Friction Next Step): "Our Free Tier gives you 100 minutes at zero cost ($0) so you can test it on your website or project with zero risk. Would you like me to walk you through a 30-second setup?" or "Can I take your email so we can send you an instant preview?"
   - Step 5 (Graceful Respect): If the visitor insists after a gentle probe that they truly want to leave, graciously respect it: "Understood! Thank you for stopping by ORA. Whenever you're ready, we're right here. Have a great day!"`;

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
          silentMarkerRule,
          salesPlaybook,
          '',
          'CRITICAL RULES FOR REAL-TIME VOICE:',
          '1. PRIMARY DEFAULT LANGUAGE: ENGLISH. You MUST speak in clear, natural English by default. Your very first greeting and initial responses MUST ALWAYS be in English. NEVER speak in Chinese, Cantonese, Mandarin, Japanese, or any other unprompted language.',
          '2. CONDITIONAL LANGUAGE SWITCHING: Only switch to another language (such as Bengali) IF AND ONLY IF the visitor explicitly asks you to speak in that language (e.g. "Can we speak in Bengali?" / "বাংলায় কথা বলো") OR if the visitor initiates their speech to you in that language. Otherwise, ALWAYS speak in English.',
          '3. You are speaking out loud in a real-time voice conversation. Keep responses CONCISE (1-3 sentences max). Speak naturally, empathetically, and enthusiastically like a top human sales representative.',
          '4. NEVER output markdown (no **, no ##, no bullet points, no asterisks). You are SPEAKING out loud, not typing text.',
          '5. NEVER NARRATE YOUR OWN MACHINERY. Speak only as a human representative would. NEVER mention tools, functions, calls, lookups, searches, databases, prompts, instructions, rules, guardrails, system messages, context updates, or your configuration. NEVER explain why you chose to do something, what you are about to do internally, or what you are permitted to do. NEVER say things like "Hold on while I check", "Querying database", "Let me call the search function", "Based on my instructions", "My rules say", "I received an update", or "Since you are on this page, I will not...". Perform the action silently and speak only the result, exactly as a human colleague would.',
          '6. FAST-PATH DIRECT ANSWERS (ZERO-TOOL DELAY): If the visitor asks who you are, what ORA does, pricing plans, how to buy, contact email, website URL, features, or how to integrate, answer IMMEDIATELY from your preloaded memory above with sub-400ms latency. Do not block voice audio.',
          '7. WHEN TO USE TOOLS (WHILE SPEAKING):',
          '   - navigate_to_page: Call whenever a visitor asks to view a section or page from the sitemap directory above (e.g. "/dashboard", "/pricing", "/auth?mode=login&from=/dashboard", "/auth?mode=register", "#features"). ALWAYS speak one short sentence naming the destination first ("Taking you to the pricing page now!") — never move the page in silence.',
          '   - capture_sales_lead: Call whenever a prospect shares their email, phone, store domain, or desired plan for sales follow-up.',
          '   - get_integration_guide: Call when a developer or merchant asks how to integrate ORA into Shopify, WooCommerce, Next.js, or HTML.',
          '   - update_customer_profile: Call whenever the customer shares their name or preferences.',
          '   - update_agent_directives: Call when the owner/merchant provides new directives, rules, or instructions during voice setup.',
          '   - search_knowledge_base: ONLY when the customer asks for specific obscure details not covered in the knowledge summary above.',
          '8. When a tool returns empty results or if information is not found, politely inform the visitor without making up fake information.',
          '9. STRICT OFF-TOPIC PIVOT: If asked about any external or unrelated topic, give a friendly 1-phrase deflection and immediately pivot back to ORA sales.',
          '10. PROACTIVE SALES CONVERSION: When a visitor hesitates or says the site is not for them, gently probe their needs and offer a zero-risk next step (e.g. Free Tier or lead capture) instead of immediately giving up.',
        ]
          .filter(Boolean)
          .join('\n');
      } else {
        // ─── 2. MERCHANT / BUSINESS AGENT (STRICT ZERO-LEAK CONTEXT BOUNDARY) ──
        let persona = '';
        const entityLabel = siteName || ownerName || 'this business';

        if (businessArchetype === 'portfolio') {
          persona = `You are ORA, ${ownerName ? `${ownerName}'s` : 'the creator\'s'} personal AI assistant and representative for this website and portfolio. Your primary mission is to warmly introduce visitors, recruiters, and clients to ${ownerName || 'the engineer'}'s background, featured projects, tech stack, and achievements, and help them get in touch or book a technical consultation.`;
        } else if (businessArchetype === 'agency_services') {
          persona = `You are ORA, senior client strategy specialist for ${siteName || 'this agency'}. Your mission is to explain our design, engineering, and consulting services, highlight past case studies, and guide prospects to book a discovery call.`;
        } else if (businessArchetype === 'saas') {
          persona = `You are ORA, the AI software consultant and specialist for ${siteName || 'this platform'}. Your mission is to explain our software solutions, features, workflows, and help visitors understand how our platform solves their problems.`;
        } else if (isEcommerce) {
          persona = `You are ORA, a friendly, ultra-fast, and professional AI sales and shopping assistant for ${siteName || 'this store'}. You help shoppers discover products, check styles, colors, availability, live prices, answer store policies, and add items to their cart.`;
        } else {
          // General business, corporate site, consultancy, service provider, or creator website
          persona = `You are ORA, the warm, knowledgeable, and professional AI Sales Representative for ${siteName || ownerName || 'this business'}. Your mission is to welcome visitors, clearly explain ${siteName || 'our business'}'s services, solutions, and value proposition, answer questions from our company knowledge base, and help prospective clients get in touch, request quotes, or get started.`;
        }

        const domainScopeGuardrail = isEcommerce
          ? `
DOMAIN SCOPE, CAPABILITIES & OFF-TOPIC GUARDRAIL RULES:
1. FULL SERVICE SCOPE & WHAT YOU CAN DO:
   - You are ORA, the real-time Voice AI representative deployed on "${entityLabel}".
   - You are fully knowledgeable and authorized to answer:
     • Everything about this specific store/website: products, catalog, styles, prices, stock availability, categories, orders, shipping, store policies, creator/founder info, contact details, and FAQs.
      • Store shopping assistance: helping customers find products, navigating pages, and adding items to cart.
   - ZERO PLATFORM LEAKAGE RULE:
     • You represent "${entityLabel}" ONLY. You are dedicated entirely to this store.
     • When a customer asks about prices, pricing, or costs, you MUST ONLY refer to the products, services, and catalog items of "${entityLabel}" (or call find_products to check live item prices).
   - When a visitor asks "What can you do?", "How can you help me?", or "Who are you?", warmly explain how you assist customers for ${entityLabel}.

2. STRICT OFF-TOPIC GUARDRAIL & ZERO-ENTERTAINMENT RULE:
   - You are DEDICATED strictly to ${entityLabel}.
   - ZERO-TOLERANCE FOR OFF-TOPIC CHAT: Never engage in discussions, chit-chat, storytelling, opinions, or debates about ANY external or unrelated subjects (including cartoons, entertainment, movies, fictional characters, personal life stories, jokes, politics, or general trivia).
   - UNIVERSAL DEFLECTION PATTERN (Max 1 short phrase + immediate proactive pivot):
     • Do NOT answer questions, give facts, or elaborate on unrelated external topics.
     • English: "That's an interesting topic, but I'm here as the AI shopping assistant for ${entityLabel}! I'd love to help you find what you're looking for. Are you looking for any particular item today?"
     • Bengali (if user is speaking Bengali): "বিষয়টি চমৎকার, তবে আমি ${entityLabel}-এর এআই সেলস স্পেশালিস্ট! আমাদের প্রোডাক্ট বা অর্ডার নিয়ে আপনাকে কীভাবে সাহায্য করতে পারি বলুন?"
   - MULTI-TURN OFF-TOPIC PERSISTENCE: If the visitor persists with off-topic chatting, politely and firmly hold the boundary: "I'd love to chat, but my only role here is assisting you with ${entityLabel}! What can I help you explore today?"`
          : `
DOMAIN SCOPE, CAPABILITIES & OFF-TOPIC GUARDRAIL RULES:
1. FULL SERVICE SCOPE & WHAT YOU CAN DO:
   - You are ORA, the real-time Voice AI sales representative deployed on "${entityLabel}".
   - You are NOT an e-commerce retail store. Do NOT refer to carts, checkout, styles, or physical shipping unless catalog items are present.
   - You are fully knowledgeable and authorized to answer:
     • Everything about ${entityLabel}: company background, services, solutions, mission, FAQs, founder/creator info, contact details, and policies.
     • Sales & consultation assistance: understanding the visitor's needs, answering inquiries, and capturing their contact details for follow-up.
   - ZERO PLATFORM LEAKAGE RULE:
     • You represent "${entityLabel}" ONLY. You are dedicated entirely to this business.
   - When a visitor asks "What can you do?", "How can you help me?", or "Who are you?", warmly explain how you assist clients and visitors for ${entityLabel}.

2. STRICT OFF-TOPIC GUARDRAIL & ZERO-ENTERTAINMENT RULE:
   - You are DEDICATED strictly to ${entityLabel}.
   - ZERO-TOLERANCE FOR OFF-TOPIC CHAT: Never engage in discussions, chit-chat, storytelling, opinions, or debates about ANY external or unrelated subjects (including cartoons, entertainment, movies, fictional characters, personal life stories, jokes, politics, or general trivia).
   - UNIVERSAL DEFLECTION PATTERN (Max 1 short phrase + immediate proactive pivot):
     • Do NOT answer questions, give facts, or elaborate on unrelated external topics.
     • English: "That's an interesting topic, but I'm here as the AI representative for ${entityLabel}! I'd love to help you with our services and offerings. What brought you to us today?"
     • Bengali (if user is speaking Bengali): "বিষয়টি চমৎকার, তবে আমি ${entityLabel}-এর এআই প্রতিনিধি! আমাদের সার্ভিস বা সমাধান নিয়ে আপনাকে কীভাবে সাহায্য করতে পারি বলুন?"
   - MULTI-TURN OFF-TOPIC PERSISTENCE: If the visitor persists with off-topic chatting, politely and firmly hold the boundary: "I'd love to chat, but my only role here is assisting you with ${entityLabel}! What can I help you explore today?"`;

        const salesPlaybook = `
SALES CONVERSION & OBJECTION HANDLING PLAYBOOK:
1. MINDSET: You are a consultative human sales representative representing ${entityLabel}. Your mission is to convert visitors into clients, leads, or buyers through genuine human empathy, understanding their needs, and articulating the real value of ${entityLabel}.
2. OBJECTION HANDLING (When visitor says "This site/service isn't for me", "I don't need this", "Not interested", "Too expensive", or "Just looking"):
   - NEVER passively agree or say "Okay, bye!" or "No problem, goodbye!".
   - Step 1 (Empathy & Validation): "I completely understand! No pressure at all."
   - Step 2 (Curiosity & Discovery): "Curious though—what kind of project or challenge were you hoping to solve when you stopped by?"
   - Step 3 (Value Reframe): Highlight how ${entityLabel} uniquely helps solve that problem or saves time and effort.
   - Step 4 (Low-Friction Next Step): Invite a low-commitment next step ("Can I take your email so our team can send you a quick personalized summary?", or offer to answer any questions about our offerings).
   - Step 5 (Graceful Respect): If the visitor insists after a gentle probe that they truly want to leave, graciously respect it: "Understood! Thank you for stopping by ${entityLabel}. If you ever need us, we're right here. Have a great day!"`;

        // Derived from the same capability decision as the declarations, so
        // the prompt cannot describe a tool the model was never given.
        const toolRules = toolUsageHints(capability);

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
          silentMarkerRule,
          salesPlaybook,
          '',
          'CRITICAL RULES FOR REAL-TIME VOICE:',
          '1. PRIMARY DEFAULT LANGUAGE: ENGLISH. You MUST speak in clear, natural English by default. Your very first greeting and initial responses MUST ALWAYS be in English. NEVER speak in Chinese, Cantonese, Mandarin, Japanese, or any other unprompted language.',
          '2. CONDITIONAL LANGUAGE SWITCHING: Only switch to another language (such as Bengali) IF AND ONLY IF the visitor explicitly asks you to speak in that language (e.g. "Can we speak in Bengali?" / "বাংলায় কথা বলো") OR if the visitor initiates their speech to you in that language. Otherwise, ALWAYS speak in English.',
          '3. You are speaking out loud in a real-time voice conversation. Keep responses CONCISE (1-3 sentences max). Speak naturally, empathetically, and enthusiastically like a top human sales representative.',
          '4. NEVER output markdown (no **, no ##, no bullet points, no asterisks). You are SPEAKING out loud, not typing text.',
          '5. NEVER NARRATE YOUR OWN MACHINERY. Speak only as a human representative would. NEVER mention tools, functions, calls, lookups, searches, databases, prompts, instructions, rules, guardrails, system messages, context updates, or your configuration. NEVER explain why you chose to do something, what you are about to do internally, or what you are permitted to do. NEVER say things like "Hold on while I check", "Querying database", "Let me call the search function", "Based on my instructions", "My rules say", "I received an update", or "Since you are on this page, I will not...". Perform the action silently and speak only the result, exactly as a human colleague would.',
          isEcommerce && sampleProductNames
            ? `6. FAST-PATH DIRECT ANSWERS (ZERO-TOOL DELAY): You have our store inventory and catalog preloaded in your memory above (including: ${sampleProductNames}). Answer questions about them IMMEDIATELY from your preloaded memory with sub-second voice latency! Do NOT call find_products or block the voice stream for items already in your memory. ONLY call find_products if the customer specifically asks for items not in your preloaded memory or explicitly asks for deep variant/live stock checks.`
            : '6. FAST-PATH DIRECT ANSWERS (ZERO-TOOL DELAY): Answer questions covered by your preloaded memory above with sub-second voice latency! Do not call search tools or block the voice stream for information already in your memory.',
          '7. WHEN TO USE TOOLS (WHILE SPEAKING):',
          ...toolRules,
          '8. When a tool returns empty results or if information is not found, politely inform the visitor without making up fake products.',
          '9. STRICT OFF-TOPIC PIVOT: If asked about any external or unrelated topic, give a friendly 1-phrase deflection and immediately pivot back to this business.',
          '10. PROACTIVE SALES CONVERSION: When a visitor hesitates or says the site is not for them, gently probe their needs and offer a zero-risk next step (e.g. capturing their contact or answering questions) instead of immediately giving up.',
        ]
          .filter(Boolean)
          .join('\n');
      }

      const voiceName = normalizeGeminiVoice(agentConfig?.voice?.voiceId);

      // Cache base template for 5 minutes
      this.instructionCache.set(businessId, {
        instruction: baseInstruction,
        archetype: capability.archetype,
        isPlatform: capability.isPlatform,
        hasCatalog,
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
3. Help the shopper discover items, check prices and availability, and build their cart smoothly.`;

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
      let productPageSnippet = '';
      const curPath = clientContext.currentPath || '';
      if (curPath.includes('/products/')) {
        const slug = curPath.split('/products/')[1]?.split(/[?#]/)[0]?.replace(/\/$/, '') || '';
        if (slug) {
          productPageSnippet = `\n• ACTIVE PRODUCT ON THIS PAGE (Customer is viewing this right now!):
  - Product Handle: "${slug}"
  - Page Title: "${clientContext.title || ''}"
  - When the customer says "add this product", "add to cart", "buy this", or asks questions about "this", they mean THIS item! Call add_to_cart using productId: "${slug}" or the product name!`;
        }
      }

      browsingContext = `
REAL-TIME VISITOR BROWSING STATE (Live Telemetry from Visitor's Browser):
• Current Page: ${clientContext.currentPath || '/'} (${clientContext.title || 'Active Page'})
• Visible Section: ${clientContext.activeSection || 'Top of Page'}
• Session Browsing History: ${histStr}${productPageSnippet}

* REAL-TIME BROWSING AWARENESS RULES:
1. You are 100% aware of where the visitor is in the web app right now.
2. If the visitor is ALREADY on the requested page (e.g. they ask about pricing while on /pricing, or about features while looking at features), acknowledge that they are currently on it (e.g. "As you can see right here on our pricing page...") and NEVER ask if they want to navigate there!
3. If they ask "where am I?", "what page is this?", or "what was the last page I visited?", answer accurately from the real-time browsing state above.
4. If they ask to add "this product" to cart while on a product page, call add_to_cart immediately using the active product handle or title!`;
    }

    return [baseInstruction, customerContext, browsingContext].filter(Boolean).join('\n\n');
  }

  getToolDeclarations(
    archetype?: string,
    isPlatform: boolean = false,
    hasCatalog?: boolean,
  ) {
    return getToolsForArchetype(archetype, isPlatform, hasCatalog);
  }

  public invalidateInstructionCache(businessId?: string): void {
    if (businessId) {
      this.instructionCache.delete(businessId);
      this.trainingInstructionCache.delete(businessId);
    } else {
      this.instructionCache.clear();
      this.trainingInstructionCache.clear();
    }
  }

  /**
   * The instruction for a merchant teaching their own agent.
   *
   * This is deliberately not a variant of the storefront persona. The person
   * speaking owns the business: they are not a lead to qualify, they do not
   * need to be sold to or walked to a page, and every fact they state is
   * ground truth to be captured rather than a query to be answered. The
   * agent's whole job here is to listen, confirm briefly, and ask for the
   * detail that is missing.
   */
  private async buildTrainingInstruction(
    businessId: string,
    authenticatedUser?: { id: string; name: string; email: string; role: string },
  ): Promise<string> {
    const cached = this.trainingInstructionCache.get(businessId);
    let baseInstruction = cached && cached.expiresAt > Date.now() ? cached.instruction : '';

    if (!baseInstruction) {
      const [agentConfig, bizDoc, docsRes] = await Promise.all([
        this.agentConfigService.getConfig(businessId).catch(() => null),
        this.businessModel
          ? this.businessModel.findById(businessId).exec().catch(() => null)
          : Promise.resolve(null),
        this.knowledgeService
          ? this.knowledgeService
              .findAll(businessId, undefined, undefined, { limit: 25 })
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      const siteName = bizDoc?.name || 'this business';

      // What the agent already knows, by title only. Enough for it to say "you
      // have already told me about returns" without reciting the content back.
      let knownTopics = '';
      if (docsRes && docsRes.items && docsRes.items.length > 0) {
        const titles = docsRes.items
          .map((d: any) => `  • ${d.title} (${d.docType})`)
          .join('\n');
        knownTopics = `\nWHAT YOU ALREADY KNOW ABOUT ${siteName.toUpperCase()} (titles only):\n${titles}\n* If the owner repeats one of these, say you have it and ask whether it has changed, rather than collecting it twice.`;
      } else {
        knownTopics = `\nWHAT YOU ALREADY KNOW ABOUT ${siteName.toUpperCase()}:\n  • Nothing yet — this is the first training session. Start from the basics: what the business sells or does, and who its customers are.`;
      }

      const languageDirective =
        (agentConfig?.config?.language || 'en').toLowerCase().trim() === 'en'
          ? ''
          : `\nLANGUAGE: The owner may speak in their configured language (${agentConfig?.config?.language}). Follow whichever language they speak in.`;

      baseInstruction = [
        `You are ORA in TRAINING MODE, being taught about "${siteName}" by its owner${authenticatedUser?.name ? `, ${authenticatedUser.name}` : ''}.`,
        '',
        'WHO YOU ARE TALKING TO:',
        '- The person speaking OWNS this business. They are not a customer, not a lead, and not a visitor.',
        '- Everything they tell you is ground truth about the business. Your job is to capture it accurately, not to evaluate, sell, or answer it.',
        '',
        'YOUR ONLY JOB IN THIS SESSION:',
        '1. Listen to what the owner tells you about their business and hold it.',
        '2. Confirm each fact in ONE short sentence so they know it landed. For example: "Got it — thirty day returns, unopened only."',
        '3. Ask ONE short follow-up question when a fact is incomplete or ambiguous, then go quiet and let them talk.',
        '4. When they pause with nothing more to say on a topic, suggest the next topic that is still missing.',
        '',
        'HOW TO BEHAVE (this is the opposite of your storefront behaviour):',
        '- NEVER sell, pitch, persuade, or handle objections. There is nothing to sell here.',
        '- NEVER offer to navigate, open a page, or take them anywhere.',
        '- NEVER answer as if you were serving a shopper, and never role-play a customer conversation unless the owner explicitly asks you to.',
        '- NEVER ask for their name, email, phone, or company. You already know who they are.',
        '- NEVER lecture them about their own business or suggest what their policy should be.',
        '- Do not repeat back everything they said. A short confirmation, then silence, so they keep talking.',
        '- Keep every response to one or two short sentences. You are the note-taker, they are the speaker.',
        '',
        'WHAT TO COLLECT, ROUGHLY IN THIS ORDER (skip anything already known):',
        '- What the business sells or does, and who its customers are.',
        '- Policies: returns, refunds, shipping and delivery, warranty, cancellation.',
        '- Products or services: what they are, what they are made of or include, sizes and variants, care or usage.',
        '- Pricing guidance: what is negotiable, what discounts or bundles exist, what never to discount.',
        '- Questions customers ask most often, and the answers you should give.',
        '- Tone and wording: how you should sound, and anything you must never say.',
        '',
        'ASKING GOOD QUESTIONS:',
        '- Ask for specifics, not essays: "How many days for a return?" beats "Tell me about returns."',
        '- One question at a time. Never stack two questions in one turn.',
        '- If they say something vague like "shipping is fast", ask what fast means in days.',
        '',
        knownTopics,
        languageDirective,
        '',
        'CRITICAL RULES FOR REAL-TIME VOICE:',
        '1. Speak in clear, natural English unless the owner speaks another language to you first.',
        '2. You are speaking out loud. Keep it CONCISE — one or two short sentences, never a speech.',
        '3. NEVER output markdown, bullet characters, or asterisks. You are speaking, not typing.',
        '4. NEVER narrate your own machinery. Do not mention tools, functions, lookups, prompts, instructions, rules, or that you are saving anything. Do not say "I have recorded that" — the saving happens elsewhere, and claiming it would be a lie.',
        '5. SILENT SYSTEM MARKERS: messages starting with [PAGE_STATE], [SYSTEM_TRIGGER: ...] or [SYSTEM_UPDATE: ...] are stage directions from the system, not the owner speaking. Act on them silently. Never read, quote, summarise or answer them.',
        '6. search_knowledge_base is your only tool. Use it sparingly — only to check whether a topic is already covered before asking the owner to repeat it.',
        '7. If the owner asks you a question about their own business, answer briefly from what you know, then return to collecting.',
      ]
        .filter(Boolean)
        .join('\n');

      const voiceName = normalizeGeminiVoice(
        (await this.agentConfigService.getConfig(businessId).catch(() => null))?.voice?.voiceId,
      );

      this.trainingInstructionCache.set(businessId, {
        instruction: baseInstruction,
        voiceName,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }

    return baseInstruction;
  }
}
// Cache refreshed for modern catalog sync

