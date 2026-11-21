const TARGET_SAMPLE_RATE = 16_000;
class LowPassFilter {
  constructor(rate) {
    // Windowed-sinc low-pass for the resampling case (cutoff 7.2 kHz at 16 kHz).
      const taps = 31;
      const fc = 7200 / rate;
      const h = new Float32Array(taps);
      let sum = 0;
      for (let i = 0; i < taps; i++) {
        const n = i - (taps - 1) / 2;
        const sinc = n === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * n) / (Math.PI * n);
        const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (taps - 1));
        h[i] = sinc * w;
        sum += h[i];
      }
      for (let i = 0; i < taps; i++) h[i] /= sum;
      this.h = h;
      this.hist = new Float32Array(taps - 1);
  }
  process(ch) {
    const taps = this.h.length;
    const ext = new Float32Array(this.hist.length + ch.length);
    ext.set(this.hist, 0);
    ext.set(ch, this.hist.length);
    const filtered = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) {
      let acc = 0;
      for (let k = 0; k < taps; k++) acc += this.h[k] * ext[i + k];
      filtered[i] = acc;
    }
    this.hist.set(ext.subarray(ext.length - this.hist.length));
    return filtered;
  }
}

class Resampler {
  constructor(ratio) {
    this.ratio = ratio;
    this.tail = 0;
    this.phase = 0;
  }
  process(filtered, emit) {
    while (this.phase < filtered.length - 1) {
      const i = Math.floor(this.phase);
      const f = this.phase - i;
      // After the previous block, phase can carry as low as -1, so the first
      // output of this block may sit between that block's last sample and this
      // block's first. Reading filtered[-1] would be undefined -> NaN, and NaN
      // features decode as silence with no error anywhere.
      const a = i < 0 ? this.tail : filtered[i];
      emit(a * (1 - f) + filtered[i + 1] * f);
      this.phase += this.ratio;
    }
    this.tail = filtered[filtered.length - 1];
    this.phase -= filtered.length;
  }
}

class ChunkAccumulator {
  constructor(size, transfer) {
    this.size = size;
    this.transfer = transfer;
    this.buffer = new Float32Array(size);
    this.fill = 0;
  }
  push(sample) {
    const samples = this.buffer;
    samples[this.fill++] = sample;
    if (this.fill !== this.size) return;
    let energy = 0;
    for (let i = 0; i < this.size; i++) energy += samples[i] * samples[i];
    this.transfer(samples, Math.sqrt(energy / this.size));
    this.buffer = new Float32Array(this.size);
    this.fill = 0;
  }
}

class PcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const ratio = sampleRate / TARGET_SAMPLE_RATE;
    this.filter = ratio === 1 ? null : new LowPassFilter(sampleRate);
    this.resampler = this.filter && new Resampler(ratio);
    this.chunk = new ChunkAccumulator(options.processorOptions?.chunkSamples || 7680, (samples, rms) => {
      this.port.postMessage({ samples, rms }, [samples.buffer]);
    });
    this.emit = sample => this.chunk.push(sample);
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel?.length) return true;
    if (this.filter) this.resampler.process(this.filter.process(channel), this.emit);
    else for (let i = 0; i < channel.length; i++) this.emit(channel[i]);
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
