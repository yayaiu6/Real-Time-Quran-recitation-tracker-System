// Mapping contract of the existing corpus/QVP dataset, not an inference rule.
// The first two corpus tokens in 15:7 address the same rendered word.
export function pageWordReference(surah, ayah, corpusWord) {
  const mergedOpening = surah === 15 && ayah === 7;
  const word = mergedOpening ? (corpusWord <= 1 ? 1 : corpusWord) : corpusWord + 1;
  return { surah, ayah, word };
}

export function describeAtlasPage(atlas, page, surah, ayah) {
  const quarterIndex = atlas.divisionOf("rubu_al_hizb", surah, ayah) ?? 1;
  return {
    page, surah, surahName: atlas.surah(surah)?.arabic ?? "",
    juz: atlas.juzOf(surah, ayah) ?? 0,
    hizb: atlas.divisionOf("hizb", surah, ayah) ?? Math.ceil(quarterIndex / 4),
    quarter: (quarterIndex - 1) % 4 + 1,
    surahStartPage: atlas.pageOf(surah, 1),
    surahEndPage: atlas.pageOf(surah, atlas.surah(surah)?.ayahCount ?? 1),
  };
}
