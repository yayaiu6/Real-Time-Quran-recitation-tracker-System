// Owns the bounded canvas cache, sizing, paint order, and asynchronous draw
// invalidation. A disposed or recycled canvas cannot be mounted by a late fetch.
export class PageSurfaces {
  #mounted = new Map();
  #repaintFrame = 0;
  #unsubscribe;

  constructor({ slides, mushaf, highlights, createRenderer, window }) {
    Object.assign(this, { slides, mushaf, highlights, createRenderer, window });
    this.#unsubscribe = highlights.subscribe(() => this.repaintSoon());
  }

  keepNear(page, radius) {
    for (const number of this.#mounted.keys()) {
      if (Math.abs(number - page) > radius) this.release(number);
    }
  }

  release(number) {
    const surface = this.#mounted.get(number);
    if (!surface) return;
    surface.canvas.width = surface.canvas.height = 0;
    surface.canvas.remove();
    this.#mounted.delete(number);
  }

  resize() {
    for (const number of this.#mounted.keys()) void this.draw(number);
  }

  repaintSoon() {
    this.#repaintFrame ||= this.window.requestAnimationFrame(() => {
      this.#repaintFrame = 0;
      for (const surface of this.#mounted.values()) this.paint(surface);
    });
  }

  paint({ page, view, renderer, dpr }) {
    if (!page || !view) return;
    this.highlights.apply(page);
    this.mushaf.paint(page, renderer, view, dpr);
    this.highlights.overlay(page, renderer.ctx, view, dpr);
  }

  async draw(number) {
    const slide = this.slides[number - 1];
    if (!slide) return;
    const width = slide.clientWidth, height = slide.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(Math.max(2, this.window.devicePixelRatio || 1), 3);
    const key = `${width}x${height}@${dpr}`;
    let surface = this.#mounted.get(number);
    if (surface?.key === key) return;
    if (!surface) {
      const canvas = slide.ownerDocument.createElement("canvas");
      surface = { canvas, renderer: this.createRenderer(canvas) };
      this.#mounted.set(number, surface);
    }
    let page;
    try { page = await this.mushaf.page(number); }
    catch (error) {
      if (this.#mounted.get(number) !== surface) return;
      console.error(`[reader] page ${number} did not load`, error);
      slide.classList.add("failed");
      this.release(number);
      return;
    }
    if (this.#mounted.get(number) !== surface) return;
    const { canvas, renderer } = surface;
    const drawHeight = this.mushaf.heightFor(page, width, height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(drawHeight * dpr);
    canvas.style.height = `${drawHeight}px`;
    Object.assign(surface, { page, dpr, view: this.mushaf.layout(page, renderer, width, drawHeight), key });
    this.paint(surface);
    slide.classList.remove("failed");
    if (!canvas.isConnected) slide.append(canvas);
  }

  dispose() {
    this.#unsubscribe();
    this.window.cancelAnimationFrame(this.#repaintFrame);
    for (const number of this.#mounted.keys()) this.release(number);
  }
}
