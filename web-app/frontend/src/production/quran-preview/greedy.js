import { tokenText } from "./corpus.js";

const vocabularySize = 38;
const blankOffset = 2;

export class GreedyFrameDecoder {
  #read = 0;
  #previous = 0;

  get framesRead() { return this.#read; }

  reset(frame) {
    this.#read = frame;
    this.#previous = 0;
  }

  next(history) {
    const decoded = [];
    const { data, base } = history.logProbs;
    if (this.#read < base) this.reset(base);
    const end = history.count40;
    for (; this.#read < end; this.#read++) {
      const offset = (this.#read - base) * vocabularySize;
      let winner = 1, best = -Infinity, runnerUp = -Infinity;
      for (let id = 1; id < vocabularySize; id++) {
        const score = data[offset + id];
        if (score > best) {
          runnerUp = best;
          best = score;
          winner = id;
        } else if (score > runnerUp) runnerUp = score;
      }
      const blank = data[offset];
      const id = blank - blankOffset > best ? 0 : winner;
      const previous = this.#previous;
      this.#previous = id;
      if (id === 0 || id === previous) continue;
      const sym = tokenText(id);
      if (!sym) continue;
      const nextScore = blank > runnerUp ? blank : runnerUp;
      decoded.push({ sym, frame: this.#read, margin: Math.max(0, Math.exp(best) - Math.exp(nextScore)) });
    }
    return decoded;
  }
}
