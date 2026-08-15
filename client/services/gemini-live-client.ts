/**
 * GeminiLiveClient
 * High-performance direct client-side Gemini Multimodal Live API WebSocket client.
 * Provides ultra-low latency bidirectional audio streaming and real-time tool execution.
 */

export interface LiveClientOptions {
  publishableKey: string;
  sessionId: string;
  apiBaseUrl?: string;
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error') => void;
  onTranscript?: (sender: 'user' | 'agent' | 'system', text: string) => void;
  onAudioLevel?: (level: number) => void;
  onLatency?: (rttMs: number) => void;
  onError?: (errMessage: string) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted: boolean = false;
  private options: LiveClientOptions;
  private businessId: string | null = null;
  private setupConfirmed: boolean = false;

  constructor(options: LiveClientOptions) {
    this.options = options;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public async start(): Promise<void> {
    const {
      publishableKey,
      sessionId,
      apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      onStatusChange,
      onTranscript,
      onError,
    } = this.options;

    try {
      this.stop();
      onStatusChange?.('connecting');
      onTranscript?.('system', 'Requesting ephemeral voice session bootstrap from ORA server...');

      const startTime = performance.now();

      // 1. Fetch Bootstrap Configuration from ORA Backend
      const bootstrapRes = await fetch(`${apiBaseUrl}/api/v1/voice/session/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishableKey, sessionId }),
      });

      if (!bootstrapRes.ok) {
        const errorJson = await bootstrapRes.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || errorJson?.message || 'Failed to bootstrap voice session.');
      }

      const bootstrapEnvelope = await bootstrapRes.json();
      const bootstrap = bootstrapEnvelope.data;
      this.businessId = bootstrap.businessId;

      const bootstrapRtt = Math.round(performance.now() - startTime);
      this.options.onLatency?.(bootstrapRtt);
      onTranscript?.('system', `✅ Session bootstrap received (${bootstrapRtt}ms). Connecting directly to Gemini Live API...`);

      // 2. Determine WebSocket URL
      let targetWsUrl = bootstrap.wsUrl;
      if (bootstrap.isEphemeral) {
        targetWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${bootstrap.token}`;
      }

      // 3. Connect direct WebSocket to Google Gemini Live API
      const ws = new WebSocket(targetWsUrl);
      this.ws = ws;

      // 4. Setup Web Audio Context (Mic input 16kHz, Output 24kHz)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      this.audioCtx = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      this.nextPlayTime = audioCtx.currentTime;

      // 5. Connect Microphone MediaStream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.micStream = stream;

      const source = audioCtx.createMediaStreamSource(stream);

      // 6. Audio Level Analyser
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      this.analyser = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        this.options.onAudioLevel?.(Math.min(100, Math.round((avg / 128) * 100)));
        this.animFrameId = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 7. Setup AudioWorklet (with fallback to ScriptProcessor)
      let workletLoaded = false;
      try {
        await audioCtx.audioWorklet.addModule('/audio-processors/pcm-recorder-worklet.js');
        const workletNode = new AudioWorkletNode(audioCtx, 'pcm-recorder-processor');
        this.workletNode = workletNode;

        workletNode.port.onmessage = (event) => {
          if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupConfirmed) return;
          const { pcm16Data } = event.data;
          if (pcm16Data) {
            const base64Audio = this.arrayBufferToBase64(pcm16Data);
            this.sendMediaChunk(base64Audio);
          }
        };

        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);
        workletLoaded = true;
      } catch (workletErr) {
        console.warn('[GeminiLiveClient] AudioWorklet not available, falling back to ScriptProcessor:', workletErr);
      }

      if (!workletLoaded) {
        const processor = audioCtx.createScriptProcessor(2048, 1, 1);
        this.scriptProcessor = processor;
        processor.onaudioprocess = (e) => {
          if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupConfirmed) return;
          const input = e.inputBuffer.getChannelData(0);
          const base64Pcm = this.float32ToInt16Base64(input);
          this.sendMediaChunk(base64Pcm);
        };
        source.connect(processor);
        processor.connect(audioCtx.destination);
      }

