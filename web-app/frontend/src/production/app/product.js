// Public, non-secret product settings. Keep credentials in runtime configuration.
export const product = Object.freeze({
  id: "recitation-reader",
  version: "0.1.0",
  storageNamespace: "recitation",
  name: { ar: "متتبع التلاوة", en: "Recitation Tracker" },
  title: { ar: "متتبع التلاوة", en: "Recitation Tracker" },
  lead: {
    ar: "استمع إلى تلاوتك وتابع موضعك على صفحة المصحف كلمةً كلمة.",
    en: "Follow your recitation on the Quran page, word by word.",
  },
  installTitle: {
    ar: "أضف المصحف إلى شاشتك الرئيسية",
    en: "Add the reader to your Home Screen",
  },
  // Optional companion link. Empty URL disables the card.
  companion: {
    url: "",
    icon: "",
    label: { ar: "رابط إضافي", en: "Additional link" },
  },
});

// Preserve settings when the configured storage namespace changes. Ambiguous
// matches are left untouched, and blocked browser storage must not prevent boot.
export function migrateStoredSettings(namespace, storage) {
  try {
    let tracker;
    try { tracker = JSON.parse(storage.getItem("recitation-tracker.preferences")); } catch {}
    const transferable = tracker ? {
      lang: ["ar", "en"].includes(tracker.language) ? tracker.language : null,
      page: Number.isInteger(tracker.page) && tracker.page >= 1 && tracker.page <= 604 ? tracker.page : null,
      bookmarks: Array.isArray(tracker.bookmarks) ?
        tracker.bookmarks.filter(page => Number.isInteger(page) && page >= 1 && page <= 604) : null,
    } : {};
    for (const suffix of ["lang", "page", "bookmarks", "view", "mistakeSound"]) {
      const target = `${namespace}.${suffix}`;
      if (storage.getItem(target) !== null) continue;
      const previous = Object.keys(storage).filter(key => key.endsWith(`.${suffix}`) && key !== target);
      if (previous.length === 1) storage.setItem(target, storage.getItem(previous[0]));
      else if (!previous.length && transferable[suffix] != null) storage.setItem(target, JSON.stringify(transferable[suffix]));
    }
  } catch {}
}
// Resolve direction synchronously, before the first paint and module startup.
export function initializeReaderDocument(document, window) {
  const { navigator } = window;
  // Accessing localStorage itself can throw in privacy-restricted browsers.
  try { migrateStoredSettings(product.storageNamespace, window.localStorage); } catch {}
  let language = /^ar(?:-|$)/i.test(navigator.languages?.[0] || navigator.language || "en") ? "ar" : "en";
  try {
    const saved = JSON.parse(window.localStorage.getItem(`${product.storageNamespace}.lang`));
    if (saved === "ar" || saved === "en") language = saved;
  } catch {}
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
}

function applyProductSettings(document) {
  const config = product;
  const language = document.documentElement.lang === "en" ? "en" : "ar";
  const name = document.getElementById("about-name");
  if (name) name.textContent = config.name[language];
  document.title = config.title[language];
  for (const selector of [
    'meta[name="application-name"]', 'meta[name="apple-mobile-web-app-title"]',
    'meta[property="og:site_name"]',
  ]) document.querySelector(selector)?.setAttribute("content", config.name[language]);
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
    document.querySelector(selector)?.setAttribute("content", config.title[language]);
  }
  for (const selector of [
    'meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]',
  ]) document.querySelector(selector)?.setAttribute("content", config.lead[language]);
  const schema = document.querySelector('script[type="application/ld+json"]');
  if (schema) {
    const data = JSON.parse(schema.textContent);
    data.name = config.name[language];
    data.alternateName = config.name[language === "ar" ? "en" : "ar"];
    data.description = config.lead[language];
    schema.textContent = JSON.stringify(data);
  }
  const card = document.getElementById("companion-card");
  if (card) {
    const url = config.companion.url;
    const enabled = /^https?:\/\//.test(url);
    card.hidden = !enabled;
    if (enabled) card.href = url;
    else card.removeAttribute("href");
  }
}
export function mountProductMetadata(document) {
  const update = () => applyProductSettings(document);
  update();
  const observer = new document.defaultView.MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true, attributeFilter: ["lang"],
  });
  return () => observer.disconnect();
}
