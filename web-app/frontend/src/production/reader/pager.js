import { CanvasRenderer } from "../vendor/qvp.js";
import { PageSurfaces } from "./surfaces.js";

const pages = 604;
const mountRadius = 1;
const prefetchRadius = 3;
const repeatFollowMs = 700;
const clampPage = page => Math.min(Math.max(page, 1), pages);

// Owns page position and gestures' scroll target, not canvas rendering or data.
export class Pager {
  #current = 0;
  #frame = 0;
  #heading = 0;
  #headingUntil = 0;
  #navigationGeneration = 0;
  #scope;

  constructor(root, mushaf, highlights, onPage) {
    this.root = root;
    this.window = root.ownerDocument.defaultView;
    this.mushaf = mushaf;
    this.onPage = onPage;
    this.slides = [...root.querySelectorAll(":scope > .slide")];
    this.surfaces = new PageSurfaces({
      slides: this.slides, mushaf, highlights, createRenderer: canvas => new CanvasRenderer(canvas), window: this.window,
    });
    this.#scope = new this.window.AbortController();
    root.addEventListener("scroll", () => this.schedule(), { passive: true, signal: this.#scope.signal });
    this.resize = new this.window.ResizeObserver(() => this.resized());
    this.resize.observe(root);
  }

  get page() { return this.#current; }
  get slideWidth() { return this.slides[0].getBoundingClientRect().width || this.root.clientWidth; }
  setLabels(label) { this.slides.forEach((slide, i) => slide.setAttribute("aria-label", label(i + 1))); }

  goTo(value, smooth = false) {
    this.#navigationGeneration++;
    this.#scrollTo(value, smooth);
  }

  #scrollTo(value, smooth) {
    const page = clampPage(Math.round(value));
    this.root.scrollTo({ left: this.offsetOf(page), behavior: smooth ? "smooth" : "instant" });
    if (!smooth) this.settle(page);
  }

  realign() {
    if (this.#current) this.root.scrollTo({ left: this.offsetOf(this.#current), behavior: "instant" });
  }

  offsetOf(page) {
    const slide = this.slides[page - 1].getBoundingClientRect();
    return this.root.scrollLeft + (slide.right - this.root.getBoundingClientRect().right);
  }

  next() { this.goTo(this.#current + 1, true); }
  previous() { this.goTo(this.#current - 1, true); }

  async follow(surah, ayah, word) {
    const generation = this.#navigationGeneration;
    let page;
    try { page = await this.mushaf.pageOfWord(surah, ayah, word); }
    catch { return; }
    if (generation !== this.#navigationGeneration || this.#scope.signal.aborted || !page || page === this.#current) return;
    const now = this.window.performance.now();
    if (page === this.#heading && now < this.#headingUntil) return;
    this.#heading = page;
    this.#headingUntil = now + repeatFollowMs;
    this.#scrollTo(page, Math.abs(page - this.#current) === 1);
  }

  visiblePage() {
    const rect = this.root.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return 0;
    const element = this.root.ownerDocument.elementFromPoint(rect.right - 3, rect.top + rect.height / 2);
    const slide = element?.closest(".slide");
    if (slide && this.root.contains(slide)) {
      const page = Number(slide.dataset.page);
      if (page >= 1 && page <= pages) return page;
    }
    const width = this.slideWidth;
    return width > 0 ? clampPage(Math.round(Math.abs(this.root.scrollLeft) / width) + 1) : 0;
  }

  schedule() {
    this.#frame ||= this.window.requestAnimationFrame(() => {
      this.#frame = 0;
      const page = this.visiblePage();
      if (page) this.settle(page);
    });
  }

  settle(value) {
    const page = clampPage(value);
    this.onPage(page);
    if (page === this.#current) return;
    this.#current = page;
    this.surfaces.keepNear(page, mountRadius);
    this.mushaf.keepNear(page);
    for (let nearby = Math.max(1, page - prefetchRadius); nearby <= Math.min(pages, page + prefetchRadius); nearby++) {
      this.mushaf.page(nearby).catch(() => {});
    }
    void this.surfaces.draw(page);
    for (let distance = 1; distance <= mountRadius; distance++) {
      void this.surfaces.draw(page - distance);
      void this.surfaces.draw(page + distance);
    }
  }

  resized() {
    this.realign();
    if (this.#current) this.onPage(this.#current);
    this.surfaces.resize();
  }

  dispose() {
    this.#scope.abort();
    this.window.cancelAnimationFrame(this.#frame);
    this.resize.disconnect();
    this.surfaces.dispose();
  }
}
