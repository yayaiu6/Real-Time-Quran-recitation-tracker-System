import { mistakeSheetModel } from "./presentation.js";
import { MistakeSheet } from "./sheet.js";

export class MistakesFeature {
  #frame = 0;

  constructor(ports) {
    this.ports = ports;
    this.sheet = new MistakeSheet(ports);
    this.unsubscribe = ports.log.subscribe(count => this.changed(count));
    this.unbind = bindSelection(this.sheet, ports.dispatch);
  }

  setCorpus(corpus) { this.corpus = corpus; }
  open() { this.render(); this.sheet.open(); }
  close() { this.sheet.close(); }
  retitle() { this.sheet.retitle(); if (this.sheet.dialog.open) this.render(); }
  render() { this.sheet.render(mistakeSheetModel({ ...this.ports, corpus: this.corpus }), this.corpus); }

  changed(count) {
    this.onCount?.(count);
    if (this.sheet.dialog.open && !this.#frame) {
      this.#frame = this.ports.clock.requestAnimationFrame(() => { this.#frame = 0; this.render(); });
    }
  }

  dispose() {
    this.unsubscribe();
    this.unbind();
    this.ports.clock.cancelAnimationFrame(this.#frame);
  }
}

function bindSelection({ list, targets }, dispatch) {
  const select = event => {
    const target = targets.get(event.target.closest("button.mistake"));
    if (target) dispatch({ type: "NAVIGATE_MISTAKE", from: "mistakes", ...target });
  };
  list.addEventListener("click", select);
  return () => list.removeEventListener("click", select);
}
