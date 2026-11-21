const samplesPerMs = 16;
const cueTailMs = 120;

// Only samples overlapping locally played cues are zeroed, at 16 kHz.
export class CueMute {
  #interval = { from: 0, until: 0 };

  constructor(now) { this.now = now; }

  extend(duration) {
    const now = this.now();
    const { from, until } = this.#interval;
    this.#interval = {
      from: now > until ? now : from,
      until: Math.max(until, now + duration + cueTailMs),
    };
  }

  endPlayback() {
    const interval = this.#interval;
    interval.until = Math.min(interval.until, this.now());
  }

  apply(samples) {
    const { from, until } = this.#interval;
    if (!until) return;
    const end = this.now(), start = end - samples.length / samplesPerMs;
    if (start >= until) {
      this.#interval = { from: 0, until: 0 };
      return;
    }
    if (end <= from) return;
    const first = Math.max(0, Math.floor((from - start) * samplesPerMs));
    const last = Math.min(samples.length, Math.ceil((until - start) * samplesPerMs));
    if (first < last) samples.fill(0, first, last);
  }
}
