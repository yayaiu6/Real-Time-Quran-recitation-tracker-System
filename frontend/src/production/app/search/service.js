import { ReaderSearch } from "./query.js";

export class SearchService {
  constructor({ document, locale, icons, clock, mushaf, dispatch, signal }) {
    this.document = document;
    this.locale = locale;
    this.icons = icons;
    this.clock = clock;
    this.query = new ReaderSearch(mushaf);
    this.dialog = this.node("search-page");
    this.input = this.node("search-input");
    this.results = this.node("search-results");
    this.timer = 0;
    this.showAll = false;
    for (const icon of this.dialog.querySelectorAll("[data-icon]")) icon.innerHTML = icons.search;
    this.node("search-clear").innerHTML = icons.close;
    this.input.addEventListener("input", () => {
      this.showAll = false;
      clock.clearTimeout(this.timer);
      this.timer = clock.setTimeout(() => this.render(), 120);
    }, { signal });
    const select = button => {
      if (!button) return;
      if (button.matches(".see-all")) {
        this.showAll = true;
        this.render();
      } else if (button.dataset.page) {
        dispatch({ type: "NAVIGATE_PAGE", from: "search", page: Number(button.dataset.page),
          surah: button.dataset.surah ? Number(button.dataset.surah) : undefined });
      } else if (button.dataset.ayah) {
        dispatch({ type: "NAVIGATE_AYAH", from: "search", surah: Number(button.dataset.surah), ayah: Number(button.dataset.ayah) });
      }
    };
    this.results.addEventListener("click", event => select(event.target.closest("button")), { signal });
    this.input.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      select(this.results.querySelector("button.result"));
    }, { signal });
    this.node("search-clear").addEventListener("click", () => {
      this.input.value = "";
      this.render();
      this.input.focus();
    }, { signal });
  }
  close() { this.dialog.close(); }
  node(id) { return this.document.getElementById(id); }
  dispose() { this.clock.clearTimeout(this.timer); }
  setCorpus(corpus) {
    this.query.setCorpus(corpus);
    if (this.dialog.open) this.render();
  }
  open() {
    this.input.value = "";
    this.showAll = false;
    this.render();
    this.dialog.showModal();
    this.input.focus();
  }
  retitle() {
    const labels = this.locale.labels();
    this.node("search-title").textContent = labels.search;
    this.input.placeholder = labels.searchPlaceholder;
    this.input.setAttribute("aria-label", labels.searchPlaceholder);
    this.node("search-clear").setAttribute("aria-label", labels.clear);
    if (this.dialog.open) this.render();
  }
  note(text) {
    const note = this.document.createElement("p");
    note.className = "search-note";
    note.textContent = text;
    return note;
  }
  heading(text) {
    const heading = this.document.createElement("h3");
    heading.className = "result-heading";
    const label = this.document.createElement("span");
    label.textContent = text;
    heading.append(label);
    return heading;
  }
  render() {
    const query = this.input.value.trim();
    const labels = this.locale.labels(), number = this.locale.number;
    this.node("search-clear").hidden = !query;
    if (!query) { this.results.replaceChildren(this.note(labels.searchHint)); return; }
    const content = this.document.createDocumentFragment();
    const section = (title, results, more = false) => {
      const heading = this.heading(title);
      if (more) {
        const button = this.document.createElement("button");
        button.type = "button";
        button.className = "see-all";
        button.textContent = labels.seeAll;
        heading.append(button);
      }
      content.append(heading, ...results.map(fields => this.result(...fields)));
    };
    const { page: info, chapters, matches } = this.query.find(query, this.showAll);
    if (info) {
      section(labels.searchPages, [[labels.page(number(info.page)),
        `${labels.surah(this.locale.surahName(info.surah, info.surahName))}${labels.separator}${labels.juz(number(info.juz))}`,
        "", { page: info.page }]]);
    }
    if (chapters.length) {
      section(labels.searchSurahs, chapters.map(({ number: surah, arabic, page, ayahCount }) => [
        this.locale.surahName(surah, arabic),
        `${labels.page(number(page))}${labels.separator}${labels.ayahs(number(ayahCount), ayahCount >= 3 && ayahCount <= 10)}`,
        "", { page, surah },
      ]));
    }
    if (!matches) content.append(this.note(labels.searchPreparing));
    else if (matches.total) {
      section(`${labels.searchVerses} (${number(matches.total)})`, matches.hits.map(({ surah, ayah }) => [
        this.locale.surahName(surah, this.query.surahName(surah)),
        labels.verse(number(ayah)), this.query.preview(surah, ayah), { surah, ayah },
      ]), !this.showAll && matches.total > matches.hits.length);
    }
    if (!content.hasChildNodes()) content.append(this.note(labels.noResults));
    this.results.replaceChildren(content);
    this.results.scrollTop = 0;
  }
  result(title, subtitle, preview, destination) {
    const row = this.document.createElement("button");
    row.type = "button";
    row.className = "result";
    row.innerHTML = `<span class="result-icon">${this.icons.search}</span><span class="result-text"><b></b><small></small></span><span class="taste" aria-hidden="true"></span><span class="result-go">${this.icons.chevronLeft}</span>`;
    row.querySelector("b").textContent = title;
    row.querySelector("small").textContent = subtitle;
    row.querySelector(".taste").textContent = preview;
    Object.assign(row.dataset, destination);
    return row;
  }
}
