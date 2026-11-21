import { VerseIndex } from "./verse-index.js";

// The text-search model depends on Quran resources, not dialogs or navigation.
export class ReaderSearch {
  constructor(mushaf) { this.mushaf = mushaf; }

  setCorpus(corpus) {
    this.corpus = corpus;
    this.verses = new VerseIndex(corpus, text => this.mushaf.normalize(text), text => this.mushaf.looseKey(text));
  }

  find(query, expanded) {
    const num = Number(query.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)));
    const page = Number.isInteger(num) && num >= 1 && num <= 604 ? this.mushaf.info(num) : null;
    const chapters = this.mushaf.atlas.searchSurahs(query).filter(chapter => chapter !== null).slice(0, 6);
    const matches = this.verses?.find(query, expanded ? 400 : 30);
    return { page, chapters, matches };
  }

  preview(surah, ayah) {
    if (!this.corpus) return "";
    const first = this.corpus.ayahFirstWord(surah, ayah);
    const count = this.corpus.ayahWordCount(surah, ayah);
    return Array.from({ length: Math.min(7, count) }, (_, index) => this.corpus.displayWord(first + index)).join(" ")
      + (count > 7 ? " …" : "");
  }

  surahName(number) { return this.mushaf.atlas.surah(number)?.arabic ?? ""; }
}
