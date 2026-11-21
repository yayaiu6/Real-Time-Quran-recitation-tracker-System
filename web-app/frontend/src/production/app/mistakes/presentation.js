const toneOf = group => group.corrected ? "ok" : group.kind === "tajweed" ? "tajweed" : "wrong";

export function mistakeSheetModel({ log, corpus, reciting, locale, surahName }) {
  const labels = locale.labels(), number = locale.number;
  const place = ({ surah, ayah }) => `${surahName(surah)} ${number(ayah)}`;
  const totals = { wrong: 0, tajweed: 0, ok: 0 };
  const cards = (corpus ? log.groups() : []).map(group => {
    const tone = toneOf(group);
    totals[tone] += group.words.length;
    const target = { surah: group.surah, ayah: group.ayah };
    const rules = group.kind === "tajweed" ? [...new Set(group.tajweed.map(rule => labels.tajweedNames[rule.kind]))] : [];
    const title = group.kind === "tajweed"
      ? (rules.length ? labels.tajweedTitle(rules.join(" · ")) : labels.tajweedWord)
      : group.kind === "skipped" && group.words.length > 1 ? labels.mistakeKinds.skippedMany : labels.mistakeKinds[group.kind];
    return { group, target, tone, title, reference: place(target) };
  });
  const range = log.range;
  const started = range !== null || reciting();
  return {
    cards,
    empty: started ? [labels.noMistakes, labels.noMistakesHint] : [labels.mistakesTitle, labels.mistakesNotStarted],
    range: range && corpus ? labels.mistakesRange(place(corpus.ref(range.first)), place(corpus.ref(range.last))) : null,
    chips: Object.entries(totals).filter(([, count]) => count > 0).map(([tone, count]) => ({
      tone, text: `${{ wrong: labels.mistakesWord, tajweed: labels.tajweedWord, ok: labels.corrected }[tone]} ${number(count)}`,
    })),
  };
}
