/**
 * ORA Voice AI — Storefront Embed Widget v4 (Ultra-Fast Proxy Edition)
 * Zero-latency real-time streaming, instant barge-in cutoff, smart positioning.
 *
 * ─── HTML script tag (Shopify, WooCommerce, Plain HTML) ─────────────────────
 *   <script
 *     src="https://yourapp.com/widget/ora-widget.js"
 *     data-ora-key="biz_live_your_key"
 *     data-ora-api="https://yourapp.com"
 *     defer>
 *   </script>
 *
 * ─── Next.js / React Apps ──────────────────────────────────────────────────
 *   <script dangerouslySetInnerHTML={{ __html: 'window.ORA_CONFIG={key:"...",api:"..."}' }} />
 *   <Script src="https://yourapp.com/widget/ora-widget.js" strategy="afterInteractive" />
 */
(function () {
  'use strict';

  if (window.__ORA_WIDGET_V4__) return;
  window.__ORA_WIDGET_V4__ = true;

  // ─── Config resolution ─────────────────────────────────────────────────────
  var _cfg = window.ORA_CONFIG || {};

  var scriptEl =
    document.currentScript ||
    document.querySelector('script[data-ora-key]') ||
    document.querySelector('script[src*="ora-widget.js"]');

  var publishableKey =
    _cfg.key ||
    (scriptEl && scriptEl.getAttribute('data-ora-key')) ||
    'biz_live_mock_key_12345';

  var apiBase = _cfg.api || (scriptEl && scriptEl.getAttribute('data-ora-api')) || null;
  if (!apiBase) {
    if (scriptEl && scriptEl.src) {
      try {
        var scriptUrl = new URL(scriptEl.src);
        if (scriptUrl.hostname === 'localhost' || scriptUrl.hostname === '127.0.0.1') {
          apiBase = scriptUrl.protocol + '//' + scriptUrl.hostname + ':5000';
        } else {
          apiBase = scriptUrl.origin;
        }
      } catch (e) {}
    }
  }
  if (!apiBase) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      apiBase = window.location.protocol + '//' + window.location.hostname + ':5000';
    } else {
      apiBase = window.location.origin;
    }
  }

  // Positioning: 'bottom-right' (default), 'bottom-left', or 'bottom-center'
  var position = _cfg.position || (scriptEl && scriptEl.getAttribute('data-ora-position')) || 'bottom-right';

  // ─── State ─────────────────────────────────────────────────────────────────
  let voiceState = 'idle'; // 'idle' | 'connecting' | 'active' | 'ora-speaking' | 'error'
  let isMuted = false;
  let liveUtterance = '';
  let liveSpeaker = null; // 'user' | 'agent' | null
  let showTranscript = false;
  let errorMsg = '';
  let lastSpeaker = null;
  let userMicLevel = 0;
  let speakingLevel = 0;
  let animFrameId = null;

  // Audio Contexts & Buffers
  let audioContext = null;    // 16 kHz capture
  let playbackContext = null; // 24 kHz playback
  let mediaStream = null;
  let processorNode = null;
  let muteGainNode = null;
  let audioQueueTime = 0;
  let activeSources = [];
  let geminiWs = null;
  let recognition = null;
  let sessionId = 'ses_w_' + Math.random().toString(36).substring(2, 9);

  // ─── Utilities ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function floatTo16BitPCM(input) {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buffer);
  }

  function downsampleTo16k(input, sampleRate) {
    if (sampleRate === 16000) return input;
    const ratio = sampleRate / 16000;
    const newLength = Math.max(1, Math.floor(input.length / ratio));
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originIdx = Math.min(input.length - 1, Math.round(i * ratio));
      result[i] = input[originIdx];
    }
    return result;
  }

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToFloat32Array(base64) {
    try {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] < 0 ? int16[i] / 32768 : int16[i] / 32767;
      }
      return float32;
    } catch (e) {
      return new Float32Array(0);
    }
  }

  function mergeStreamingText(prevText, chunk) {
    if (!chunk) return prevText;
    if (!prevText) return chunk.trimStart();
    if (chunk.startsWith(prevText)) return chunk;
    if (prevText.endsWith(chunk.trim()) && chunk.trim().length > 3) return prevText;
    const isPunctuation = /^[,.!?:;'")\]}]/.test(chunk);
    const isContraction = /^'(s|t|re|ve|m|ll|d)\b/i.test(chunk) || /^n't\b/i.test(chunk);
    const prevEndsSpace = prevText.endsWith(' ') || prevText.endsWith('\n');
    const chunkStartsSpace = chunk.startsWith(' ') || chunk.startsWith('\n');
    let merged;
    if (isPunctuation || isContraction) {
      merged = prevText.trimEnd() + chunk.trimStart();
    } else if (prevEndsSpace || chunkStartsSpace) {
      merged = prevText.trimEnd() + ' ' + chunk.trimStart();
    } else {
      const prevEndsPunct = /[.!?]$/.test(prevText);
      const chunkStartsCap = /^[A-Z0-9]/.test(chunk);
      merged = (prevEndsPunct || chunkStartsCap) ? prevText + ' ' + chunk : prevText + chunk;
    }
    return merged.replace(/[ \t]+/g, ' ').replace(/ ([.,!?:;])/g, '$1').replace(/ '/g, "'");
  }

  // ─── Inject CSS ─────────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes ora-w-bob {
      0%, 100% { transform: translateY(0px); }
      50%      { transform: translateY(-5px); }
    }
    @keyframes ora-w-glow-pulse {
      0%, 100% {
        box-shadow:
          inset -6px -6px 20px rgba(150, 100, 255, 0.5),
          inset 6px 6px 14px rgba(255, 255, 255, 0.35),
          0 0 25px rgba(150, 100, 255, 0.35),
          0 4px 16px rgba(0, 0, 0, 0.4);
      }
      50% {
        box-shadow:
          inset -6px -6px 25px rgba(150, 100, 255, 0.75),
          inset 6px 6px 18px rgba(255, 255, 255, 0.5),
          0 0 38px rgba(200, 240, 49, 0.5),
          0 6px 20px rgba(0, 0, 0, 0.5);
      }
    }
    @keyframes ora-w-speaking-pulse {
      0%, 100% {
        box-shadow:
          inset -8px -8px 25px rgba(150, 100, 255, 0.9),
          inset 8px 8px 18px rgba(255, 255, 255, 0.6),
          0 0 45px rgba(200, 240, 49, 0.8),
          0 0 25px rgba(168, 85, 247, 0.6);
      }
      50% {
        box-shadow:
          inset -8px -8px 30px rgba(150, 100, 255, 1),
          inset 8px 8px 22px rgba(255, 255, 255, 0.8),
          0 0 65px rgba(200, 240, 49, 1),
          0 0 35px rgba(168, 85, 247, 0.8);
      }
    }
    @keyframes ora-w-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes ora-w-pop-in {
      0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* ── Root Container ── */
    .ora-w-root {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      position: fixed;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
      user-select: none;
      animation: ora-w-pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ora-w-root.pos-bottom-right { bottom: 24px; right: 24px; }
    .ora-w-root.pos-bottom-left  { bottom: 24px; left: 24px; align-items: flex-start; }
    .ora-w-root.pos-bottom-center { bottom: 20px; left: 50%; transform: translateX(-50%); align-items: center; }

    /* ── Orb Container ── */
    .ora-w-container {
      position: relative;
      width: 64px;
      height: 64px;
      margin-top: 8px;
    }

    /* ── Glass Sphere Button ── */
    .ora-w-glass-sphere {
      cursor: pointer;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 1.5px solid rgba(200, 150, 255, 0.4);
      background: radial-gradient(
        circle at 30% 30%,
        rgba(255, 255, 255, 0.45) 0%,
        rgba(150, 100, 255, 0.25) 40%,
        rgba(10, 10, 15, 0.95) 100%
      );
      box-shadow:
        inset -6px -6px 20px rgba(150, 100, 255, 0.5),
        inset 6px 6px 14px rgba(255, 255, 255, 0.35),
        0 0 25px rgba(150, 100, 255, 0.35),
        0 4px 16px rgba(0, 0, 0, 0.4);
      outline: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease;
      animation: ora-w-bob 4s ease-in-out infinite, ora-w-glow-pulse 3s ease-in-out infinite;
    }
    .ora-w-glass-sphere:hover {
      transform: scale(1.08);
      border-color: rgba(200, 240, 49, 0.7);
    }
    .ora-w-glass-sphere:active { transform: scale(0.94); }
    .ora-w-glass-sphere.speaking {
      animation: ora-w-speaking-pulse 0.8s ease-in-out infinite !important;
      border-color: #C8F031;
    }

    /* ── Center Icon / Waves ── */
    .ora-w-icon-svg {
      width: 28px;
      height: 28px;
      color: #EAE6FF;
      filter: drop-shadow(0 0 6px rgba(200, 240, 49, 0.8));
      transition: transform 0.2s ease;
    }
    .ora-w-glass-sphere.speaking .ora-w-icon-svg {
      color: #C8F031;
      transform: scale(1.15);
    }

    /* ── Status Pill Badge ── */
    .ora-w-status-chip {
      pointer-events: auto;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: #F3F4F6;
      background: rgba(18, 24, 38, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      transition: all 0.2s ease;
      margin-bottom: 6px;
    }
    .ora-w-status-chip:hover {
      background: rgba(26, 34, 52, 0.95);
      border-color: rgba(200, 240, 49, 0.4);
    }
    .ora-w-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #9CA3AF;
    }
    .ora-w-status-dot.active { background: #C8F031; box-shadow: 0 0 8px #C8F031; }
    .ora-w-status-dot.connecting { background: #38BDF8; animation: ora-w-spin 1s linear infinite; }
    .ora-w-status-dot.speaking { background: #C8F031; box-shadow: 0 0 10px #C8F031; }
    .ora-w-status-dot.error { background: #EF4444; }

    /* ── Transcript Bubble ── */
    .ora-w-transcript {
      pointer-events: auto;
      max-width: 320px;
      min-width: 200px;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.45;
      color: #F8FAFC;
      background: rgba(13, 19, 33, 0.94);
      border: 1px solid rgba(200, 150, 255, 0.25);
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      margin-bottom: 8px;
      animation: ora-w-pop-in 0.25s ease forwards;
    }
    .ora-w-transcript.user-turn {
      border-color: rgba(56, 189, 248, 0.4);
      background: rgba(15, 23, 42, 0.94);
    }
    .ora-w-transcript.agent-turn {
      border-color: rgba(200, 240, 49, 0.4);
    }

    /* ── Action Controls Bar ── */
    .ora-w-controls {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
    }
    .ora-w-ctrl-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(18, 24, 38, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94A3B8;
      transition: all 0.15s ease;
    }
    .ora-w-ctrl-btn:hover {
      color: #FFF;
      background: rgba(30, 41, 59, 1);
      border-color: rgba(200, 240, 49, 0.5);
    }
    .ora-w-ctrl-btn.muted {
      color: #EF4444;
      border-color: #EF4444;
      background: rgba(239, 68, 68, 0.15);
    }

    /* ── Audio Waveform Visualizer Bar ── */
    .ora-w-audio-wave {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 14px;
      padding: 0 4px;
    }
    .ora-w-wave-bar {
      width: 2.5px;
      height: 4px;
      background: #C8F031;
      border-radius: 2px;
      transition: height 0.08s ease;
    }
  `;
  document.head.appendChild(styleEl);

  // ─── Build DOM ─────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'ora-w-root pos-' + position;

  root.innerHTML = `
    <div id="oraWTranscript" class="ora-w-transcript" style="display:none;">
      <div id="oraWTranscriptText"></div>
    </div>

    <div id="oraWStatusChip" class="ora-w-status-chip">
      <span id="oraWDot" class="ora-w-status-dot"></span>
      <span id="oraWStatusLabel">Ask ORA AI</span>
      <div id="oraWWaveVisualizer" class="ora-w-audio-wave" style="display:none;">
        <span class="ora-w-wave-bar" style="height:4px"></span>
        <span class="ora-w-wave-bar" style="height:8px"></span>
        <span class="ora-w-wave-bar" style="height:12px"></span>
        <span class="ora-w-wave-bar" style="height:8px"></span>
        <span class="ora-w-wave-bar" style="height:4px"></span>
      </div>
    </div>

    <div class="ora-w-container">
      <button id="oraWOrbBtn" class="ora-w-glass-sphere" type="button" aria-label="Talk with ORA Voice AI">
        <svg class="ora-w-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
        </svg>
      </button>
    </div>

    <div id="oraWControls" class="ora-w-controls" style="display:none;">
      <button id="oraWMuteBtn" class="ora-w-ctrl-btn" title="Mute Microphone">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      <button id="oraWCloseBtn" class="ora-w-ctrl-btn" title="End Voice Conversation">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(root);

  // Element refs
  const orbBtn = document.getElementById('oraWOrbBtn');
  const statusChip = document.getElementById('oraWStatusChip');
  const statusDot = document.getElementById('oraWDot');
  const statusLabel = document.getElementById('oraWStatusLabel');
  const waveVisualizer = document.getElementById('oraWWaveVisualizer');
  const transcriptBox = document.getElementById('oraWTranscript');
  const transcriptText = document.getElementById('oraWTranscriptText');
  const controlsBar = document.getElementById('oraWControls');
  const muteBtn = document.getElementById('oraWMuteBtn');
  const closeBtn = document.getElementById('oraWCloseBtn');

  // ─── Render UI ─────────────────────────────────────────────────────────────
  function render() {
    const isActive = voiceState === 'active' || voiceState === 'ora-speaking';
    const isConnecting = voiceState === 'connecting';
    const isSpeaking = voiceState === 'ora-speaking';

    orbBtn.className = 'ora-w-glass-sphere' + (isSpeaking ? ' speaking' : '');
    controlsBar.style.display = isActive ? 'flex' : 'none';

    // Status chip
    if (voiceState === 'connecting') {
      statusDot.className = 'ora-w-status-dot connecting';
      statusLabel.innerText = 'Connecting to ORA…';
      waveVisualizer.style.display = 'none';
    } else if (isSpeaking) {
      statusDot.className = 'ora-w-status-dot speaking';
      statusLabel.innerText = 'ORA is speaking…';
      waveVisualizer.style.display = 'flex';
    } else if (isActive && !isMuted) {
      statusDot.className = 'ora-w-status-dot active';
      statusLabel.innerText = 'Listening… Speak now';
      waveVisualizer.style.display = 'flex';
    } else if (isActive && isMuted) {
      statusDot.className = 'ora-w-status-dot';
      statusLabel.innerText = 'Muted';
      waveVisualizer.style.display = 'none';
    } else if (voiceState === 'error') {
      statusDot.className = 'ora-w-status-dot error';
      statusLabel.innerText = errorMsg ? errorMsg.slice(0, 28) : 'Click to retry';
      waveVisualizer.style.display = 'none';
    } else {
      statusDot.className = 'ora-w-status-dot';
      statusLabel.innerText = 'Ask ORA AI';
      waveVisualizer.style.display = 'none';
    }

    // Audio Visualizer waveform bars animation
    if (waveVisualizer.style.display === 'flex') {
      const bars = waveVisualizer.querySelectorAll('.ora-w-wave-bar');
      const level = isSpeaking ? speakingLevel : userMicLevel;
      bars.forEach((bar, idx) => {
        const h = Math.max(3, Math.min(14, Math.floor((level / 100) * 14 * (0.6 + idx * 0.2))));
        bar.style.height = h + 'px';
      });
    }

    // Transcript Box
    if (showTranscript && liveUtterance) {
      transcriptBox.style.display = 'block';
      transcriptBox.className = 'ora-w-transcript ' + (liveSpeaker === 'user' ? 'user-turn' : 'agent-turn');
      transcriptText.innerHTML = (liveSpeaker === 'user' ? '<strong>You:</strong> ' : '<strong>ORA:</strong> ') + escapeHtml(liveUtterance);
    } else {
      transcriptBox.style.display = 'none';
    }

    // Mute button icon
    muteBtn.className = 'ora-w-ctrl-btn' + (isMuted ? ' muted' : '');
    muteBtn.innerHTML = isMuted
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  }

  // ─── Visualizer Loop ────────────────────────────────────────────────────────
  function startVisualizer() {
    if (animFrameId) return;
    function loop() {
      render();
      animFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stopVisualizer() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // ─── Instant Barge-in / Audio Playback Cutoff ───────────────────────────────
  function flushPlaybackQueue() {
    for (let i = 0; i < activeSources.length; i++) {
      try {
        activeSources[i].stop();
        activeSources[i].disconnect();
      } catch (e) {}
    }
    activeSources = [];
    if (playbackContext) {
      audioQueueTime = playbackContext.currentTime;
    }
    speakingLevel = 0;
    if (voiceState === 'ora-speaking') {
      voiceState = 'active';
    }
  }

  // ─── Audio Playback (24 kHz PCM) ────────────────────────────────────────────
  function playIncomingPcm(base64Pcm) {
    try {
      if (!playbackContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        playbackContext = new AudioCtx({ sampleRate: 24000 });
      }
      const ctx = playbackContext;
      if (ctx.state === 'suspended') ctx.resume();

      const float32 = base64ToFloat32Array(base64Pcm);
      if (float32.length === 0) return;

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (audioQueueTime < now) audioQueueTime = now;
      source.start(audioQueueTime);
      audioQueueTime += buffer.duration;

      activeSources.push(source);
      voiceState = 'ora-speaking';

      // Calculate audio energy level for visualizer
      let sum = 0;
      const step = Math.max(1, Math.floor(float32.length / 32));
      for (let i = 0; i < float32.length; i += step) sum += float32[i] * float32[i];
      speakingLevel = Math.min(100, Math.floor(Math.sqrt(sum / (float32.length / step)) * 400));

      source.onended = function () {
        activeSources = activeSources.filter((s) => s !== source);
        if (activeSources.length === 0 && ctx.currentTime >= audioQueueTime - 0.05) {
          voiceState = 'active';
          speakingLevel = 0;
        }
      };
    } catch (e) {
      console.error('[ORA Widget] Audio playback error:', e);
    }
  }

  // ─── Teardown / End Session ─────────────────────────────────────────────────
  function teardown() {
    flushPlaybackQueue();
    voiceState = 'idle';
    isMuted = false;
    liveUtterance = '';
    liveSpeaker = null;
    showTranscript = false;
    lastSpeaker = null;
    userMicLevel = 0;
    speakingLevel = 0;
    audioQueueTime = 0;
    stopVisualizer();

    if (processorNode) { try { processorNode.disconnect(); } catch (e) {} processorNode = null; }
    if (muteGainNode) { try { muteGainNode.disconnect(); } catch (e) {} muteGainNode = null; }
    if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
    if (audioContext) { try { audioContext.close(); } catch (e) {} audioContext = null; }
    if (playbackContext) { try { playbackContext.close(); } catch (e) {} playbackContext = null; }
    if (recognition) {
      try { recognition.onend = null; recognition.abort(); } catch (e) {}
      recognition = null;
    }
    if (geminiWs) {
      try { geminiWs.close(); } catch (e) {}
      geminiWs = null;
    }
    render();
  }

  // ─── SpeechRecognition (Instant Local User Transcript) ──────────────────────
  function startSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    try {
      if (recognition) { try { recognition.onend = null; recognition.abort(); } catch (e) {} }
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = navigator.language || 'en-US';

      rec.onresult = function (event) {
        if (voiceState === 'idle' || isMuted) return;
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0] && res[0].transcript) {
            if (res.isFinal) finalTranscript += res[0].transcript;
            else interimTranscript += res[0].transcript;
          }
        }
        const cleanText = (finalTranscript + ' ' + interimTranscript).trim();
        if (cleanText) {
          // If user starts speaking while ORA is talking, flush audio instantly
          if (voiceState === 'ora-speaking') {
            flushPlaybackQueue();
          }
          lastSpeaker = 'user';
          liveSpeaker = 'user';
          liveUtterance = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
          showTranscript = true;
        }
      };

      rec.onend = function () {
        if ((voiceState === 'active' || voiceState === 'ora-speaking') && !isMuted && recognition) {
          try { recognition.start(); } catch (e) {}
        }
      };

      rec.start();
      recognition = rec;
    } catch (e) {
      console.debug('[ORA Widget] SpeechRecognition:', e);
    }
  }

  // ─── Microphone Capture (16 kHz PCM) ────────────────────────────────────────
  async function startMicCapture() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) audioContext = new AudioCtx({ sampleRate: 16000 });
    if (audioContext.state === 'suspended') await audioContext.resume();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStream = stream;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(1024, 1, 1);
    processorNode = processor;

    const muteNode = audioContext.createGain();
    muteNode.gain.value = 0;
    muteGainNode = muteNode;

    source.connect(processor);
    processor.connect(muteNode);
    muteNode.connect(audioContext.destination);

    processor.onaudioprocess = function (e) {
      if (voiceState === 'idle' || !geminiWs || geminiWs.readyState !== WebSocket.OPEN || isMuted) return;

      const rawInput = e.inputBuffer.getChannelData(0);
      const inputData = downsampleTo16k(rawInput, audioContext.sampleRate);

      // Mic volume level calculation
      let sum = 0;
      for (let i = 0; i < rawInput.length; i++) sum += rawInput[i] * rawInput[i];
      const rms = Math.sqrt(sum / rawInput.length);
      userMicLevel = Math.min(100, Math.floor(rms * 400));

      // If user speaks loud enough during ORA speech, cut ORA audio
      if (rms > 0.04 && voiceState === 'ora-speaking') {
        flushPlaybackQueue();
      }

      // Stream PCM chunk to ORA Proxy
      const pcm16 = floatTo16BitPCM(inputData);
      const b64 = arrayBufferToBase64(pcm16.buffer);
      geminiWs.send(JSON.stringify({ type: 'audio', data: b64 }));
    };

    startSpeechRecognition();
  }

  // ─── Start Voice Session (Instant Parallel Connection) ───────────────────────
  async function startVoiceSession() {
    // 1. Prime AudioContext in direct user click gesture
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) audioContext = new AudioCtx({ sampleRate: 16000 });
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      if (!playbackContext) playbackContext = new AudioCtx({ sampleRate: 24000 });
      if (playbackContext.state === 'suspended') playbackContext.resume().catch(() => {});
    } catch (e) {}

    voiceState = 'connecting';
    errorMsg = '';
    liveUtterance = '';
    liveSpeaker = null;
    lastSpeaker = null;
    showTranscript = false;
    isMuted = false;
    startVisualizer();

    // 2. Start Microphone capture in parallel immediately
    const micPromise = startMicCapture().catch((err) => {
      console.warn('[ORA Widget] Mic permission error:', err);
      errorMsg = 'Mic permission required';
      voiceState = 'error';
      teardown();
      throw err;
    });

    try {
      // 3. Connect directly via WebSocket to ORA Proxy (Ultra-Fast 0ms handshake)
      sessionId = 'ses_w_' + Math.random().toString(36).substring(2, 9);
      const wsBase = apiBase.replace(/^http/, 'ws');
      const wsUri = wsBase + '/ws/voice' +
        '?publishableKey=' + encodeURIComponent(publishableKey) +
        '&sessionId=' + encodeURIComponent(sessionId);

      const ws = new WebSocket(wsUri);
      geminiWs = ws;

      ws.onopen = function () {
        console.log('[ORA Widget] ⚡ Connected to ORA Voice Proxy. Live streaming...');
      };

      ws.onmessage = async function (event) {
        try {
          const msgData = typeof event.data === 'string' ? event.data : await (event.data).text();
          const msg = JSON.parse(msgData);

          if (msg.type === 'setup_complete') {
            voiceState = 'active';
            audioQueueTime = 0;
            return;
          }

          if (msg.type === 'audio' && msg.data) {
            if (lastSpeaker === 'user' && recognition) {
              try { recognition.abort(); } catch (e) {}
            }
            lastSpeaker = 'agent';
            liveSpeaker = 'agent';
            showTranscript = true;
            playIncomingPcm(msg.data);
            return;
          }

          if (msg.type === 'text' && msg.text) {
            const cleanText = msg.text.trim();
            if (cleanText && !cleanText.startsWith('**') && !cleanText.startsWith('#')) {
              if (lastSpeaker !== 'agent') {
                lastSpeaker = 'agent';
                liveSpeaker = 'agent';
                liveUtterance = cleanText;
              } else {
                liveUtterance = mergeStreamingText(liveUtterance, cleanText);
              }
              showTranscript = true;
            }
            return;
          }

          if (msg.type === 'interrupted') {
            flushPlaybackQueue();
            lastSpeaker = 'user';
            liveSpeaker = 'user';
            liveUtterance = '';
            if (recognition) { try { recognition.abort(); } catch (e) {} }
            return;
          }

          if (msg.type === 'turn_complete') {
            if (activeSources.length === 0) {
              voiceState = 'active';
            }
            return;
          }

          if (msg.type === 'error') {
            errorMsg = msg.message || 'Voice error. Please retry.';
            voiceState = 'error';
            teardown();
            return;
          }

          if (msg.type === 'session_closed') {
            if (voiceState !== 'idle') teardown();
            return;
          }
        } catch (err) {
          console.error('[ORA Widget] Message error:', err);
        }
      };

      ws.onerror = function (err) {
        console.error('[ORA Widget] WebSocket error:', err);
        errorMsg = 'Connection error';
        voiceState = 'error';
        teardown();
      };

      ws.onclose = function () {
        if (voiceState !== 'idle') teardown();
      };

      await micPromise;
    } catch (err) {
      console.error('[ORA Widget] Start failed:', err);
    }
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────
  orbBtn.addEventListener('click', function () {
    if (voiceState === 'idle' || voiceState === 'error') {
      startVoiceSession();
    } else {
      teardown();
    }
  });

  statusChip.addEventListener('click', function () {
    if (voiceState === 'idle' || voiceState === 'error') {
      startVoiceSession();
    } else {
      teardown();
    }
  });

  muteBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    isMuted = !isMuted;
    if (isMuted && recognition) {
      try { recognition.abort(); } catch (e) {}
    } else if (!isMuted && recognition) {
      try { recognition.start(); } catch (e) {}
    }
    render();
  });

  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    teardown();
  });
})();
