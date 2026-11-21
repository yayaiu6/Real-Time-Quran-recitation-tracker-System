import "./production/styles/reader.css";
import "./production/styles/utilities.css";
import { prepareReaderDocument } from "./reader-shell.js";
import { loadRecognitionKey } from "./runtime-configuration.js";
import { product, initializeReaderDocument, mountProductMetadata } from "./production/app/product.js";
import { startApplicationRuntime } from "./production/app/application/runtime.js";
import { mountStartup } from "./production/app/startup/controller.js";
import { readerIcons, verdictColors } from "./production/presentation/icons.js";
import { Mushaf, titleFontUrl } from "./production/reader/mushaf.js";
import { Highlights } from "./production/reader/highlights.js";
import { Pager } from "./production/reader/pager.js";
import { createCueOutput } from "./production/recognition/audio-context.js";
import { captureFromAudioQuery } from "./production/recognition/test-audio.js";
import { TajweedRecognition } from "./production/recognition/model.js";
import { captureMicrophone } from "./production/recognition/microphone.js";
import { LiveSessionHost } from "./production/session/live-host.js";
import { createCorpus } from "./production/quran-preview/corpus.js";
import { createQuranPreview } from "./production/quran-preview/preview.js";

// A glob can resolve to no modules when the optional directory is absent.
const loadTrackingEngine = import.meta.glob("./production/engine/open-tracker.js")["./production/engine/open-tracker.js"];

initializeReaderDocument(document, window);
prepareReaderDocument(document);
const scope = new AbortController();
const disconnectMetadata = mountProductMetadata(document);
const finishStartup = mountStartup(document);
const cueOutput = createCueOutput(window);

function mountReader(key) {
  return startApplicationRuntime({
    document, window, config: product, key, icons: readerIcons, colors: verdictColors, titleFontUrl,
    signal: scope.signal,
    createCue: cueOutput.cue,
    native: {
      openMushaf: signal => Mushaf.open(signal),
      createHighlights: () => new Highlights(),
      createPager: (...args) => new Pager(...args),
    },
    recognition: {
      createRecognition: options => new TajweedRecognition(options, {
        async createClient(clientOptions) {
          const { TajweedClient } = await import("./production/vendor/tajweedformer-3.js");
          return TajweedClient.create(clientOptions);
        },
      }),
      createCorpus,
      createQuranPreview,
      async loadEngine() {
        if (!loadTrackingEngine) return null;
        const { openTracker } = await loadTrackingEngine();
        return { openTracker: inputs => openTracker({ ...inputs, log: message =>
          console.error("[prompter] the engine: " + message.trimEnd()) }) };
      },
      reportEngineUnavailable: error => console.error("[reader] tracking and judging unavailable", error),
      audioCapture: captureFromAudioQuery,
      createHost: options => new LiveSessionHost({
        ...options, capture: options.capture ?? (callbacks => captureMicrophone(callbacks, window)),
        output: cueOutput, browser: window,
      }),
      reportSlow: elapsed => console.warn(`[reader] slow chunk: ${elapsed.toFixed(0)} ms`),
    },
    report: {
      loadError: error => console.error("[reader] the mushaf did not load", error),
      session: {
        readyError: error => console.error("[reader] the recitation engine did not start", error),
        startError: error => console.error("[reader] the engine did not start", error),
        log: message => console.log("[reader] " + message),
      },
    },
  });
}

const reader = loadRecognitionKey((url, options) => window.fetch(url, options), scope.signal)
  .then(key => {
    if (!scope.signal.aborted) return mountReader(key);
  })
  .catch(error => {
    if (scope.signal.aborted) return;
    finishStartup();
    console.error("[reader] startup failed", error);
  });

window.addEventListener("pagehide", event => {
  if (event.persisted) return;
  scope.abort();
  finishStartup();
  disconnectMetadata();
  void reader.then(async dispose => {
    try { await dispose?.(); }
    finally { await cueOutput.close(); }
  });
}, { signal: scope.signal });
