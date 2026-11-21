// Corpus consumer: text matching only; no inference or verdict generation.
export class VerseIndex {
  constructor(corpus, normalize, looseKey) {
    this.corpus = corpus;
    this.normalize = normalize;
    this.looseKey = looseKey;
    this.entries = null;
  }
  find(query, limit) {
    const strictQuery = this.queryKey(this.normalize(query));
    if (strictQuery.length < 2) return { total: 0, hits: [] };
    this.build();
    const strict = this.scan("strict", strictQuery, limit);
    if (strict.total) return strict;
    const looseQuery = this.queryKey(this.looseKey(query));
    return looseQuery.length >= 2 ? this.scan("loose", looseQuery, limit) : strict;
  }
  queryKey(text) {
    return text.replace(/\s+/g, " ").trim();
  }
  scan(field, query, limit) {
    const hits = [];
    let total = 0;
    for (const entry of this.entries) if (entry[field].includes(query)) {
      total++;
      if (hits.length < limit) hits.push(entry.reference);
    }
    return { total, hits };
  }
  build() {
    if (this.entries) return;
    this.entries = [];
    for (let surah = 1; surah <= 114; surah++) {
      const count = this.corpus.surah(surah).ayahCount;
      for (let ayah = 1; ayah <= count; ayah++) {
        this.entries.push(this.indexAyah(surah, ayah));
      }
    }
  }
  indexAyah(surah, ayah) {
    const first = this.corpus.ayahFirstWord(surah, ayah);
    const words = [];
    for (let word = 0; word < this.corpus.ayahWordCount(surah, ayah); word++) {
      words.push(this.corpus.plainWord(first + word));
    }
    const text = words.join(" ");
    return { reference: { surah, ayah }, strict: this.normalize(text), loose: this.looseKey(text) };
  }
}
