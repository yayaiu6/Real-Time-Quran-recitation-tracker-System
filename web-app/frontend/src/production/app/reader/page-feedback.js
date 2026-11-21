// Application feedback consumer. The word-coordinate adapter is supplied by
// the native rendering boundary, not inferred from SDK token numbering.
export class PageFeedback {
  constructor({ pager, highlights, corpus, wordReference, colors, clock }) {
    this.pager = pager;
    this.highlights = highlights;
    this.corpus = corpus;
    this.wordReference = wordReference;
    this.colors = colors;
    this.clock = clock;
    this.hidden = false;
    this.live = false;
    this.pointing = 0;
    this.next = null;
  }
  reset() {
    this.live = true;
    this.clock.clearTimeout(this.pointing);
    this.next = null;
    this.highlights.clear();
    this.applyHidden();
  }
  mounted(surah, ayah) {
    this.highlights.setAyah({ surah, ayah });
    this.highlights.setWord(this.wordReference(surah, ayah, 0));
    this.pager.follow(surah, ayah, 1);
  }
  awaited(index) {
    if (index < 0) return;
    const ref = this.corpus.ref(index);
    const word = this.wordReference(ref.surah, ref.ayah, ref.word);
    this.next = word;
    this.highlights.setAyah({ surah: ref.surah, ayah: ref.ayah });
    this.highlights.setWord(word);
    this.applyHidden();
    this.pager.follow(word.surah, word.ayah, word.word);
  }
  verdicts(verdicts) {
    this.highlights.setInks(verdicts.map(verdict => {
      const ref = this.corpus.ref(verdict.wordIndex);
      return {
        word: this.wordReference(ref.surah, ref.ayah, ref.word),
        color: this.colors[verdict.state],
        underline: verdict.state === "wrong" || verdict.state === "tajweed",
      };
    }));
  }
  stopped() {
    this.live = false;
    this.highlights.setAyah(null);
    this.highlights.setWord(null);
  }
  point(surah, ayah) {
    if (this.live) return;
    this.highlights.setAyah({ surah, ayah });
    this.clock.clearTimeout(this.pointing);
    this.pointing = this.clock.setTimeout(() => {
      if (!this.live) this.highlights.setAyah(null);
    }, 4000);
  }
  setHidden(hidden) { this.hidden = hidden; this.applyHidden(); }
  dispose() { this.clock.clearTimeout(this.pointing); }
  applyHidden() {
    this.highlights.setHiddenFrom(this.hidden ? this.next ?? { surah: 1, ayah: 1, word: 1 } : null);
  }
}
