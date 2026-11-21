import { createHeaderRenderer } from "./controller.js";

export function quarterIcon(quarter) {
  const wedges = ["", "21 12", "12 21", "3 12"];
  const fill = quarter >= 4
    ? '<circle cx="12" cy="12" r="9" fill="currentColor"/>'
    : `<path d="M12 12 L12 3 A9 9 0 ${Number(quarter === 3)} 1 ${wedges[quarter]} Z" fill="currentColor"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${fill}<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
}

export class HeaderView {
  constructor({ document, locale, preferences, loadTitleFont, signal, dispatch, pie = quarterIcon }) {
    this.document = document;
    this.locale = locale;
    this.preferences = preferences;
    this.pie = pie;
    this.bookmarks = new Set(preferences.get("bookmarks", []));
    this.info = null;
    this.render = createHeaderRenderer(document);
    const node = id => document.getElementById(id);
    for (const [id, type] of [["title", "OPEN_INDEX"], ["search", "OPEN_SEARCH"], ["settings", "OPEN_SETTINGS"]]) {
      node(id).addEventListener("click", () => dispatch({ type }), { signal });
    }
    node("bookmark").addEventListener("click", () => this.toggleBookmark(), { signal });
    loadTitleFont();
  }
  show(info) {
    this.info = info;
    const node = id => this.document.getElementById(id);
    const { labels, number, surahName, language } = this.locale;
    node("topbar").dataset.location = JSON.stringify(info);
    const name = node("surah-name");
    if (language() === "ar") name.dataset.glyph = String.fromCodePoint(57344 + info.surah);
    else delete name.dataset.glyph;
    name.textContent = labels().surah(surahName(info.surah, info.surahName));
    node("page-meta").textContent = labels().pageMeta(number(info.page), number(info.juz), number(info.hizb));
    const saved = this.bookmarks.has(info.page);
    node("bookmark").classList.toggle("on", saved);
    node("bookmark").setAttribute("aria-pressed", String(saved));
    node("pf-surah").textContent = surahName(info.surah, info.surahName);
    node("pf-juz").textContent = labels().juzTitle(number(info.juz));
    node("pf-hizb").textContent = labels().hizbTitle(number(info.hizb));
    node("pf-pie").innerHTML = this.pie(info.quarter);
    node("pf-page").textContent = number(info.page);
    this.render(info, language());
  }
  retitle() {
    const labels = this.locale.labels();
    for (const [id, key] of [["title", "index"], ["search", "search"], ["settings", "settings"], ["bookmark", "bookmark"]]) {
      this.document.getElementById(id).setAttribute("aria-label", labels[key]);
    }
    if (this.info) this.show(this.info);
    else this.render(null, this.locale.language());
  }
  toggleBookmark() {
    if (!this.info) return;
    const page = this.info.page;
    if (this.bookmarks.has(page)) this.bookmarks.delete(page);
    else this.bookmarks.add(page);
    this.preferences.set("bookmarks", [...this.bookmarks].sort((a, b) => a - b));
    this.show(this.info);
  }
}