      // 8. WebSocket Event Handlers
      ws.onopen = () => {
        onTranscript?.('system', '⚡ Direct Gemini Live WebSocket open. Handshaking setup...');

        // Send Setup Payload
        const setupPayload = {
          setup: {
            model: bootstrap.model,
            generationConfig: {
              responseModalities: ['AUDIO'],
              thinkingConfig: {
                thinkingBudget: 0,
              },
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: bootstrap.voiceConfig?.voiceName || 'Puck',
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: bootstrap.systemInstruction }],
            },
            tools: [
              {
                functionDeclarations: bootstrap.tools,
              },
            ],
          },
        };

        ws.send(JSON.stringify(setupPayload));
      };

      ws.onmessage = async (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
          const message = JSON.parse(raw);

          // Setup Confirmed
          if (message.setupComplete && !this.setupConfirmed) {
            this.setupConfirmed = true;
            onStatusChange?.('listening');
            onTranscript?.('system', '🎙️ Direct ORA Voice Live Agent active! Speak into microphone.');
            return;
          }

          // Handle Barge-in / Interruption
          if (message.serverContent?.interrupted) {
            this.flushPlaybackQueue();
            onStatusChange?.('listening');
            return;
          }

          // Handle Audio & Text Output from Gemini
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                this.playPcm24kBase64(part.inlineData.data);
              }
              if (part.text) {
                const cleanText = part.text.trim();
                if (cleanText && !cleanText.startsWith('**') && !cleanText.startsWith('#')) {
                  onTranscript?.('agent', cleanText);
                }
              }
            }
          }

          // Handle Gemini Tool Calls (find_products, add_to_cart, place_order, etc.)
          if (message.toolCall) {
            const functionCalls = message.toolCall.functionCalls || [];
            for (const call of functionCalls) {
              onTranscript?.('system', `⚡ ORA executing action: ${call.name}...`);

              const toolResult = await this.executeToolOnBackend(
                apiBaseUrl,
                call.name,
                call.args || {},
              );

              // Return Tool Response directly back to Gemini Live WebSocket
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

              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(toolResponsePayload));
              }
            }
          }
        } catch (err: any) {
          console.error('[GeminiLiveClient] Error handling message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[GeminiLiveClient] WebSocket error:', err);
        onStatusChange?.('error');
        onError?.('Direct Gemini Live connection error.');
        onTranscript?.('system', '❌ Error connecting directly to Gemini Live API.');
      };

      ws.onclose = (event) => {
        console.log(`[GeminiLiveClient] WebSocket closed (code ${event.code})`);
        onStatusChange?.('idle');
      };
    } catch (err: any) {
      console.error('[GeminiLiveClient] Start failed:', err);
      onStatusChange?.('error');
      onError?.(err.message || 'Failed to start Gemini Live session.');
      onTranscript?.('system', `Error: ${err.message}`);
    }
  }

  private sendMediaChunk(base64Pcm: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm,
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(payload));
  }

  private async executeToolOnBackend(
    apiBaseUrl: string,
    toolName: string,
    args: Record<string, any>,
  ): Promise<any> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/voice/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishableKey: this.options.publishableKey,
          businessId: this.businessId,
          sessionId: this.options.sessionId,
          toolName,
          args,
        }),
      });

      if (!response.ok) {
        return { error: `Backend tool execution failed (${response.statusText})` };
      }

      const resJson = await response.json();
      return resJson?.data?.output || resJson?.data || { success: true };
    } catch (err: any) {
      return { error: err.message || 'Tool execution network error' };
    }
  }

  private playPcm24kBase64(base64Pcm: string) {
    try {
      if (!this.audioCtx) return;
      const audioCtx = this.audioCtx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const numSamples = int16Array.length;
      const float32Array = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 32768 : 32767);
      }

      const audioBuffer = audioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      sourceNode.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(sourceNode);
      this.options.onStatusChange?.('speaking');

      sourceNode.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== sourceNode);
        if (this.audioCtx && this.audioCtx.currentTime >= this.nextPlayTime - 0.05) {
          this.options.onStatusChange?.('listening');
        }
      };
    } catch (err: any) {
      console.error('[GeminiLiveClient] Audio playback error:', err);
    }
  }

  private flushPlaybackQueue() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  public stop() {
    this.setupConfirmed = false;
    this.flushPlaybackQueue();

    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {}
      this.workletNode = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }

    this.options.onStatusChange?.('idle');
    this.options.onAudioLevel?.(0);
  }

  private float32ToInt16Base64(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    let binary = '';
    const bytes = new Uint8Array(int16Array.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
