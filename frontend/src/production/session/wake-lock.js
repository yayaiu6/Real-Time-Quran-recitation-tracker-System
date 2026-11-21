export class WakeLock {
  #lock;
  #pending;
  #generation = 0;
  #retryAt = 0;

  constructor({ navigator, now, wanted, log }) {
    Object.assign(this, { navigator, now, wanted, log });
  }

  resetRetry() { this.#retryAt = 0; }

  async request() {
    if (!this.navigator.wakeLock || this.#pending || (this.#lock && !this.#lock.released)) return;
    if (this.now() - this.#retryAt < 30_000) return;
    const generation = this.#generation;
    this.#retryAt = this.now();
    const pending = this.navigator.wakeLock.request("screen");
    this.#pending = pending;
    try {
      const lock = await pending;
      if (generation !== this.#generation) {
        await lock.release();
        return;
      }
      this.#lock = lock;
      const acquired = this.now();
      lock.addEventListener("release", () => {
        this.log("wake lock released by the system");
        if (this.#lock === lock) this.#lock = null;
        if (this.wanted()) {
          if (this.now() - acquired >= 5000) this.resetRetry();
          void this.request();
        }
      }, { once: true });
    } catch {
      // Wake lock is optional and must never affect capture.
    } finally {
      if (this.#pending === pending) this.#pending = null;
    }
  }

  async release() {
    ++this.#generation;
    const lock = this.#lock;
    this.#lock = null;
    this.resetRetry();
    try { await lock?.release(); } catch {}
  }
}
