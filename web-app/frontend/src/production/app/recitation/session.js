const emptyTake = () => ({ place: null, cursor: -1, awaited: -1, verdicts: new Map() });

export class RecitationSession {
  #host;
  #attempt;
  #views = new Set();
  #state = emptyTake();
  #abort = new AbortController();
  #begun = false;
  #cueTimer;
  #resolveCorpus;
  #corpus;

  constructor({ view, prepare, startCue, endCue, clock, report }) {
    Object.assign(this, { view, startCue, endCue, clock, report });
    this.corpus = new Promise(resolve => { this.#resolveCorpus = resolve; });
    this.ready = prepare({
      host: this.#hostView(),
      corpus: corpus => {
        this.#corpus = corpus;
        this.#resolveCorpus(corpus);
      },
      progress: fraction => { if (!this.#abort.signal.aborted) view.progress?.(fraction); },
      modelReady: metadata => { if (!this.#abort.signal.aborted) view.modelReady?.(metadata); },
      modelFailed: () => { if (!this.#abort.signal.aborted) view.modelFailed?.(); },
      engineAvailability: state => { if (!this.#abort.signal.aborted) view.engineAvailability?.(state); },
    }, this.#abort.signal).then(async ({ host, autoStart }) => {
      if (this.#abort.signal.aborted) return host.dispose();
      this.#host = host;
      if (autoStart) void this.start();
    });
    this.ready.catch(error => { if (!this.#abort.signal.aborted) report.readyError(error); });
  }

  get isRunning() { return this.#attempt !== undefined; }
  get hasPlace() { return this.#state.place !== null; }

  addView(view) {
    if (this.#views.has(view)) return () => {};
    this.#views.add(view);
    const { place, verdicts, cursor, awaited } = this.#state;
    if (place) view.mounted?.(...place);
    if (verdicts.size) view.verdicts?.([...verdicts.values()]);
    if (cursor >= 0) view.cursor?.(cursor);
    if (this.isRunning && awaited >= 0) view.awaited?.(awaited);
    return () => this.#views.delete(view);
  }

  #emit(method, ...args) {
    for (const view of this.#views) view[method]?.(...args);
  }

  #setPhase(kind, detail = {}) {
    this.view.state({ kind, ...detail });
  }

  async start() {
    if (this.isRunning || this.#abort.signal.aborted) return;
    const attempt = this.#attempt = {};
    this.startCue.arm();
    this.endCue.arm();
    this.#state = emptyTake();
    this.view.position?.(null);
    this.#emit("reset");
    if (!this.#host) {
      this.#transition("prepare");
      try { await this.ready; }
      catch (error) {
        if (attempt !== this.#attempt) return;
        this.#transition("preparationFailed");
        this.report.startError(error);
        return;
      }
      if (attempt !== this.#attempt || !this.#host) return;
    }
    this.#transition("listening");
    await this.#host.start();
  }

  stop() {
    this.#transition("stop");
  }

  #transition(event, failure) {
    if (!this.#attempt) return;
    switch (event) {
      case "prepare":
        this.#setPhase("preparing");
        break;
      case "preparationFailed":
        this.#attempt = undefined;
        this.#setPhase("failed", { failure: "modelUnavailable" });
        break;
      case "reading":
        this.#setPhase("following");
        break;
      case "stop":
      case "failed": {
        this.#attempt = undefined;
        if (event === "stop") this.#host?.stop();
        this.#endCue();
        this.#emit("stopped");
        if (event === "stop") this.#setPhase("idle");
        else this.#setPhase("failed", {
          failure: failure === "micDenied" || failure === "micUnavailable" ? failure : "modelUnavailable",
        });
        break;
      }
      default:
        this.#setPhase("searching");
    }
  }

  async dispose() {
    if (this.#abort.signal.aborted) return;
    this.stop();
    this.#abort.abort();
    this.#views.clear();
    this.#resolveCorpus(null);
    await this.#host?.dispose();
  }

  #beginCue(retries = 15) {
    if (!this.isRunning || this.#begun) return;
    if (this.startCue.play()) {
      this.#begun = true;
      this.#host?.ownSound(this.startCue.durationMs);
      this.report.log("start sound: played");
    } else if (retries > 0) {
      this.#cueTimer = this.clock.setTimeout(() => this.#beginCue(retries - 1), 100);
    } else {
      this.#begun = true;
      this.report.log("start sound: not ready");
    }
  }

  #endCue() {
    this.clock.clearTimeout(this.#cueTimer);
    if (!this.#begun) return;
    this.#begun = false;
    this.report.log(`end sound: ${this.endCue.play() ? "played" : "not ready"}`);
  }

  #hostView() {
    const duringTake = callback => (...args) => { if (this.isRunning) callback(...args); };
    return {
      phase: state => this.#transition(state.kind, state.failure),
      micLive: duringTake(live => {
        if (!live) return;
        this.clock.clearTimeout(this.#cueTimer);
        this.#beginCue();
      }),
      mounted: duringTake((surah, ayah) => {
        this.#state.place = [surah, ayah];
        this.#emit("mounted", surah, ayah);
      }),
      cursor: duringTake((surah, ayah, index) => {
        this.#state.place = [surah, ayah];
        this.#state.cursor = index;
        this.#emit("cursor", index);
      }),
      awaited: duringTake(index => {
        this.#state.awaited = index;
        this.#emit("awaited", index);
        this.view.position?.(index >= 0 ? this.#corpus?.ref(index) : null);
      }),
      verdicts: duringTake(({ changes }) => {
        for (const change of changes) this.#state.verdicts.set(change.wordIndex, change);
        this.#emit("verdicts", changes);
      }),
      heard: duringTake(text => this.view.heard?.(text)),
      recognitionFrames: duringTake((count, speech) => this.view.recognitionFrames?.(count, speech)),
      log: message => this.report.log(message),
    };
  }
}
