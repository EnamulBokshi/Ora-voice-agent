/**
 * AudioWorkletProcessor for high-performance, low-latency PCM audio recording.
 * Runs on a dedicated audio rendering thread to prevent audio dropouts and latency.
 */
class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // ~128ms chunks at 16kHz for responsive streaming
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const inputChannel = input[0];
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bytesWritten++] = inputChannel[i];

      if (this.bytesWritten >= this.bufferSize) {
        this.flush();
      }
    }

    return true;
  }

  flush() {
    if (this.bytesWritten === 0) return;

    // Convert Float32 (-1.0 to 1.0) to 16-bit signed integer Linear PCM (little-endian)
    const int16Array = new Int16Array(this.bytesWritten);
    for (let i = 0; i < this.bytesWritten; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage({
      pcm16Data: int16Array.buffer,
    }, [int16Array.buffer]);

    this.bytesWritten = 0;
  }
}

registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
