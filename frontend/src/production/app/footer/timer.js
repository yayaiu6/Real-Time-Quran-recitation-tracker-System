export class RecitationTimer {
  #interval = 0;
  #startedAt = 0;

  constructor(clock, { show, draw }) {
    this.clock = clock;
    this.show = show;
    this.draw = draw;
  }

  project(kind) {
    if (kind === "searching" || kind === "following") {
      if (this.#interval) return;
      this.#startedAt = this.clock.now();
      this.#tick();
      this.#interval = this.clock.setInterval(() => this.#tick(), 1000);
      this.show(true);
    } else if (kind !== "preparing") {
      this.stop();
    }
  }

  refresh() { if (this.#interval) this.#tick(); }

  stop() {
    this.clock.clearInterval(this.#interval);
    this.#interval = 0;
    this.show(false);
  }

  #tick() { this.draw(Math.floor((this.clock.now() - this.#startedAt) / 1000)); }
}
