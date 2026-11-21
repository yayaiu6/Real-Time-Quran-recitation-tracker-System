import { attribute, text } from "../shared/dom.js";
import { headerPresentation } from "./presentation.js";

const svg = content => `<svg data-header-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const icons = {
  search: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'),
  settings: svg('<path d="m9.5 3-.7 2.5-2.2 1.3-2.5-.6-2 3.5 1.8 1.9v2.8l-1.8 1.9 2 3.5 2.5-.6 2.2 1.3.7 2.5h5l.7-2.5 2.2-1.3 2.5.6 2-3.5-1.8-1.9v-2.8l1.8-1.9-2-3.5-2.5.6-2.2-1.3L14.5 3z" transform="translate(0 -1) scale(1 .96)"/><circle cx="12" cy="12" r="3"/>'),
  bookmark: svg('<path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1Z"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'),
  arrow: svg('<path d="m14 6-6 6 6 6"/>'),
};
function icon(button, name) {
  if (button && !button.querySelector("[data-header-icon]")) button.innerHTML = icons[name];
}

export function createHeaderRenderer(document) {
  return (location, language) => {
    const view = headerPresentation(location, language);
    for (const id of ["search", "settings", "bookmark"]) icon(document.getElementById(id), id);
    text(document.getElementById("header-index-action"), view.copy.index);
    if (view.page) {
      text(document.getElementById("header-page"), view.page);
      text(document.getElementById("header-divisions"), view.divisions);
      text(document.getElementById("header-divisions-compact"), view.compact);
    }
    const name = document.getElementById("surah-name");
    attribute(document.getElementById("title"), "title", name?.textContent || "");
    const track = document.getElementById("header-position");
    const fill = document.getElementById("header-position-fill");
    if (track && fill) {
      if (track.hidden !== !view.position) track.hidden = !view.position;
      attribute(track, "aria-label", view.copy.position);
      if (view.position) {
        attribute(track, "aria-valuenow", view.position.current);
        attribute(track, "aria-valuemax", view.position.total);
        attribute(track, "aria-valuetext", view.positionText);
        attribute(track, "title", view.positionText);
        const fraction = String(view.position.fraction);
        if (fill.style.getPropertyValue("--header-position") !== fraction) {
          fill.style.setProperty("--header-position", fraction);
        }
      }
    }
  };
}
