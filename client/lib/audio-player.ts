'use client';

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentAudioElement: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass({ sampleRate: 24000 });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopCurrentAudio() {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {}
    currentSourceNode = null;
  }
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.src = '';
    } catch {}
    currentAudioElement = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Plays base64 audio returned by Google Gemini Live / REST API.
 * Supports both WAV/MP3 blobs and raw 24kHz/16kHz PCM streams.
 */
export async function playGeminiAudioBase64(
  base64Data: string,
  mimeType: string = 'audio/pcm;rate=24000',
  onEnded?: () => void,
): Promise<void> {
  stopCurrentAudio();

  // If MIME is a standard container like audio/wav, audio/mp3, audio/ogg
  if (
    mimeType.includes('wav') ||
    mimeType.includes('mp3') ||
    mimeType.includes('ogg') ||
    mimeType.includes('webm')
  ) {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const audio = new Audio(blobUrl);
      currentAudioElement = audio;

      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        currentAudioElement = null;
        if (onEnded) onEnded();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        currentAudioElement = null;
        if (onEnded) onEnded();
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn('[AudioPlayer] Standard container playback failed, attempting PCM decoder:', err);
    }
  }

  // Handle raw PCM (Gemini Live outputs 24000Hz 16-bit linear PCM little-endian)
  try {
    const ctx = getAudioContext();
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;

    const buffer = new ArrayBuffer(len);
    const view = new DataView(buffer);
    for (let i = 0; i < len; i++) {
      view.setUint8(i, binaryStr.charCodeAt(i));
    }

    const sampleCount = Math.floor(len / 2);
    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      // 16-bit PCM little-endian conversion to float [-1.0, 1.0]
      float32[i] = view.getInt16(i * 2, true) / 32768.0;
    }

    // Determine sample rate from MIME or default to 24kHz for Gemini Live
    let sampleRate = 24000;
    if (mimeType.includes('rate=16000') || mimeType.includes('16k')) {
      sampleRate = 16000;
    } else if (mimeType.includes('rate=48000')) {
      sampleRate = 48000;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    currentSourceNode = source;

    source.onended = () => {
      if (currentSourceNode === source) {
        currentSourceNode = null;
      }
      if (onEnded) onEnded();
    };

    source.start(0);
  } catch (err) {
    console.error('[AudioPlayer] PCM audio decoding failed:', err);
    if (onEnded) onEnded();
    throw err;
  }
}
