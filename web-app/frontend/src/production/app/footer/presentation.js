const copy = {
  ar: {
    start: "ابدأ التلاوة", stop: "إيقاف التلاوة",
    preparing: "جارٍ تجهيز التلاوة", mistakes: "الأخطاء",
    hide: "إخفاء ما لم يُتلَ", show: "إظهار ما لم يُتلَ",
  },
  en: {
    start: "Start reciting", stop: "Stop reciting",
    preparing: "Preparing recitation", mistakes: "Mistakes",
    hide: "Hide what is not yet recited", show: "Show what is not yet recited",
  },
};

export function footerPresentation(state, language = "ar") {
  const labels = copy[language === "en" ? "en" : "ar"];
  const busy = state === "preparing";
  const active = state === "searching" || state === "following";
  return { busy, active, label: busy ? labels.preparing : active ? labels.stop : labels.start, labels };
}

export function downloadPresentation({ modelProgress: progress, modelReady, modelFailed, state }) {
  return {
    visible: Number.isFinite(progress) && !modelReady && !modelFailed && state !== "failed",
    fraction: Math.max(0, Math.min(1, progress)),
  };
}

export function projectFooterFeedback({ kind, heard, fraction }, labels, number) {
  const preparing = kind === "preparing";
  return {
    heard,
    heardVisible: kind === "searching" && heard.length > 0,
    preparing,
    preparationLabel: !preparing ? "" : fraction > 0 && fraction < 1
      ? labels.downloading(number(Math.round(fraction * 100))) : labels.preparing,
  };
}
