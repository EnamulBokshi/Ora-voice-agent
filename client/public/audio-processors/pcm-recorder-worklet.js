/**
 * AudioWorkletProcessor for low-latency PCM capture.
 *
 * Runs on the dedicated audio rendering thread so capture never competes with the
 * page's main thread (animations, DOM work), which the previous ScriptProcessor
 * implementation did.
 *
 * Emits 2048-sample chunks of 16 kHz signed 16-bit little-endian PCM — ~128ms per
 * message — plus the RMS of that chunk so the main thread can run its noise gate and
 * level meter without re-scanning the samples.
 */
class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    /** Gemini Live expects 16 kHz mono PCM16. */
    this.targetRate = 16000;

    /**
     * ~64ms of output audio per message at the target rate.
     *
     * 2048 (128ms) halved WebSocket message overhead but added that much buffering
     * ahead of every utterance, which is felt directly as response delay.
     */
    this.bufferSize = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;

    /**
     * Fractional resampler position, carried across process() blocks.
     *
     * `new AudioContext({ sampleRate: 16000 })` is only a request — browsers are free
     * to return the hardware rate instead, and several do. Without resampling here we
     * would ship 44.1/48 kHz audio labelled as 16 kHz, so Gemini would hear everything
     * stretched ~3x and pitched down: speech becomes unintelligible and steady room
     * noise reads as speech-like energy to its voice detector.
     *
     * Tracking the position as a fraction (rather than resetting per block) keeps the
     * output from drifting when the block size is not a multiple of the ratio.
     */
    this.phase = 0;

    /**
     * Running box-filter accumulator for downsampling.
     *
     * Picking every Nth sample (plain decimation) folds everything above 8 kHz back
     * down into the speech band as aliasing noise — audible hiss that also pushes the
     * RMS gate open. Averaging the input samples that map to each output sample is a
     * crude low-pass, but it removes most of that and costs two adds per sample.
     */
    this.acc = 0;
    this.accCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const channel = input[0];

    // `sampleRate` is a global in AudioWorkletGlobalScope: the context's real rate.
    const ratio = sampleRate / this.targetRate;

    if (ratio <= 1.0001) {
      // Already at (or below) the target rate — pass through untouched.
      for (let i = 0; i < channel.length; i++) {
        this.push(channel[i]);
      }
    } else {
      // Downsample: emit the mean of the input samples covering each output sample.
      const step = 1 / ratio;
      for (let i = 0; i < channel.length; i++) {
        this.acc += channel[i];
        this.accCount++;
        this.phase += step;
        while (this.phase >= 1) {
          this.phase -= 1;
          this.push(this.accCount > 0 ? this.acc / this.accCount : 0);
          this.acc = 0;
          this.accCount = 0;
        }
      }
    }

    return true;
  }

  push(sample) {
    this.buffer[this.bytesWritten++] = sample;
    if (this.bytesWritten >= this.bufferSize) {
      this.flush();
    }
  }

  flush() {
    if (this.bytesWritten === 0) return;

    const count = this.bytesWritten;

    // Convert Float32 (-1.0 to 1.0) to 16-bit signed PCM, accumulating signal energy
    // in the same pass. RMS is measured on the resampled data so it stays comparable
    // to the main thread's speech threshold regardless of the hardware rate.
    const int16Array = new Int16Array(count);
    let sumSquares = 0;
    for (let i = 0; i < count; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      sumSquares += s * s;
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage(
      {
        pcm16Data: int16Array.buffer,
        rms: Math.sqrt(sumSquares / count),
      },
      [int16Array.buffer],
    );

    this.bytesWritten = 0;
  }
}

registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
