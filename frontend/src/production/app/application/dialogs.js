export function initializeDialogs(document, icons, signal) {
  for (const dialog of document.querySelectorAll("dialog")) {
    const isPage = dialog.classList.contains("page-dialog");
    for (const close of dialog.querySelectorAll("[data-close]")) {
      close.innerHTML = isPage ? icons.chevronRight : icons.close;
      close.addEventListener("click", () => dialog.close(), { signal });
    }
    if (!isPage) dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    }, { signal });
  }
}

export function labelDialogs(document, labels) {
  for (const dialog of document.querySelectorAll("dialog")) {
    const label = dialog.classList.contains("page-dialog") ? labels.back : labels.close;
    for (const close of dialog.querySelectorAll("[data-close]")) close.setAttribute("aria-label", label);
  }
}

export function bindPageActions(document, dispatch, icons, signal) {
  const next = document.getElementById("turn-next");
  const previous = document.getElementById("turn-prev");
  next.innerHTML = icons.chevronLeft;
  previous.innerHTML = icons.chevronRight;
  const nextPage = () => dispatch({ type: "NEXT_PAGE" });
  const previousPage = () => dispatch({ type: "PREVIOUS_PAGE" });
  next.addEventListener("click", nextPage, { signal });
  previous.addEventListener("click", previousPage, { signal });
  document.addEventListener("keydown", event => {
    if (document.querySelector("dialog[open]") || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "ArrowLeft") nextPage();
    else if (event.key === "ArrowRight") previousPage();
    else return;
    event.preventDefault();
  }, { signal });
}
