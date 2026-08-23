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
  onAction?: (action: { type: string; destination?: string; reason?: string; data?: any }) => void;
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
  private pendingAudioQueue: string[] = [];
  private recognition: any = null;

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

  public sendUserTranscript(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text?.trim()) {
      this.ws.send(
        JSON.stringify({
          type: 'user_transcript',
          text: text.trim(),
        }),
      );
    }
  }

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text?.trim()) {
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text: text.trim(),
        }),
      );
    }
  }

  private handlePageHide = () => {
    this.stop(true);
  };

  private lastActivityTime: number = Date.now();
  private idleWatcherInterval: any = null;

  private recordActivity() {
    this.lastActivityTime = Date.now();
  }

  private startIdleWatcher() {
    if (this.idleWatcherInterval) clearInterval(this.idleWatcherInterval);
    this.lastActivityTime = Date.now();

    this.idleWatcherInterval = setInterval(() => {
      // If agent is actively speaking / playing audio, conversation is ongoing
      if (this.isAgentSpeaking || this.activeSources.length > 0) {
        this.lastActivityTime = Date.now();
        return;
      }

      const idleDurationMs = Date.now() - this.lastActivityTime;
      if (idleDurationMs >= 10000) {
        console.log('[GeminiLiveClient] Inactivity timeout (10s) reached. Gracefully closing session.');
        this.options.onTranscript?.('system', '⏱️ Session closed due to 10s inactivity.');
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(JSON.stringify({ type: 'client_idle_suspend', sessionId: this.options.sessionId }));
          } catch {}
        }
        this.stop();
      }
    }, 1000);
  }

  public async start(): Promise<void> {
    const {
      publishableKey,
      sessionId,
      apiBaseUrl,
      authToken,
      onStatusChange,
      onTranscript,
      onError,
    } = this.options;

    try {
      this.stop();
      this.pendingAudioQueue = [];

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
      let wsBase: string;
      if (process.env.NEXT_PUBLIC_WS_URL) {
        wsBase = process.env.NEXT_PUBLIC_WS_URL.replace(/^http/, 'ws');
      } else if (typeof window !== 'undefined') {
        const isLocalhost =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '0.0.0.0';

        if (isLocalhost) {
          // In local development, the NestJS WebSocket proxy is hosted on port 5000
          wsBase = 'ws://localhost:5000';
        } else {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsBase = `${wsProtocol}//${window.location.host}`;
        }
      } else if (apiBaseUrl && apiBaseUrl.startsWith('http')) {
        wsBase = apiBaseUrl.replace(/^http/, 'ws');
      } else {
        wsBase = 'ws://localhost:5000';
      }

      const wsPath = '/ws/voice';
      const ctx = this.options.clientContext;
      const contextParams = ctx
        ? `&currentPath=${encodeURIComponent(ctx.currentPath || '/')}&pageTitle=${encodeURIComponent(ctx.title || '')}&history=${encodeURIComponent((ctx.history || []).join(','))}&activeSection=${encodeURIComponent(ctx.activeSection || '')}`
        : '';
      const authParam = authToken ? `&authToken=${encodeURIComponent(authToken)}` : '';
      const wsUrl = `${wsBase}${wsPath}?publishableKey=${encodeURIComponent(publishableKey)}&sessionId=${encodeURIComponent(sessionId)}${authParam}${contextParams}`;

      // ── 2. Open WebSocket IMMEDIATELY and Bind Event Listeners Synchronously ───
      // CRITICAL: Event listeners MUST be attached before any async operations (getUserMedia / worklet fetch)
      // to guarantee setup_complete and early audio frames are NEVER dropped by the browser.
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        onTranscript?.('system', '⚡ Connected to ORA Voice Proxy. Setting up AI stream...');
      };

      ws.onmessage = async (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
          const message = JSON.parse(raw);

          switch (message.type) {
            case 'setup_complete':
              this.setupConfirmed = true;
              this.isAgentSpeaking = false;
              this.recordActivity();
              this.startSpeechRecognition();
              onStatusChange?.('listening');
              onTranscript?.('system', '🎙️ ORA is live and listening! Speak into your mic.');
              break;

            case 'audio':
              this.recordActivity();
              if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
                this.playPcm24kBase64(message.data);
              } else {
                this.pendingAudioQueue.push(message.data);
              }
              break;

            case 'text':
              this.recordActivity();
              if (message.text) {
                const cleanText = message.text.trim();
                if (cleanText && !cleanText.startsWith('**') && !cleanText.startsWith('#')) {
                  onTranscript?.('agent', cleanText);
                }
              }
              break;

            case 'interrupted':
              this.recordActivity();
              this.flushPlaybackQueue();
              this.isAgentSpeaking = false;
              onStatusChange?.('listening');
              break;

            case 'turn_complete':
              this.recordActivity();
              if (this.activeSources.length === 0 && this.outputAudioCtx) {
                this.nextPlayTime = this.outputAudioCtx.currentTime;
                this.isAgentSpeaking = false;
                onStatusChange?.('listening');
              }
              break;

            case 'tool_result':
              this.recordActivity();
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

      // ── 3. Concurrently Initialize AudioContexts, Microphone Stream, and Inlined Worklet ───
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputAudioCtx = new AudioCtx({ sampleRate: 16000, latencyHint: 'interactive' });
      const outputAudioCtx = new AudioCtx({ sampleRate: 24000, latencyHint: 'interactive' });

      this.inputAudioCtx = inputAudioCtx;
      this.outputAudioCtx = outputAudioCtx;

      // Inlined AudioWorkletProcessor — 512 samples (~32ms) chunks for zero-latency streaming
      const workletCode = `
        class PCMRecorderProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferSize = 512;
            this.buffer = new Float32Array(this.bufferSize);
            this.bytesWritten = 0;
          }
          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            const channel = input[0];
            for (let i = 0; i < channel.length; i++) {
              this.buffer[this.bytesWritten++] = channel[i];
              if (this.bytesWritten >= this.bufferSize) {
                this.flush();
              }
            }
            return true;
          }
          flush() {
            if (this.bytesWritten === 0) return;
            const int16Array = new Int16Array(this.bytesWritten);
            for (let i = 0; i < this.bytesWritten; i++) {
              const s = Math.max(-1, Math.min(1, this.buffer[i]));
              int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            this.port.postMessage({ pcm16Data: int16Array.buffer }, [int16Array.buffer]);
            this.bytesWritten = 0;
          }
        }
        registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
      `;

      let workletUrl = '';
      try {
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        workletUrl = URL.createObjectURL(blob);
      } catch {}

      // Run audio context resume, getUserMedia, and inlined worklet registration concurrently
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
        workletUrl && inputAudioCtx.audioWorklet
          ? inputAudioCtx.audioWorklet.addModule(workletUrl).catch((err) => {
              console.warn('[GeminiLiveClient] Worklet registration warning:', err);
            })
          : Promise.resolve(),
      ]);

      if (workletUrl) {
        try { URL.revokeObjectURL(workletUrl); } catch {}
      }

      this.micStream = stream;
      this.nextPlayTime = outputAudioCtx.currentTime;

      // Flush any early audio chunks received during microphone permission prompt
      while (this.pendingAudioQueue.length > 0) {
        const queuedAudio = this.pendingAudioQueue.shift();
        if (queuedAudio) this.playPcm24kBase64(queuedAudio);
      }

      if (this.setupConfirmed) {
        onStatusChange?.('listening');
      }
      this.startIdleWatcher();

      const connectionRtt = Math.round(performance.now() - startTime);
      this.options.onLatency?.(connectionRtt);

      const source = inputAudioCtx.createMediaStreamSource(stream);

      // ── 4. Audio Level Analyser & Thinking Detector ───────────────────────────
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

        // VAD (Voice Activity Detection): Visual state indication
        if (level > 24 && !this.isAgentSpeaking) {
          this.userHasSpoken = true;
          this.silenceStartTime = 0;
          if (this.setupConfirmed) {
            onStatusChange?.('listening');
          }
        } else if (this.userHasSpoken && level <= 24 && !this.isAgentSpeaking) {
          // User just finished their utterance -> transition to thinking
          if (!this.silenceStartTime) {
            this.silenceStartTime = Date.now();
          } else if (Date.now() - this.silenceStartTime > 350) {
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

      // ── 5. Setup AudioWorklet (with fallback to ScriptProcessor) ─────────────
      let workletActive = false;
      try {
        if (inputAudioCtx.audioWorklet) {
          const workletNode = new AudioWorkletNode(inputAudioCtx, 'pcm-recorder-processor');
          this.workletNode = workletNode;

          workletNode.port.onmessage = (event) => {
            if (
              this.isMuted ||
              !this.ws ||
              this.ws.readyState !== WebSocket.OPEN ||
              !this.setupConfirmed ||
              this.isAgentSpeaking
            )
              return;
            const { pcm16Data } = event.data;
            if (pcm16Data) {
              const base64Audio = this.arrayBufferToBase64(pcm16Data);
              this.sendAudioChunk(base64Audio);
            }
          };

          source.connect(workletNode);
          workletActive = true;
        }
      } catch (workletErr) {
        console.warn('[GeminiLiveClient] AudioWorklet activation fallback:', workletErr);
      }

      if (!workletActive) {
        const processor = inputAudioCtx.createScriptProcessor(1024, 1, 1);
        this.scriptProcessor = processor;
        processor.onaudioprocess = (e) => {
          if (
            this.isMuted ||
            !this.ws ||
            this.ws.readyState !== WebSocket.OPEN ||
            !this.setupConfirmed ||
            this.isAgentSpeaking
          )
            return;
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
      const startTime = Math.max(now, this.nextPlayTime);
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
          this.recordActivity();
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

  public stop(silent = false) {
    this.setupConfirmed = false;
    this.isAgentSpeaking = false;
    this.userHasSpoken = false;
    this.silenceStartTime = 0;

    if (this.idleWatcherInterval) {
      clearInterval(this.idleWatcherInterval);
      this.idleWatcherInterval = null;
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

    this.stopSpeechRecognition();

    if (!silent) {
      this.options.onStatusChange?.('idle');
      this.options.onAudioLevel?.(0);
    }
  }

  private startSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.stopSpeechRecognition();
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';

      rec.onresult = (event: any) => {
        if (this.isMuted || this.isAgentSpeaking || this.activeSources.length > 0) return;

        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0] && res[0].transcript) {
            if (res.isFinal) finalTranscript += res[0].transcript;
            else interimTranscript += res[0].transcript;
          }
        }

        const cleanFinal = finalTranscript.trim();
        const cleanAll = (finalTranscript + ' ' + interimTranscript).trim();

        if (cleanFinal && event.results[event.results.length - 1]?.isFinal) {
          this.recordActivity();
          this.sendUserTranscript(cleanFinal);
          this.options.onTranscript?.('user', cleanFinal);
        } else if (cleanAll) {
          this.recordActivity();
        }
      };

      rec.onend = () => {
        if (this.setupConfirmed && !this.isMuted && this.recognition) {
          try { this.recognition.start(); } catch {}
        }
      };

      rec.start();
      this.recognition = rec;
    } catch (e) {
      console.debug('[GeminiLiveClient] SpeechRecognition notice:', e);
    }
  }

  private stopSpeechRecognition() {
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
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

  public confirmCustomerDetails(data: { name?: string; email?: string; phone?: string; address?: string; [key: string]: any }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'confirm_customer_details', data }));
    }
  }
}

