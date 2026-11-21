import { WordAudio } from "../recognition/word-audio.js";
import { CueMute } from "../recognition/cue-mute.js";
import { WakeLock } from "./wake-lock.js";

const firstBackoff = 2000;
const maxBackoff = 10_000;
const failureBudget = 60_000;
const slowStep = 200;

// Owns capture and retry for one prepared tracker/decoder pair. The application
// session owns the UI take; the tracker decides search, relocation and judging.
export class LiveSessionHost {
  #phase = "idle";
  #paused = false;
  #abort;
  #mic;
  #stopping;
  #retryTimer;
  #backoff = firstBackoff;
  #failingSince;
  #lastSurah = null;
  #hint = null;
  #unsubscribe;

  constructor({ judge, preview, decoder, view, policy, capture, output, browser = window, now = Date.now,
    cue = output.cue("/audio-cues/recitation-mistake.mp3"), words = new WordAudio(output) }) {
    Object.assign(this, { judge, preview, decoder, view, policy, capture, browser, now, cue, words, output });
    this.#abort = new browser.AbortController();
    this.mute = new CueMute(now);
    this.wake = new WakeLock({
      navigator: browser.navigator, now, log: view.log,
      wanted: () => Boolean(this.#mic && this.#canCapture() && browser.document.visibilityState === "visible"),
    });
    browser.document.addEventListener("visibilitychange", () => {
      if (browser.document.visibilityState === "hidden") this.pause();
      else this.resume();
    }, { signal: this.#abort.signal });
    words.onChange = word => { if (!word) this.mute.endPlayback(); };
    if (judge) {
      const applyPolicy = () => judge.setStayOnSurah(policy.locateOnce);
      this.#unsubscribe = policy.onChange(applyPolicy);
      applyPolicy();
    }
  }

  async start() {
    if (this.#abort.signal.aborted || this.#running) return;
    this.#phase = "listening";
    this.#paused = this.browser.document.visibilityState === "hidden";
    this.wake.resetRetry();
    void this.wake.request();
    this.cue.arm();
    await this.#beginSearch();
  }

  stop() {
    this.#phase = "idle";
    this.#cancelRetry();
    const stopping = this.#stopMic();
    void this.wake.release();
    this.judge?.startSearch();
    this.#resetFailure();
    this.view.phase({ kind: "listening" });
    return stopping;
  }

  async dispose() {
    if (this.#abort.signal.aborted) return;
    this.#abort.abort();
    this.#unsubscribe?.();
    this.words.onChange = null;
    await this.stop();
    await this.decoder.close();
    this.judge?.dispose();
  }

  pause() {
    if (this.#paused || this.#abort.signal.aborted) return;
    this.#paused = true;
    this.#cancelRetry();
    void this.#stopMic();
    void this.wake.release();
  }

  resume() {
    if (!this.#paused || this.#abort.signal.aborted) return;
    this.#paused = false;
    if (!this.#running) return;
    this.output.resume();
    this.wake.resetRetry();
    this.#scheduleSearch(0);
  }

  onFrames(primary, secondary, count, speech = true, detail = null) {
    if (!this.#canCapture()) return;
    if (!this.judge) {
      this.view.recognitionFrames?.(count, speech);
      const text = this.preview?.feed(primary, count);
      if (text !== undefined) this.view.heard?.(text);
      return;
    }
    const started = this.browser.performance.now();
    const events = this.judge.feedFrames(primary, secondary, count, speech, detail);
    const engineMs = this.browser.performance.now() - started;
    this.#dispatch(events);
    const totalMs = this.browser.performance.now() - started;
    if (totalMs > slowStep) {
      const place = this.judge.position;
      this.view.log(`slow step: ${totalMs.toFixed(0)} ms (engine ${engineMs.toFixed(0)}) at ${place ? `${place.surah}:${place.ayah}` : "the search"} — ${events.map(event => event.type).join(",") || "no event"}`);
    }
  }

  onDecoderError(error) {
    if (!this.#canCapture()) return;
    this.view.log(`decoder: ${error}`);
    this.#fail("modelUnavailable");
  }

  ownSound(duration) { this.mute.extend(duration); }

  async speakWord(surah, ayah, word) {
    const duration = await this.words.play(surah, ayah, word);
    if (duration > 0) this.ownSound(duration);
  }

  #dispatch(events) {
    for (const event of events) this.#handle(event);
  }

  #handle(event) {
    const { judge, view, policy } = this;
    switch (event.type) {
      case "located":
        view.log(`located ${event.surah}:${event.ayah} w${event.word} (replayed ${event.replayed})`);
        void this.wake.request();
        this.#lastSurah = event.surah;
        view.mounted(event.surah, event.ayah);
        this.#setPhase("reading");
        break;
      case "relocated":
        view.log(`relocated ${event.from.surah}:${event.from.ayah} → ${event.to.surah}:${event.to.ayah}`);
        this.#lastSurah = event.to.surah;
        view.mounted(event.to.surah, event.to.ayah);
        break;
      case "cursor":
        view.cursor(event.surah, event.ayah, event.wordIndex);
        this.#remember(event);
        break;
      case "awaited":
        view.awaited?.(event.wordIndex);
        break;
      case "verdicts":
        view.verdicts(event);
        if (policy.mistakeSound && policy.locateOnce &&
          event.changes.some(verdict => verdict.state === "wrong") && this.cue.play()) {
          this.ownSound(this.cue.durationMs);
        }
        break;
      case "lost":
        view.log("lost");
        break;
      case "hearing":
        view.heard?.(event.words.slice(-7).map(index => judge.corpus.plainWord(index)).join(" "));
        break;
      case "locateFailed": {
        view.heard?.("");
        this.#resetFailure();
        this.#lastSurah = null;
        const hint = this.#searchHint();
        if (hint?.surah !== this.#hint?.surah || hint?.ayah !== this.#hint?.ayah) judge.setHint(this.#hint = hint);
        break;
      }
      case "idle":
        if (!policy.locateOnce) {
          view.log(`idle (${event.reason}) — searching again`);
          this.#endRunAndSearch();
        }
        break;
      case "completed": {
        this.#completeSurah(event.surah);
        break;
      }
    }
  }

  #completeSurah(surah) {
    this.view.log(`completed surah ${surah}`);
    const next = surah + 1;
    if (next <= 114) {
      this.#remember({ surah: next, ayah: 1 });
      if (this.policy.locateOnce) {
        this.view.log(`continuing to surah ${next}`);
        this.view.notice?.({ kind: "continuing", surah: next });
        this.#dispatch(this.judge.track(next, 1));
        return;
      }
    }
    this.view.notice?.({ kind: "surahEnded", surah });
    this.#endRunAndSearch();
  }

  #remember({ surah, ayah }) {
    if (this.policy.remembersPlace) this.policy.lastRead = { surah, ayah };
  }

  #searchHint() {
    return this.policy.expectFatihah && this.#lastSurah !== 1 ? { surah: 1, ayah: 1 } : null;
  }

  #endRunAndSearch() {
    this.judge.startSearch();
    this.judge.setHint(this.#hint = this.#searchHint());
    this.#setPhase("listening");
  }

  get #running() { return this.#phase === "listening" || this.#phase === "reading"; }

  #canCapture() {
    return this.#running && !this.#paused && !this.#abort.signal.aborted;
  }

  async #beginSearch() {
    if (!this.#canCapture()) return;
    this.#setPhase("listening");
    this.preview?.reset();
    if (this.judge) {
      this.judge.setHint(this.#hint = this.#searchHint());
      this.judge.startSearch();
    }
    await this.#startMic();
    if (this.#canCapture()) await this.wake.request();
  }

  #scheduleSearch(delay) {
    this.#cancelRetry();
    this.#retryTimer = this.browser.setTimeout(() => {
      this.#retryTimer = undefined;
      void this.#beginSearch();
    }, delay);
  }

  #cancelRetry() {
    this.browser.clearTimeout(this.#retryTimer);
    this.#retryTimer = undefined;
  }

  async #startMic() {
    if (this.#stopping) await this.#stopping;
    if (this.#mic || !this.#canCapture()) return;
    let mic;
    try {
      mic = this.capture({
        onChunk: samples => {
          if (this.#mic !== mic || !this.#canCapture()) return;
          this.mute.apply(samples);
          this.decoder.pushAudio(samples);
        },
        onLive: () => {
          if (this.#mic !== mic || !this.#canCapture()) return;
          this.view.micLive(true);
          this.#resetFailure();
        },
      });
      this.#mic = mic;
      await mic.start();
      if (this.#mic === mic) await this.wake.request();
    } catch (error) {
      if (this.#mic !== mic) return; // Late permission rejection from a stopped source.
      this.#mic = undefined;
      this.#micFailed(error);
    }
  }

  #stopMic() {
    if (this.#stopping) return this.#stopping;
    this.words.stop();
    const mic = this.#mic;
    this.#mic = undefined;
    this.view.micLive(false);
    const stopping = (async () => {
      try { await mic?.stop(); }
      finally { await this.decoder.endTake(); }
    })().catch(error => this.view.log(`capture cleanup: ${error}`)).finally(() => {
      if (this.#stopping === stopping) this.#stopping = undefined;
    });
    return (this.#stopping = stopping);
  }

  #resetFailure() {
    this.#failingSince = undefined;
    this.#backoff = firstBackoff;
  }

  #micFailed(error) {
    const name = error?.name;
    this.view.log(`mic: ${name || String(error)}`);
    if (name === "NotAllowedError" || name === "SecurityError") return this.#fail("micDenied");
    const now = this.now();
    this.#failingSince ??= now;
    if (now - this.#failingSince >= failureBudget) return this.#fail("micUnavailable");
    this.#scheduleSearch(this.#backoff);
    this.#backoff = Math.min(this.#backoff * 2, maxBackoff);
  }

  #fail(failure) {
    this.#cancelRetry();
    this.#setPhase("failed", failure);
    void this.#stopMic();
    void this.wake.release();
  }

  #setPhase(kind, failure) {
    this.#phase = kind;
    this.view.phase(failure ? { kind, failure } : { kind });
  }
}
