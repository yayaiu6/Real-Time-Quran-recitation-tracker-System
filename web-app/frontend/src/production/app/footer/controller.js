import { attribute, text } from "../shared/dom.js";
import { footerPresentation, downloadPresentation } from "./presentation.js";

export function createFooterFeedbackRenderer(document) {
  const node = id => document.getElementById(id);
  return {
    phase: kind => { node("footer").dataset.state = kind; },
    heard({ heard, heardVisible }) {
      const target = node("heard");
      if (!target) return;
      target.textContent = heard;
      target.hidden = !heardVisible;
    },
    preparation({ preparing, preparationLabel }) {
      const target = node("prep");
      target.hidden = !preparing;
      if (preparing) target.textContent = preparationLabel;
    },
    timerVisible: visible => { node("timer").hidden = !visible; },
    timerText: value => { node("timer-text").textContent = value; },
  };
}

export function createFooterRenderer(document) {
  const mic = document.getElementById("mic");
  const hide = document.getElementById("hide");
  const label = mic.querySelector("#mic-label");
  const mistakesLabel = document.getElementById("mistakes-label");
  return ({ state, language, modelProgress, modelReady, modelFailed, hiding, mistakes, countText }) => {
    const view = footerPresentation(state, language);
    const download = document.getElementById("model-download");
    if (download) {
      const { visible, fraction } = downloadPresentation({ state, modelProgress, modelReady, modelFailed });
      if (download.hidden === visible) download.hidden = !visible;
      if (visible) {
        const en = language === "en";
        const percent = Math.floor(fraction * 100);
        text(document.getElementById("model-download-title"), en ? "Loading recitation model" : "تحميل نموذج التلاوة");
        text(document.getElementById("model-download-hint"), fraction === 1
          ? (en ? "Download complete. Preparing the model…" : "اكتمل التحميل، جارٍ تجهيز النموذج…")
          : (en ? "First-time setup. Please keep this page open." : "تجهيز أول مرة، اترك الصفحة مفتوحة لحد ما يكتمل."));
        text(document.getElementById("model-download-percent"), new Intl.NumberFormat(en ? "en" : "ar-EG", { style: "percent" }).format(percent / 100));
        attribute(document.getElementById("model-download-track"), "aria-valuenow", percent);
        const fill = document.getElementById("model-download-fill");
        if (fill.style.getPropertyValue("--model-progress") !== String(fraction)) fill.style.setProperty("--model-progress", String(fraction));
      }
    }
    attribute(mic, "aria-label", view.label);
    attribute(mic, "aria-busy", view.busy);
    attribute(mic, "aria-pressed", view.active || view.busy);
    mic.disabled = view.busy;

    text(label, view.label);
    text(mistakesLabel, view.labels.mistakes);
    attribute(document.getElementById("mistakes"), "aria-label",
      mistakes ? `${view.labels.mistakes}: ${countText}` : view.labels.mistakes);
    const hideLabel = hiding ? view.labels.show : view.labels.hide;
    attribute(hide, "aria-label", hideLabel);
    attribute(hide, "title", hideLabel);
    const notice = document.getElementById("notice");
    if (notice) attribute(notice, "title", notice.textContent || "");
  };
}
