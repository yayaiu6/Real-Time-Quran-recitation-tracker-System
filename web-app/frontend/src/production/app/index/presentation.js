export const indexCopy = {
  ar: {
    title: "الفهرس", close: "إغلاق الفهرس", recent: "متابعة القراءة",
    page: "ص", hizb: "الحزب",
  },
  en: {
    title: "Index", close: "Close index", recent: "Continue reading",
    page: "p.", hizb: "Hizb",
  },
};
const numbers = {
  ar: new Intl.NumberFormat("ar-EG", { useGrouping: false }),
  en: new Intl.NumberFormat("en", { useGrouping: false }),
};

export function indexPageLabel(page, language = "ar") {
  if (!Number.isInteger(page) || page < 1 || page > 604) return "";
  const lang = language === "en" ? "en" : "ar";
  return `${indexCopy[lang].page} ${numbers[lang].format(page)}`;
}

export function indexTabForKey(key, current, direction = "rtl", count = 3) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null;
  const delta = (key === "ArrowRight" ? 1 : -1) * (direction === "rtl" ? -1 : 1);
  return (current + delta + count) % count;
}
export { IndexSheet } from "./sheet.js";
