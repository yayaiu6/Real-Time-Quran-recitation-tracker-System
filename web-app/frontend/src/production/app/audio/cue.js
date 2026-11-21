// Application cue playback. The shared audio-context port is separate from
// microphone capture and never changes recognition/SDK audio settings.
export class AudioCue {
  static INTERVAL_MS = 1500;
  constructor({ url, audio, fetch, now, warn }) {
    this.url = url;
    this.audio = audio;
    this.fetch = fetch;
    this.now = now;
    this.warn = warn;
    this.buffer = null;
    this.loading = null;
    this.lastPlayed = 0;
  }
  arm() {
    if (this.loading) return;
    this.audio.ensure();
    const context = this.audio.context();
    if (!context) return;
    this.loading = (async () => {
      try {
        const response = await this.fetch(this.url);
        this.buffer = await context.decodeAudioData(await response.arrayBuffer());
      } catch (error) {
        this.buffer = null;
        this.warn(this.url, error);
      }
    })();
  }
  play() {
    const context = this.audio.context(), buffer = this.buffer;
    if (!context || !buffer || !this.audio.ready()) return false;
    const now = this.now();
    const Cue = /** @type {typeof AudioCue} */ (this.constructor);
    if (now - this.lastPlayed < Cue.INTERVAL_MS) return false;
    this.lastPlayed = now;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
    return true;
  }
  get durationMs() { return this.buffer ? this.buffer.duration * 1000 : 0; }
}

// Accepts a cue URL and supplies the shared audio dependencies.
export function createCueConstructor(dependencies) {
  return class extends AudioCue {
    constructor(url) { super({ ...dependencies, url }); }
  };
}
