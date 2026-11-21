const labels = {
  ar: {
    index: "فتح الفهرس", about: "عن التطبيق", page: "صفحة", juz: "الجزء", hizb: "الحزب",
    shortJuz: "ج", shortHizb: "ح", position: "موضع الصفحة داخل السورة",
    positionText: (page, total) => `الصفحة ${page} من ${total} داخل السورة`,
  },
  en: {
    index: "Open index", about: "About the application", page: "Page", juz: "Juz", hizb: "Hizb",
    shortJuz: "J", shortHizb: "H", position: "Page position within the surah",
    positionText: (page, total) => `Page ${page} of ${total} within the surah`,
  },
};
const validInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const formatters = {
  ar: new Intl.NumberFormat("ar-EG", { useGrouping: false }),
  en: new Intl.NumberFormat("en", { useGrouping: false }),
};

export function parseHeaderLocation(value) {
  try {
    const info = typeof value === "string" ? JSON.parse(value) : value;
    if (!info || !validInteger(info.page, 1, 604) || !validInteger(info.surah, 1, 114)
      || !validInteger(info.juz, 1, 30) || !validInteger(info.hizb, 1, 60)) return null;
    return info;
  } catch { return null; }
}

export function surahPagePosition(info) {
  if (!info || !validInteger(info.page, 1, 604)
    || !validInteger(info.surahStartPage, 1, 604)
    || !validInteger(info.surahEndPage, info.surahStartPage, 604)) return null;
  const total = info.surahEndPage - info.surahStartPage + 1;
  const current = Math.max(1, Math.min(total, info.page - info.surahStartPage + 1));
  return { current, total, fraction: current / total };
}

export function headerPresentation(info, language = "ar") {
  const lang = language === "en" ? "en" : "ar";
  const copy = labels[lang];
  const number = value => formatters[lang].format(value);
  const location = parseHeaderLocation(info);
  const position = surahPagePosition(location);
  return {
    copy, position,
    page: location ? `${copy.page} ${number(location.page)}` : "",
    divisions: location ? `${copy.juz} ${number(location.juz)} · ${copy.hizb} ${number(location.hizb)}` : "",
    compact: location ? `${copy.shortJuz} ${number(location.juz)} · ${copy.shortHizb} ${number(location.hizb)}` : "",
    positionText: position ? copy.positionText(number(position.current), number(position.total)) : "",
  };
}
