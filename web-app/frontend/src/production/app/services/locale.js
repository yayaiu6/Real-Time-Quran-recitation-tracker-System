export function createLocale({ document, navigator, preferences, messages, names }) {
  const browserLanguage = navigator.languages?.[0] || navigator.language || "en";
  const fallback = /^ar(?:-|$)/i.test(browserLanguage) ? "ar" : "en";
  let language = preferences.get("lang", fallback) === "en" ? "en" : "ar";
  const listeners = new Set();
  const arabicNumbers = new Intl.NumberFormat("ar-EG", { useGrouping: false });
  function apply() {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
  }
  apply();
  return {
    language: () => language,
    labels: () => messages[language === "en" ? "en" : "ar"],
    number: value => language === "en" ? String(value) : arabicNumbers.format(value),
    surahName: (surah, fallbackName) => language === "en" ? names[surah - 1] ?? fallbackName : fallbackName,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setLanguage(value) {
      preferences.set("lang", value);
      if (value === language) return;
      language = value;
      apply();
      for (const listener of listeners) listener();
    },
  };
}
