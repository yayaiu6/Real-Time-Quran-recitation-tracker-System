import { Layer, Sel } from "../vendor/qvp.js";

const verdictLayer = Layer.THEME + 1;
const underlineWidth = 2.4;
const wordKey = ({ surah, ayah, word }) => `${surah}:${ayah}:${word}`;
const sameWord = (a, b) => a && b ? wordKey(a) === wordKey(b) : a === b;
const precedes = (a, b) => a.surah === b.surah
  ? a.ayah === b.ayah ? a.word < b.word : a.ayah < b.ayah
  : a.surah < b.surah;
const indexOf = (page, { surah, ayah, word }) => page.findWord(surah, ayah, word);

export class Highlights {
  #ayah = null;
  #word = null;
  #inks = new Map();
  #hiddenFrom = null;
  #listeners = new Set();

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #changed() { for (const listener of this.#listeners) listener(); }

  setAyah(ayah) {
    if (this.#ayah?.surah === ayah?.surah && this.#ayah?.ayah === ayah?.ayah) return;
    this.#ayah = ayah;
    this.#changed();
  }

  setWord(word) {
    if (sameWord(this.#word, word)) return;
    this.#word = word;
    this.#changed();
  }

  setHiddenFrom(word) {
    if (sameWord(this.#hiddenFrom, word)) return;
    this.#hiddenFrom = word;
    this.#changed();
  }

  setInks(changes) {
    for (const { word, color, underline } of changes) {
      const key = wordKey(word);
      if (color) this.#inks.set(key, { word, color, underline: underline === true });
      else this.#inks.delete(key);
    }
    if (changes.length) this.#changed();
  }

  clear() {
    this.#ayah = this.#word = null;
    this.#inks.clear();
    this.#changed();
  }

  apply(page) {
    page.clearHighlights();
    page.clearLayer(verdictLayer);
    if (this.#ayah) {
      const ayah = `${this.#ayah.surah}:${this.#ayah.ayah}`;
      if (page.targetWords(ayah).length) page.highlight(ayah, { mode: "band", band: "#0000000d", padX: 0 });
    }
    if (this.#word) {
      const index = indexOf(page, this.#word);
      if (index >= 0) page.highlight([index], { mode: "band", band: "#00000021", padX: 1 });
    }
    for (const { word, color } of this.#inks.values()) {
      const index = indexOf(page, word);
      if (index >= 0) page.style(Sel.word(index), color, { layer: verdictLayer });
    }
    page.unmaskAll();
    if (this.#hiddenFrom) {
      const masked = page.words.filter(word => !precedes(word, this.#hiddenFrom) && !this.#inks.has(wordKey(word)));
      if (masked.length) page.mask(masked.map(word => word.index), "hide");
    }
  }

  overlay(page, context, view, dpr) {
    let started = false;
    for (const { word, color, underline } of this.#inks.values()) {
      if (!underline) continue;
      const index = indexOf(page, word);
      if (index < 0) continue;
      if (!started) {
        started = true;
        context.save();
        context.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offsetX, dpr * view.offsetY);
        context.lineWidth = underlineWidth;
        context.lineCap = "round";
        context.setLineDash([0, underlineWidth * 2]);
      }
      context.strokeStyle = color;
      for (const band of page.wordBandsView([index], { height: "lineSpacing", padX: 0, padY: 0 })) {
        const y = band.y1 - underlineWidth;
        context.beginPath();
        context.moveTo(band.x0 + underlineWidth / 2, y);
        context.lineTo(band.x1 - underlineWidth / 2, y);
        context.stroke();
      }
    }
    if (started) context.restore();
  }
}
