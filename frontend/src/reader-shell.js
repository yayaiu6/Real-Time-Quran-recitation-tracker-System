export function prepareReaderDocument(document) {
  const pager = document.getElementById("pager");
  const slides = document.createDocumentFragment();
  const number = new Intl.NumberFormat("ar", { useGrouping: false, numberingSystem: "arab" });
  for (let page = 1; page <= 604; page++) {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.dataset.page = String(page);
    slide.setAttribute("role", "img");
    slide.setAttribute("aria-label", `صفحة ${number.format(page)}`);
    slides.append(slide);
  }
  pager.replaceChildren(slides);
}
