function groupKey(entry) {
  return entry.kind === "skipped" ? `${entry.surah}:${entry.ayah}:${entry.corrected}` : null;
}

function correctionEvent(verdict) {
  const { state, wordIndex, surah, ayah } = verdict;
  if (state === "ok") return { type: "resolve", wordIndex };
  if (state !== "wrong" && state !== "tajweed") return null;
  const tajweed = state === "tajweed";
  return {
    type: "report", wordIndex,
    entry: {
      surah, ayah, corrected: false,
      kind: tajweed ? state : verdict.reason ?? "wrongWord",
      detail: tajweed ? null : verdict.detail ?? null,
      tajweed: tajweed ? verdict.tajweed ?? [] : [],
    },
  };
}

export class MistakeHistory {
  #entries = new Map();
  #range = null;
  #listeners = new Set();

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #publish() {
    const count = this.open;
    this.#listeners.forEach(listener => listener(count));
  }

  get range() { return this.#range; }
  get open() {
    let count = 0;
    for (const { corrected } of this.#entries.values()) count += Number(!corrected);
    return count;
  }

  groups() {
    let previous = -2, key = null;
    const groups = [];
    for (const index of [...this.#entries.keys()].sort((a, b) => a - b)) {
      const entry = this.#entries.get(index);
      const nextKey = groupKey(entry);
      if (nextKey !== null && nextKey === key && index === previous + 1) {
        groups.at(-1).words.push(index);
      } else {
        groups.push({ ...entry, words: [index] });
      }
      previous = index;
      key = nextKey;
    }
    return groups;
  }

  reset() {
    this.#entries.clear();
    this.#range = null;
    this.#publish();
  }

  verdicts(batch) {
    let range = this.#range;
    let touched = false;
    for (const verdict of batch) {
      const { wordIndex, state } = verdict;
      if (state === "pending") continue;
      touched = true;
      range = range
        ? { first: Math.min(range.first, wordIndex), last: Math.max(range.last, wordIndex) }
        : { first: wordIndex, last: wordIndex };
      this.#apply(correctionEvent(verdict));
    }
    this.#range = range;
    if (touched) this.#publish();
  }

  #apply(event) {
    if (!event) return;
    const { wordIndex } = event;
    if (event.type === "report") this.#entries.set(wordIndex, event.entry);
    else {
      const entry = this.#entries.get(wordIndex);
      if (entry) this.#entries.set(wordIndex, { ...entry, corrected: true });
    }
  }
}
