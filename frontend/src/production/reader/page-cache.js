export class PageCache {
  #entries = new Map();

  constructor(load, radius) {
    this.load = load;
    this.radius = radius;
  }

  get(number) {
    const existing = this.#entries.get(number);
    if (existing) return existing;
    const entry = this.load(number);
    this.#entries.set(number, entry);
    entry.catch(() => {
      if (this.#entries.get(number) === entry) this.#entries.delete(number);
    });
    return entry;
  }

  keepNear(number) {
    for (const [page, entry] of this.#entries) {
      if (Math.abs(page - number) <= this.radius) continue;
      this.#entries.delete(page);
      void entry.then(value => value.free(), () => {});
    }
  }

  clear() { this.#entries.clear(); }
}
