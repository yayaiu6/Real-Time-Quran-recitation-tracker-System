import { RecitationSession } from "./session.js";
import { prepareRecitation } from "./prepare.js";
import { createSessionPolicy } from "./policy.js";
import { createPublicDataLoader, decompressGzip } from "../integration/public-data.js";

// Assemble the session without giving the engine access to DOM or preferences.
// The injected ports retain the alignment binary and reference semantics.
export function makeSessionFactory({ window, config, key, recognition, createCue, clock, report }) {
  const policy = createSessionPolicy();
  const resources = createPublicDataLoader({ fetch: (url, options) => window.fetch(url, options), decompress: decompressGzip });
  return view => new RecitationSession({
    view,
    prepare: (events, signal) => prepareRecitation({
      events, ports: recognition, resources, config, key, policy, signal,
    }),
    startCue: createCue("/audio-cues/recitation-start.mp3"),
    endCue: createCue("/audio-cues/recitation-stop.mp3"),
    clock, report,
  });
}
