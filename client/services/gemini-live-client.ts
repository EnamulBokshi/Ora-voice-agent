/**
 * GeminiLiveClient (Proxy Mode)
 *
 * Connects to the ORA server-side WebSocket proxy at /ws/voice instead of
 * connecting directly to Google Gemini Live API. The API key never leaves
 * the server — the client just exchanges audio frames with ORA's proxy.
 *
 * Protocol (client ↔ ORA proxy):
 *   Client → Server:  { type: 'audio', data: '<base64 pcm16k>' }
 *   Server → Client:  { type: 'setup_complete' }
 *   Server → Client:  { type: 'audio', data: '<base64 pcm24k>' }
 *   Server → Client:  { type: 'text', text: '...' }
 *   Server → Client:  { type: 'interrupted' }
 *   Server → Client:  { type: 'turn_complete' }
 *   Server → Client:  { type: 'tool_result', toolName: '...' }
 *   Server → Client:  { type: 'error', message: '...' }
 *   Server → Client:  { type: 'session_closed' }
 */

export interface LiveClientOptions {
  publishableKey: string;
  sessionId: string;
  apiBaseUrl?: string;
  authToken?: string;
  clientContext?: {
    currentPath?: string;
    title?: string;
    history?: string[];
    activeSection?: string;
  };
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error') => void;
  onTranscript?: (sender: 'user' | 'agent' | 'system', text: string) => void;
  onAudioLevel?: (level: number) => void;
  onLatency?: (rttMs: number) => void;
  onAction?: (action: { type: string; destination: string; reason?: string }) => void;
  onError?: (errMessage: string) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted: boolean = false;
  private isAgentSpeaking: boolean = false;
  private userHasSpoken: boolean = false;
  private silenceStartTime: number = 0;
  private idleTimer: any = null;
  private options: LiveClientOptions;
  private setupConfirmed: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(options: LiveClientOptions) {
    this.options = options;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public sendContextUpdate(context: {
    currentPath?: string;
    title?: string;
    history?: string[];
    activeSection?: string;
  }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'client_context_update',
          ...context,
        }),
      );
    }
  }

  private handlePageHide = () => {
    this.stop();
  };

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.options.onTranscript?.('system', '⏱️ Session closed due to 45s inactivity.');
      this.stop();
    }, 45000);
  }

  public async start(): Promise<void> {
    const {
      publishableKey,
      sessionId,
      apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      authToken,
      onStatusChange,
      onTranscript,
      onError,
    } = this.options;

    try {
      this.stop();

      // ── Broadcast cross-tab single-instance mutex ─────────────────────────────
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (!this.broadcastChannel) {
          this.broadcastChannel = new BroadcastChannel('ora_voice_mutex');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'EXCLUSIVE_VOICE_START' && event.data?.sessionId !== sessionId) {
              this.stop();
            }
          };
        }
        this.broadcastChannel.postMessage({
          type: 'EXCLUSIVE_VOICE_START',
          sessionId,
        });
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', this.handlePageHide);
        window.addEventListener('beforeunload', this.handlePageHide);
      }

      onStatusChange?.('connecting');
      onTranscript?.('system', '⚡ Fast-connecting to ORA Voice Proxy...');

      const startTime = performance.now();

      // ── 1. Direct WebSocket URL Construction (Zero HTTP roundtrip penalty) ───
      const wsBase = apiBaseUrl.replace(/^http/, 'ws');
      const wsPath = '/ws/voice';
      const ctx = this.options.clientContext;
      const contextParams = ctx
        ? `&currentPath=${encodeURIComponent(ctx.currentPath || '/')}&pageTitle=${encodeURIComponent(ctx.title || '')}&history=${encodeURIComponent((ctx.history || []).join(','))}&activeSection=${encodeURIComponent(ctx.activeSection || '')}`
        : '';
      const authParam = authToken ? `&authToken=${encodeURIComponent(authToken)}` : '';
      const wsUrl = `${wsBase}${wsPath}?publishableKey=${encodeURIComponent(publishableKey)}&sessionId=${encodeURIComponent(sessionId)}${authParam}${contextParams}`;

      // Open WebSocket immediately
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      // ── 2. Concurrently Initialize AudioContexts and Microphone Stream ───────
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      const outputAudioCtx = new AudioCtx();

      this.inputAudioCtx = inputAudioCtx;
      this.outputAudioCtx = outputAudioCtx;

      // Run audio context resume and getUserMedia in parallel with WS connection
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }),
        inputAudioCtx.state === 'suspended' ? inputAudioCtx.resume() : Promise.resolve(),
        outputAudioCtx.state === 'suspended' ? outputAudioCtx.resume() : Promise.resolve(),
      ]);

      this.micStream = stream;
      this.nextPlayTime = outputAudioCtx.currentTime;

      const connectionRtt = Math.round(performance.now() - startTime);
      this.options.onLatency?.(connectionRtt);

      const source = inputAudioCtx.createMediaStreamSource(stream);

      // ── 3. Audio Level Analyser & Thinking Detector ───────────────────────────
      const analyser = inputAudioCtx.createAnalyser();
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
        const level = Math.min(100, Math.round((avg / 128) * 100));
        this.options.onAudioLevel?.(level);

        // VAD (Voice Activity Detection): User is actively speaking
        if (level > 12 && !this.isAgentSpeaking) {
          this.userHasSpoken = true;
          this.silenceStartTime = 0;
          this.resetIdleTimer();
          if (this.setupConfirmed) {
            onStatusChange?.('listening');
          }
        } else if (this.userHasSpoken && level <= 12 && !this.isAgentSpeaking) {
          // User just finished their utterance -> transition to thinking
          if (!this.silenceStartTime) {
            this.silenceStartTime = Date.now();
          } else if (Date.now() - this.silenceStartTime > 450) {
            this.userHasSpoken = false;
            this.silenceStartTime = 0;
            if (this.setupConfirmed && !this.isAgentSpeaking) {
              onStatusChange?.('thinking');
            }
          }
        }

        this.animFrameId = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // ── 6. Setup AudioWorklet (with fallback to ScriptProcessor) ─────────────
      let workletLoaded = false;
      try {
        await inputAudioCtx.audioWorklet.addModule('/audio-processors/pcm-recorder-worklet.js');
        const workletNode = new AudioWorkletNode(inputAudioCtx, 'pcm-recorder-processor');
        this.workletNode = workletNode;

        workletNode.port.onmessage = (event) => {
          if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupConfirmed || this.isAgentSpeaking) return;
          const { pcm16Data } = event.data;
          if (pcm16Data) {
            const base64Audio = this.arrayBufferToBase64(pcm16Data);
            this.sendAudioChunk(base64Audio);
          }
        };

        source.connect(workletNode);
        workletLoaded = true;
      } catch (workletErr) {
        console.warn('[GeminiLiveClient] AudioWorklet fallback:', workletErr);
      }

      if (!workletLoaded) {
        const processor = inputAudioCtx.createScriptProcessor(2048, 1, 1);
        this.scriptProcessor = processor;
        processor.onaudioprocess = (e) => {
          if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupConfirmed || this.isAgentSpeaking) return;
          const input = e.inputBuffer.getChannelData(0);
          const base64Pcm = this.float32ToInt16Base64(input);
          this.sendAudioChunk(base64Pcm);
        };
        source.connect(processor);
        const silentGain = inputAudioCtx.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(inputAudioCtx.destination);
      }

      // ── 7. WebSocket Event Handlers ───────────────────────────────────────────
      ws.onopen = () => {
        onTranscript?.('system', '⚡ Connected to ORA Voice Proxy. Setting up AI stream...');
      };

      ws.onmessage = async (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
          const message = JSON.parse(raw);
          this.resetIdleTimer();

          switch (message.type) {
            case 'setup_complete':
              this.setupConfirmed = true;
              this.isAgentSpeaking = false;
              this.resetIdleTimer();
              onStatusChange?.('listening');
              onTranscript?.('system', '🎙️ ORA is live and listening! Speak into your mic.');
              break;

            case 'audio':
              this.playPcm24kBase64(message.data);
              break;

            case 'text':
              if (message.text) {
                const cleanText = message.text.trim();
                if (cleanText && !cleanText.startsWith('**') && !cleanText.startsWith('#')) {
                  onTranscript?.('agent', cleanText);
                }
              }
              break;

            case 'interrupted':
              this.flushPlaybackQueue();
              this.isAgentSpeaking = false;
              onStatusChange?.('listening');
              break;

            case 'turn_complete':
              if (this.activeSources.length === 0 && this.outputAudioCtx) {
                this.nextPlayTime = this.outputAudioCtx.currentTime;
                this.isAgentSpeaking = false;
                onStatusChange?.('listening');
              }
              break;

            case 'tool_result':
              onTranscript?.('system', `⚡ ORA executed: ${message.toolName}`);
              if (message.action) {
                this.options.onAction?.(message.action);
              }
              break;

            case 'error':
              onStatusChange?.('error');
              onError?.(message.message || 'Voice session error.');
              onTranscript?.('system', `❌ ${message.message || 'Voice session error.'}`);
              break;

            case 'session_closed':
              onStatusChange?.('idle');
              break;

            default:
              break;
          }
        } catch (err: any) {
          console.error('[GeminiLiveClient] Error handling proxy message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[GeminiLiveClient] Proxy WebSocket error:', err);
        onStatusChange?.('error');
        onError?.('ORA Voice Proxy connection error.');
        onTranscript?.('system', '❌ Error connecting to ORA Voice Proxy.');
      };

      ws.onclose = (event) => {
        console.log(`[GeminiLiveClient] Proxy WebSocket closed (code ${event.code})`);
        onStatusChange?.('idle');
      };
    } catch (err: any) {
      console.error('[GeminiLiveClient] Start failed:', err);
      onStatusChange?.('error');
      onError?.(err.message || 'Failed to start voice session.');
      this.options.onTranscript?.('system', `Error: ${err.message}`);
    }
  }

  /** Send a base64-encoded PCM 16kHz audio chunk to the ORA proxy */
  private sendAudioChunk(base64Pcm: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'audio', data: base64Pcm }));
  }

  private playPcm24kBase64(base64Pcm: string) {
    try {
      if (!this.outputAudioCtx) return;
      const audioCtx = this.outputAudioCtx;
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
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now;
      }

      const startTime = this.nextPlayTime;
      sourceNode.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(sourceNode);
      this.isAgentSpeaking = true;
      this.userHasSpoken = false;
      this.options.onStatusChange?.('speaking');

      sourceNode.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== sourceNode);
        if (this.activeSources.length === 0 || (this.outputAudioCtx && this.outputAudioCtx.currentTime >= this.nextPlayTime - 0.05)) {
          this.isAgentSpeaking = false;
          this.options.onStatusChange?.('listening');
        }
      };
    } catch (err: any) {
      console.error('[GeminiLiveClient] Audio playback error:', err);
    }
  }

  private flushPlaybackQueue() {
    this.isAgentSpeaking = false;
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  public stop() {
    this.setupConfirmed = false;
    this.isAgentSpeaking = false;
    this.userHasSpoken = false;
    this.silenceStartTime = 0;

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.flushPlaybackQueue();

    if (this.workletNode) {
      try { this.workletNode.disconnect(); } catch {}
      this.workletNode = null;
    }

    if (this.scriptProcessor) {
      try { this.scriptProcessor.disconnect(); } catch {}
      this.scriptProcessor = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.micStream = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    if (this.inputAudioCtx) {
      try { this.inputAudioCtx.close(); } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try { this.outputAudioCtx.close(); } catch {}
      this.outputAudioCtx = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.handlePageHide);
      window.removeEventListener('beforeunload', this.handlePageHide);
    }

    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch {}
      this.broadcastChannel = null;
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
