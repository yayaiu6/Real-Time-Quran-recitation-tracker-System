export class LayoutService {
  constructor({ document, locale, icons, clock, signal, dispatch }) {
    this.document = document;
    this.locale = locale;
    this.dialog = document.getElementById("layout-sheet");
    for (const icon of this.dialog.querySelectorAll("[data-icon]")) icon.innerHTML = icons[icon.dataset.icon];
    let closing;
    for (const choice of this.dialog.querySelectorAll("[data-layout]")) choice.addEventListener("click", () => {
      this.mark(choice.dataset.layout);
      dispatch({ type: "SET_READER_MODE", mode: choice.dataset.layout });
      clock.clearTimeout(closing);
      closing = clock.setTimeout(() => this.dialog.close(), 220);
    }, { signal });
    signal?.addEventListener("abort", () => clock.clearTimeout(closing), { once: true });
  }
  open(layout) { this.mark(layout); this.dialog.showModal(); }
  mark(layout) {
    for (const choice of this.dialog.querySelectorAll("[data-layout]")) choice.setAttribute("aria-checked", String(choice.dataset.layout === layout));
  }
  retitle() {
    const keys = { "layout-title": "layoutTitle", "layout-section": "readingLayout", "layout-hint": "readingLayoutHint",
      "layout-book": "layoutBook", "layout-book-detail": "layoutBookDetail", "layout-text": "layoutText", "layout-text-detail": "layoutTextDetail" };
    const labels = this.locale.labels();
    for (const [id, key] of Object.entries(keys)) this.document.getElementById(id).textContent = labels[key];
  }
}
