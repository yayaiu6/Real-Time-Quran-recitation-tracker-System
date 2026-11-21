export class IndexSheet {
  constructor({ document, locale, icons, mushaf }) {
    this.document = document;
    this.locale = locale;
    this.icons = icons;
    this.mushaf = mushaf;
    this.dialog = this.node("index-sheet");
    this.list = this.node("index-list");
    this.rail = this.node("juz-rail");
    this.tabs = [...this.dialog.querySelectorAll('button[role="tab"][data-tab]')];
    for (const icon of this.dialog.querySelectorAll("[data-icon]")) icon.innerHTML = icon.dataset.icon === "sort" ? icons.sort : icons.chevronLeft;
  }
  node(id) { return this.document.getElementById(id); }
  retitle() {
    const labels = this.locale.labels();
    this.dialog.setAttribute("aria-label", labels.index);
    this.node("recent-title").textContent = labels.recentTitle;
    this.node("lists-title").textContent = labels.listsTitle;
    for (const tab of this.tabs) {
      tab.innerHTML = tab.dataset.tab === "bookmarks" ? `<span class="tab-icon">${this.icons.bookmark}</span>` : "";
      tab.append(labels[tab.dataset.tab]);
    }
    this.node("sort-label").textContent = labels.sortBy;
  }
  render({ place, tab, descending, rows }) {
    const info = this.mushaf.infoAt(place.surah, place.ayah);
    const labels = this.locale.labels(), number = this.locale.number;
    this.node("recent-ref").textContent = `${number(place.surah)}:${number(place.ayah)}`;
    this.node("recent-name").textContent = this.locale.surahName(place.surah, info.surahName);
    this.node("recent-page").textContent = labels.page(number(place.page));
    for (const button of this.tabs) button.setAttribute("aria-selected", String(button.dataset.tab === tab));
    this.node("sort-value").textContent = descending ? labels.descending : labels.ascending;
    this.list.replaceChildren(...(tab === "surahs" ? this.surahRows(rows) : tab === "parts" ? this.partRows(rows) : this.bookmarkRows(rows)));
    this.list.dataset.tab = tab;
    this.rail.hidden = tab === "bookmarks";
    if (!this.rail.hidden && !this.rail.childElementCount) for (let juz = 1; juz <= 30; juz++) {
      const button = this.document.createElement("button");
      button.type = "button"; button.tabIndex = -1; button.dataset.to = String(juz);
      this.rail.append(button);
    }
    for (const button of this.rail.querySelectorAll("button")) button.textContent = number(Number(button.dataset.to));
  }
  wrap(button) { const item = this.document.createElement("li"); item.append(button); return item; }
  surahRows(sections) {
    const rows = [];
    const labels = this.locale.labels(), number = this.locale.number;
    for (const { juz, chapters } of sections) {
      const heading = this.document.createElement("li");
      heading.className = "juz-heading"; heading.dataset.juz = String(juz);
      heading.textContent = labels.juzTitle(number(juz)); heading.lang = this.locale.language();
      rows.push(heading);
      for (const surah of chapters) {
        const button = this.document.createElement("button");
        button.type = "button"; button.className = "surah-row";
        button.dataset.surah = String(surah.number); button.dataset.page = String(surah.page);
        button.innerHTML = '<span class="surah-no"></span><span class="surah-text"><b></b><small></small><small></small></span><span class="surah-art" aria-hidden="true"></span>';
        button.querySelector(".surah-no").textContent = number(surah.number);
        button.querySelector("b").textContent = this.locale.surahName(surah.number, surah.arabic);
        const [count, place] = button.querySelectorAll("small");
        count.textContent = labels.ayahs(number(surah.ayahCount), surah.ayahCount >= 3 && surah.ayahCount <= 10);
        place.textContent = surah.place === "madinah" ? labels.places.madinah : labels.places.makkah;
        button.querySelector(".surah-art").textContent = String.fromCodePoint(57344 + surah.number);
        rows.push(this.wrap(button));
      }
    }
    return rows;
  }
  partRows(sections) {
    const rows = [], labels = this.locale.labels(), number = this.locale.number;
    for (const { juz, start, expanded, quarters, taste } of sections) {
      const head = this.document.createElement("button");
      head.type = "button"; head.className = "part-head"; head.setAttribute("aria-expanded", String(expanded));
      head.innerHTML = `<span class="part-text"><b></b><small></small></span><span class="taste" aria-hidden="true"></span><span class="part-fold tw:size-4 tw:shrink-0 tw:text-ui-muted tw:transition-transform tw:duration-150 tw:motion-reduce:transition-none">${this.icons.chevronLeft}</span>`;
      head.querySelector("b").textContent = labels.juzTitle(number(juz));
      head.querySelector("small").textContent = this.placeName(start.surah, start.ayah);
      head.querySelector(".taste").textContent = taste;
      head.dataset.part = juz;
      const item = this.wrap(head); item.dataset.juz = String(juz); rows.push(item);
      for (const { quarter, reference, taste } of quarters) {
        const button = this.document.createElement("button");
        button.type = "button"; button.className = "quarter-row";
        Object.assign(button.dataset, { surah: reference.surah, ayah: reference.ayah });
        button.innerHTML = '<span class="hizb"></span><span class="quarter-name"></span><span class="taste" aria-hidden="true"></span>';
        const badge = button.querySelector(".hizb");
        if (quarter % 4 === 0) badge.textContent = number((juz - 1) * 2 + quarter / 4 + 1);
        else badge.classList.add("plain");
        button.querySelector(".quarter-name").textContent = this.placeName(reference.surah, reference.ayah);
        button.querySelector(".taste").textContent = taste;
        rows.push(this.wrap(button));
      }
    }
    return rows;
  }
  bookmarkRows(pages) {
    const labels = this.locale.labels(), number = this.locale.number;
    if (!pages.length) {
      const empty = this.document.createElement("li");
      empty.className = "index-empty"; empty.textContent = labels.noBookmarks;
      return [empty];
    }
    return pages.map(({ page }) => {
      const info = this.mushaf.info(page), button = this.document.createElement("button");
      button.type = "button"; button.className = "bookmark-row"; button.dataset.page = String(page);
      button.innerHTML = `<span class="tab-icon">${this.icons.bookmark}</span><span class="surah-text"><b></b><small></small></span>`;
      button.querySelector("b").textContent = labels.page(number(page));
      button.querySelector("small").textContent = `${labels.surah(this.locale.surahName(info.surah, info.surahName))}${labels.separator}${labels.juz(number(info.juz))}`;
      return this.wrap(button);
    });
  }
  placeName(surah, ayah) { return `${this.locale.surahName(surah, this.mushaf.atlas.surah(surah)?.arabic ?? "")} ${this.locale.number(ayah)}`; }
}
