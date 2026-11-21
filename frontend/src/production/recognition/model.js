import { MODEL_TOKENS } from "./model-vocabulary.js";
import { MODEL_HEADS, TOKEN_COUNT, EvidenceDecoder } from "./frame-chunk.js";

function sdkError(error) {
  const message = [error?.message, error?.fix].filter(value => typeof value === "string" && value).join(" — ");
  return Object.assign(new Error(message || String(error)), { code: typeof error?.code === "string" ? error.code : null });
}

function checkVocabulary({ tokens }) {
  if (tokens.count !== TOKEN_COUNT || tokens.blank !== 0 || tokens.wordBar !== 1) {
    throw new Error(`the model's vocabulary is not the V4 alphabet: ${tokens.count} tokens, blank ${tokens.blank}, word bar ${tokens.wordBar}`);
  }
  for (let index = 0; index < TOKEN_COUNT; index++) {
    const name = tokens.name(index);
    if (name !== MODEL_TOKENS[index]) {
      throw new Error(`the model's token ${index} is "${name}", this engine expects "${MODEL_TOKENS[index]}" — the alphabet and the model have drifted`);
    }
  }
}

class ModelProvider {
  #client;
  #model;
  #closed = false;
  #disposal;

  constructor(options, createClient) {
    this.options = options;
    this.context = options.context ?? "c24_l256";
    this.createClient = createClient;
  }

  async init() {
    const { key, appVersion, analytics = "on", onProgress } = this.options;
    if (!key) throw new Error("no Quran Lab browser key was provided by /api/config");
    try {
      this.#assertOpen();
      const client = await this.createClient({ key, appVersion, analytics });
      if (this.#closed) {
        await this.#closeResource(client);
        this.#assertOpen();
      }
      this.#client = client;
      let seenDownload = false;
      await client.prefetch({
        onProgress: onProgress && (({ bytesDone, bytesTotal }) => {
          if (this.#closed) return;
          if (!seenDownload && bytesDone >= bytesTotal) return;
          seenDownload = true;
          onProgress(bytesDone, bytesTotal);
        }),
      });
      this.#assertOpen();
      const model = await client.model();
      if (this.#closed) {
        await this.#closeResource(model);
        this.#assertOpen();
      }
      this.#model = model;
      checkVocabulary(model);
      if (!model.contexts.includes(this.context)) throw new Error(`the model has no ${this.context} context (it has ${model.contexts.join(", ")})`);
    } catch (error) {
      await this.close();
      throw error?.name === "AbortError" ? error : sdkError(error);
    }
  }

  #assertOpen() {
    if (this.#closed) throw new DOMException("Recognition preparation was cancelled.", "AbortError");
  }

  async #closeResource(resource) {
    try { await resource?.close(); } catch {}
  }

  get model() { return this.#model; }

  get modelInfo() {
    if (!this.#model) return null;
    const { version, build } = this.#model;
    return { version, build, context: this.context };
  }

  close(afterDrain = Promise.resolve()) {
    if (this.#disposal) return this.#disposal;
    this.#closed = true;
    const model = this.#model, client = this.#client;
    this.#model = this.#client = undefined;
    return (this.#disposal = afterDrain.then(async () => {
      await this.#closeResource(model);
      await this.#closeResource(client);
    }));
  }
}

class RecognitionDelivery {
  constructor(options, now) {
    this.options = options;
    this.now = now;
    this.decoder = new EvidenceDecoder();
  }

  deliver(chunk, take, isCurrent) {
    if (!isCurrent()) return;
    let frames;
    try { frames = this.decoder.decode(chunk); }
    catch (error) { this.error(error); return; }
    if (!frames) return;
    const { primary, intermediate, count, speech, detail } = frames;
    // Time since the most recent submission is a diagnostic only. The SDK
    // may emit zero or multiple chunks per push; this is not frame timing.
    const elapsed = take.lastPush === undefined ? 0 : this.now() - take.lastPush;
    this.options.onFrames(primary, intermediate, count, speech, elapsed, detail);
  }

  error(error, ignore) {
    const { message, code } = sdkError(error);
    if (code !== ignore) this.options.onError?.(message, code);
  }
}

class TakeController {
  #take;
  #closing;
  #closed = false;

  constructor(provider, delivery, now) {
    this.provider = provider;
    this.delivery = delivery;
    this.now = now;
  }

  push(samples) {
    const model = this.provider.model;
    if (this.#closed || !model || this.#closing) return;
    const take = this.#take ?? this.#open(model);
    if (!take) return;
    try {
      take.lastPush = this.now();
      take.session.push(samples);
    } catch (error) {
      this.#take = undefined;
      if (!this.#closed) this.delivery.error(error, "session_closed");
    }
  }

  #open(model) {
    try {
      const session = model.session({ context: this.provider.context, sampleRate: 16_000, heads: [...MODEL_HEADS] });
      const take = this.#take = { session };
      void this.#read(take);
      return take;
    } catch (error) {
      if (!this.#closed) this.delivery.error(error, "session_open");
      return null;
    }
  }

  async #read(take) {
    const isCurrent = () => this.#take === take && !this.#closed;
    try {
      for await (const chunk of take.session.chunks) {
        this.delivery.deliver(chunk, take, isCurrent);
      }
    } catch (error) {
      if (isCurrent()) this.delivery.error(error);
    } finally {
      if (this.#take === take) this.#take = undefined;
    }
  }

  endTake() {
    if (this.#closing) return this.#closing;
    const take = this.#take;
    this.#take = undefined;
    if (!take) return Promise.resolve();
    const closing = Promise.resolve().then(() => take.session.finish()).catch(() => {}).finally(() => {
      if (this.#closing === closing) this.#closing = undefined;
    });
    return (this.#closing = closing);
  }

  close() {
    this.#closed = true;
    return this.endTake();
  }
}

export class TajweedRecognition {
  constructor(options, { createClient, now = () => performance.now() }) {
    this.provider = new ModelProvider(options, createClient);
    this.takes = new TakeController(this.provider, new RecognitionDelivery(options, now), now);
  }
  init() { return this.provider.init(); }
  get modelInfo() { return this.provider.modelInfo; }
  pushAudio(samples) { this.takes.push(samples); }
  endTake() { return this.takes.endTake(); }
  close() { return this.provider.close(this.takes.close()); }
}
