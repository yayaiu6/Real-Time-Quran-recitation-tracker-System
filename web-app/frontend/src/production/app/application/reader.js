// Coordinates application UI/navigation, not recognition or judging.
export class ReaderCoordinator {
  #textMode = false;
  #hidden = false;
  #chosen = null;

  constructor({ chrome, mushaf, pager, onLocation, onHidden, preferences, reciting, makeText }) {
    this.chrome = chrome;
    this.mushaf = mushaf;
    this.pager = pager;
    this.onLocation = onLocation;
    this.onHidden = onHidden;
    this.preferences = preferences;
    this.reciting = reciting;
    this.makeText = makeText;
    this.text = null;
    this.pages = null;
    if (makeText && preferences.get("view", "mushaf") === "text") void this.setTextMode(true);
  }

  attachPages(pages) {
    this.pages = pages;
    pages.setHidden(this.#hidden);
  }
  get layout() { return this.#textMode ? "text" : "book"; }
  get hidden() { return this.#hidden; }
  setLayout(layout) { this.setTextMode(layout === "text"); }
  pageChanged(page) {
    if (!this.#textMode) this.onLocation(this.mushaf.info(page));
  }
  goTo(page, surah) {
    this.#chosen = surah ? { page, surah } : null;
    this.pager.goTo(page);
    if (this.#textMode && this.text) this.text.open(this.placeOf(page));
  }
  goToAyah(surah, ayah) {
    this.#chosen = null;
    const page = this.mushaf.atlas.pageOf(surah, ayah);
    if (page) this.pager.goTo(page);
    if (this.#textMode && this.text) this.text.open({ surah, ayah });
    else this.pages?.point(surah, ayah);
  }
  place() {
    const place = (this.#textMode && this.text?.topAyah())
      || this.mushaf.firstAyah(this.pager.page);
    return { ...place, page: this.mushaf.atlas.pageOf(place.surah, place.ayah) ?? this.pager.page };
  }
  placeOf(page) {
    const chosen = this.#chosen;
    return chosen?.page === page ? { surah: chosen.surah, ayah: 1 } : this.mushaf.firstAyah(page);
  }
  next() {
    if (this.#textMode && this.text) this.openSurah(this.text.surah + 1);
    else this.pager.next();
  }
  previous() {
    if (this.#textMode && this.text) this.openSurah(this.text.surah - 1);
    else this.pager.previous();
  }
  retitle() {
    this.text?.retitle();
    if (this.#textMode && this.text) {
      const place = this.text.topAyah();
      if (place) this.onLocation(this.mushaf.infoAt(place.surah, place.ayah));
    }
  }
  showBars() { this.chrome.setShown(true); }
  async setTextMode(enabled) {
    if (enabled && !this.makeText) return;
    if (enabled === this.#textMode) return;
    this.#textMode = enabled;
    this.preferences.set("view", enabled ? "text" : "mushaf");
    if (enabled) {
      let text;
      try { text = this.text ??= await this.build(); }
      catch {
        this.#textMode = false;
        this.preferences.set("view", "mushaf");
        return;
      }
      if (this.#textMode) text.show(this.placeOf(this.pager.page), this.reciting());
    } else if (this.text) {
      const place = this.text.topAyah();
      this.text.hide();
      if (place && !this.reciting()) {
        const page = this.mushaf.atlas.pageOf(place.surah, place.ayah);
        if (page) this.pager.goTo(page);
      }
      this.pager.realign();
      this.onLocation(this.mushaf.info(this.pager.page));
    }
  }
  async build() {
    const text = await this.makeText();
    text.setHidden(this.#hidden);
    text.onPlace = place => {
      if (this.#textMode) this.onLocation(this.mushaf.infoAt(place.surah, place.ayah));
    };
    return text;
  }
  openSurah(surah) {
    if (surah < 1 || surah > 114 || !this.text) return;
    this.text.open({ surah, ayah: 1 });
    const page = this.mushaf.atlas.pageOf(surah, 1);
    if (page) this.pager.goTo(page);
  }
  setHidden(hidden) {
    this.#hidden = hidden;
    this.onHidden(hidden);
    this.pages?.setHidden(hidden);
    this.text?.setHidden(hidden);
  }
  toggleHidden() { this.setHidden(!this.#hidden); }
}
