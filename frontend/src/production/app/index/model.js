export class IndexSelection {
  tab = "surahs";
  descending = false;
  opened = new Set();

  select(tab) {
    if (!["surahs", "parts", "bookmarks"].includes(tab)) return false;
    this.tab = tab;
    return true;
  }
  sort() { this.descending = !this.descending; }
  toggle(juz) { if (!this.opened.delete(juz)) this.opened.add(juz); }
  reveal(juz) { this.opened = new Set([juz]); }
}

function preview(corpus, { surah, ayah }) {
  if (!corpus?.hasAyah(surah, ayah)) return "";
  const first = corpus.ayahFirstWord(surah, ayah);
  return Array.from({ length: Math.min(4, corpus.ayahWordCount(surah, ayah)) }, (_, word) => corpus.displayWord(first + word)).join(" ");
}

export function indexRows(atlas, bookmarks, selection, corpus) {
  const order = (a, b) => selection.descending ? b - a : a - b;
  if (selection.tab === "bookmarks") {
    return [...bookmarks].sort(order).map(page => ({ page }));
  }
  const parts = Array.from({ length: 30 }, (_, index) => index + 1).sort(order);
  if (selection.tab === "parts") {
    return parts.flatMap(juz => {
      const start = atlas.juz(juz);
      if (!start) return [];
      const expanded = selection.opened.has(juz);
      const quarters = expanded ? Array.from({ length: 8 }, (_, quarter) => ({
        quarter, reference: atlas.rubuAlHizb((juz - 1) * 8 + quarter + 1),
      })).filter(row => row.reference).map(row => ({ ...row, taste: preview(corpus, row.reference) })) : [];
      return [{ juz, start, expanded, quarters, taste: preview(corpus, start) }];
    });
  }
  const chapters = new Map(parts.map(juz => [juz, []]));
  for (const surah of atlas.surahs()) chapters.get(atlas.juzOf(surah.number, 1) ?? 1)?.push(surah);
  return parts.map(juz => {
    const list = chapters.get(juz);
    return { juz, chapters: selection.descending ? list.reverse() : list };
  });
}
