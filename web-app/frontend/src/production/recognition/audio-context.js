import { createCueConstructor } from "../app/audio/cue.js";

// Cue and optional word playback share one output context per reader.
// This is separate from the capture graph, and only armed by a take.
export function createCueOutput(browser) {
  let context;
  const output = {
    ensure() {
      if (context) return;
      try { context = new browser.AudioContext(); }
      catch (error) { console.warn("[prompter] no audio context — the cue and word audio are off:", error); }
    },
    context: () => context,
    ready() {
      if (!context) return false;
      if (context.state === "running") return true;
      output.resume();
      return false;
    },
    resume() {
      if (context && context.state !== "running") void context.resume().catch(() => {});
    },
    async close() {
      const previous = context;
      context = undefined;
      try { await previous?.close(); } catch {}
    },
  };
  const Cue = createCueConstructor({
    audio: output, fetch: url => browser.fetch(url), now: Date.now,
    warn: (url, error) => console.warn(`[prompter] mistake cue unavailable (${url}):`, error),
  });
  return Object.assign(output, { cue: url => new Cue(url) });
}
