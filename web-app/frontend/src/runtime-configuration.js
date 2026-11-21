export async function loadRecognitionKey(fetchConfig = fetch, signal) {
  let key = "";
  const request = new AbortController();
  const cancel = () => request.abort(signal.reason);
  if (signal?.aborted) return key;
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => request.abort(), 8000);
  try {
    const response = await fetchConfig("/api/config", { cache: "no-store", signal: request.signal });
    if (response.ok) {
      const config = await response.json();
      request.signal.throwIfAborted();
      if (typeof config.web_key === "string" && /^qlk_v1_[\w-]+$/.test(config.web_key.trim())) key = config.web_key.trim();
    }
  } catch { /* Reading still works; the session reports unavailable recognition. */ }
  finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
  return key;
}
