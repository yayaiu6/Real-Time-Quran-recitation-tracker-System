// Preparation owns partially opened resources until it returns a complete host.
// Corpus consumers need not wait for the recognition model or the WASM.
export async function prepareRecitation({ events, ports, resources, config, key, policy, signal }) {
  signal.throwIfAborted();
  let host, judge;
  const decoder = ports.createRecognition({
    key, appVersion: `${config.id}-${config.version}`,
    onFrames(primary, secondary, count, speech, submissionElapsedMs, detail) {
      if (submissionElapsedMs > 480) ports.reportSlow(submissionElapsedMs);
      host?.onFrames(primary, secondary, count, speech, detail);
    },
    onProgress: (loaded, total) => events.progress(total ? loaded / total : 0),
    onError: error => host?.onDecoderError(error),
  });
  const closeDecoder = () => { void decoder.close(); };
  signal.addEventListener("abort", closeDecoder, { once: true });
  const modelReady = decoder.init();
  void modelReady.catch(() => { if (!signal.aborted) events.modelFailed(); });
  try {
    let corpus;
    const corpusReady = resources.loadQuran(signal).then(quran => {
      signal.throwIfAborted();
      corpus = ports.createCorpus(quran);
      events.corpus(corpus);
      return corpus;
    });
    // Observe rejection even if the optional module load fails first.
    void corpusReady.catch(() => {});
    try {
      const engine = ports.loadEngine ? await ports.loadEngine() : ports;
      signal.throwIfAborted();
      if (engine) {
        const [loadedCorpus, [binary, words]] = await Promise.all([corpusReady, resources.loadAlignmentAssets(signal)]);
        signal.throwIfAborted();
        judge = await engine.openTracker({ binary, words, corpus: loadedCorpus });
      }
    } catch (error) {
      signal.throwIfAborted();
      if (!ports.reportEngineUnavailable) throw error;
      ports.reportEngineUnavailable(error);
    }
    events.engineAvailability?.(judge ? "ENGINE_AVAILABLE" : "ENGINE_UNAVAILABLE");
    if (!judge) await corpusReady.catch(error => {
      signal.throwIfAborted();
      ports.reportEngineUnavailable?.(error);
    });
    await modelReady;
    signal.throwIfAborted();
    const capture = await ports.audioCapture(signal);
    signal.throwIfAborted();
    const preview = !judge && corpus ? ports.createQuranPreview?.(corpus) : undefined;
    host = ports.createHost({ judge, preview, decoder, view: events.host, policy, capture });
    events.modelReady(decoder.modelInfo);
    return { host, autoStart: Boolean(capture) };
  } catch (error) {
    if (host) await host.dispose();
    else {
      closeDecoder();
      judge?.dispose();
    }
    throw error;
  } finally {
    signal.removeEventListener("abort", closeDecoder);
  }
}
