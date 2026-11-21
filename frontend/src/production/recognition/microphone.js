import workletUrl from "./pcm-worklet.js?url&no-inline";

const sampleRate = 16_000;

// A capture object owns exactly one MediaStream, audio graph, and permission
// attempt. Stop invalidates the attempt even if getUserMedia is still pending.
class MicrophoneCapture {
  #stream;
  #context;
  #node;
  #source;
  #ticket = 0;

  constructor(callbacks, browser) {
    this.callbacks = callbacks;
    this.browser = browser;
  }

  async start() {
    const ticket = ++this.#ticket;
    const browser = this.browser;
    const stream = await this.#acquire(browser);
    if (ticket !== this.#ticket) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    this.#stream = stream;
    try {
      let context;
      try { context = new browser.AudioContext({ sampleRate }); }
      catch { context = new browser.AudioContext(); }
      this.#context = context;
      console.info(`[quran-engine] microphone at ${context.sampleRate} Hz` +
        (context.sampleRate === sampleRate ? "" : ` → resampling to ${sampleRate}`));
      if (context.state === "suspended") await context.resume();
      if (ticket !== this.#ticket) return;
      await context.audioWorklet.addModule(workletUrl);
      if (ticket !== this.#ticket) return;
      this.#connect(context, stream, ticket);
    } catch (error) {
      if (ticket !== this.#ticket) return;
      await this.stop();
      throw error;
    }
  }

  #acquire(browser) {
    return browser.navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate },
    });
  }

  #delivery(ticket) {
    let live = false;
    return ({ data }) => {
      if (ticket !== this.#ticket) return;
      if (!live) {
        live = true;
        this.callbacks.onLive?.();
      }
      if (ticket === this.#ticket) this.callbacks.onChunk(data.samples);
    };
  }

  #connect(context, stream, ticket) {
      const node = new this.browser.AudioWorkletNode(context, "pcm-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        processorOptions: { chunkSamples: this.callbacks.chunkSamples ?? 7680 },
      });
      this.#node = node;
      node.port.onmessage = this.#delivery(ticket);
      this.#source = context.createMediaStreamSource(stream);
      this.#source.connect(node);
      node.connect(context.destination);
  }

  async stop() {
    ++this.#ticket;
    const context = this.#context;
    this.#context = undefined;
    this.#source?.disconnect();
    if (this.#node) {
      this.#node.port.onmessage = null;
      this.#node.port.close();
      this.#node.disconnect();
    }
    this.#source = this.#node = undefined;
    this.#stream?.getTracks().forEach(track => track.stop());
    this.#stream = undefined;
    if (context) await context.close().catch(() => {});
  }
}

export const captureMicrophone = (callbacks, browser = window) => new MicrophoneCapture(callbacks, browser);
