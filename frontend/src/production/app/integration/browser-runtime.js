export function createBrowserClock(window) {
  return {
    now: () => window.Date.now(),
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
    clearTimeout: timer => window.clearTimeout(timer),
    setInterval: (callback, delay) => window.setInterval(callback, delay),
    clearInterval: timer => window.clearInterval(timer),
    requestAnimationFrame: callback => window.requestAnimationFrame(callback),
    cancelAnimationFrame: frame => window.cancelAnimationFrame(frame),
  };
}

export function loadTitleFont(document, FontFace, url) {
  const font = new FontFace("Surah Names", `url(${url})`, { display: "swap" });
  document.fonts.add(font);
  font.load().then(() => document.documentElement.classList.add("titles-ready"), () => {});
}
