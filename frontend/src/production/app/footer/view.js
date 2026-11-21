import { createFooterRenderer, createFooterFeedbackRenderer } from "./controller.js";
import { RecitationTimer } from "./timer.js";
import { projectFooterFeedback } from "./presentation.js";

export class FooterView {
  engineAvailability(state) {
    this.node("footer").dataset.engineAvailability = state;
    this.labelEngine();
  }
  recognitionFrames(count, speech) {
    const data = this.node("footer").dataset;
    data.recognitionFrames = String(Number(data.recognitionFrames ?? 0) + count);
    if (speech) data.recognitionSpeechFrames = String(Number(data.recognitionSpeechFrames ?? 0) + count);
  }
  labelEngine() {
    const status = this.node("engine-status");
    status.hidden = this.node("footer").dataset.engineAvailability !== "ENGINE_UNAVAILABLE";
    status.textContent = status.hidden ? "" : this.locale.language() === "ar"
      ? "التتبّع وتصحيح الأخطاء غير متاحين"
      : "Tracking and mistake correction unavailable";
  }
  constructor({ document, locale, icons, clock, signal, dispatch }) {
    this.document = document;
    this.locale = locale;
    this.clock = clock;
    this.current = "idle";
    this.feedbackView = createFooterFeedbackRenderer(document);
    this.timer = new RecitationTimer(clock, {
      show: this.feedbackView.timerVisible,
      draw: seconds => this.paintTime(seconds),
    });
    this.noticeTimer = 0;
    this.share = 0;
    this.model = {};
    this.hiding = false;
    this.render = createFooterRenderer(document);
    this.failure = null;
    this.mistakes = 0;
    this.heardText = "";
    this.node("tafsir").innerHTML = icons.book;
    const commands = {
      mic: () => this.controls?.microphone(),
      hide: () => this.controls?.hidden(),
      tafsir: () => ({ type: "OPEN_LAYOUT" }),
      mistakes: () => ({ type: "OPEN_MISTAKES" }),
    };
    for (const [id, command] of Object.entries(commands)) {
      this.node(id).addEventListener("click", () => dispatch(command()), { signal });
    }
  }
  node(id) { return this.document.getElementById(id); }
  paintControls() {
    this.render({
      state: this.current, language: this.locale.language(), hiding: this.hiding,
      mistakes: this.mistakes, countText: this.locale.number(this.mistakes), ...this.model,
    });
  }
  mistakeCount(count) {
    this.mistakes = count;
    this.node("mistakes-count").hidden = count <= 0;
    this.node("mistakes-count").textContent = this.locale.number(count);
    this.paintControls();
  }
  eyeOn(hidden) {
    this.hiding = hidden;
    this.node("hide").setAttribute("aria-pressed", String(hidden));
    this.paintControls();
  }
  state(state) {
    const previous = this.current;
    this.current = state.kind;
    if (previous !== state.kind && state.kind === "searching") this.heardText = "";
    this.feedbackView.phase(state.kind);
    this.timer.project(state.kind);
    if (state.kind === "failed") this.fail(state.failure);
    this.paintHeard();
    this.label();
  }
  progress(fraction) {
    this.share = Math.max(0, Math.min(1, fraction));
    this.model.modelProgress = this.share;
    this.node("footer").dataset.modelProgress = String(this.share);
    this.label();
  }
  modelReady(info) {
    const { dataset } = this.node("footer");
    dataset.modelReady = "true";
    this.model.modelReady = true;
    if (info) dataset.modelInfo = JSON.stringify(info);
    this.paintControls();
  }
  modelFailed() {
    this.node("footer").dataset.modelFailed = "true";
    this.model.modelFailed = true;
    this.paintControls();
  }
  position(ref) {
    const { dataset } = this.node("footer");
    if (ref) dataset.recitationAwaited = JSON.stringify({ surah: ref.surah, ayah: ref.ayah, word: ref.word + 1 });
    else delete dataset.recitationAwaited;
  }
  heard(text) { this.heardText = (text || "").trim(); this.paintHeard(); }
  feedback() {
    return projectFooterFeedback({ kind: this.current, heard: this.heardText, fraction: this.share },
      this.locale.labels(), this.locale.number);
  }
  paintHeard() {
    this.feedbackView.heard(this.feedback());
  }
  retitle() {
    this.labelEngine();
    const labels = this.locale.labels();
    this.node("hide").setAttribute("aria-label", labels.hideAyahs);
    this.node("tafsir").setAttribute("aria-label", labels.layoutTitle);
    this.node("mistakes-label").textContent = labels.mistakes;
    this.mistakeCount(this.mistakes);
    if (this.failure && !this.node("notice").hidden) this.node("notice").textContent = labels.failures[this.failure];
    this.timer.refresh();
    this.label();
  }
  label() {
    this.feedbackView.preparation(this.feedback());
    this.paintControls();
  }
  fail(reason) {
    this.failure = reason;
    const notice = this.node("notice");
    notice.textContent = this.locale.labels().failures[reason];
    notice.hidden = false;
    this.clock.clearTimeout(this.noticeTimer);
    this.noticeTimer = this.clock.setTimeout(() => { notice.hidden = true; this.failure = null; }, 6000);
  }
  dispose() {
    this.timer.stop();
    this.clock.clearTimeout(this.noticeTimer);
  }
  paintTime(seconds) {
    const padded = value => this.locale.number(value).padStart(2, this.locale.number(0));
    this.feedbackView.timerText(`${padded(Math.floor(seconds / 60))}:${padded(seconds % 60)}`);
  }
}
