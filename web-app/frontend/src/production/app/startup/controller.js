// A one-time presentation gate, independent of model downloads and microphone.
export function startupReady(document) {
  const fontsReady = !document.fonts || document.fonts.status === "loaded";
  return Boolean(fontsReady
    && document.getElementById("topbar")?.dataset.location
    && document.querySelector("#search [data-header-icon]")
    && document.querySelector("#settings [data-header-icon]")
    && document.querySelector("#mic [data-control-icon]")
    && document.getElementById("loading")?.hidden);
}

export function mountStartup(document) {
  const window = document.defaultView;
  const root = document.documentElement;
  if (!root.hasAttribute("data-ui-boot")) return () => {};
  const app = document.getElementById("app");
  const started = window.performance.now();
  if (app) app.inert = true;
  const label = document.getElementById("startup-label");
  if (label) label.textContent = root.lang === "en" ? "Preparing the reader" : "جارٍ تجهيز الواجهة";
  let done = false;
  let poll = 0;
  function finish() {
    if (done) return;
    done = true;
    window.clearInterval(poll);
    if (app) app.inert = false;
    delete root.dataset.uiBoot;
  }
  function tick() {
    if (done) return;
    if (!root.hasAttribute("data-ui-boot")) return finish();
    // Native reader errors and a hard deadline always reveal the real UI.
    if (document.getElementById("loading")?.classList.contains("error")) return finish();
    if (startupReady(document)) return finish();
    if (window.performance.now() - started > 12000) return finish();
  }
  poll = window.setInterval(tick, 120);
  tick();
  return finish;
}
