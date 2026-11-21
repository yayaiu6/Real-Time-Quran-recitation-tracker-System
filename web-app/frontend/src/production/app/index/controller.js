import { attribute, classes, text } from "../shared/dom.js";
import { IndexSheet, indexCopy as copy, indexPageLabel, indexTabForKey } from "./presentation.js";

export function createIndexController(ports, actions) {
  const { document, signal, locale, location } = ports;
  const sheet = new IndexSheet(ports);
  const { dialog, list, rail } = sheet;
  const renderer = createIndexRenderer(document, signal);
  const decorate = () => renderer.render({ location: location(), language: locale.language() });
  dialog.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    const { to, part, page, surah, ayah, tab } = button.dataset;
    if (tab && sheet.tabs.includes(button)) {
      if (actions.select(tab)) list.scrollTop = 0;
    } else if (button.id === "index-sort") actions.sort();
    else if (button.id === "recent") actions.recent();
    else if (rail.contains(button) && to) list.querySelector(`[data-juz="${to}"]`)?.scrollIntoView({ block: "start" });
    else if (list.contains(button) && part) actions.toggle(Number(part));
    else if (list.contains(button) && (page || ayah)) {
      actions.navigate(ayah
        ? { type: "NAVIGATE_AYAH", surah: Number(surah), ayah: Number(ayah), from: "index" }
        : { type: "NAVIGATE_PAGE", page: Number(page), surah: surah ? Number(surah) : undefined, from: "index" });
    }
  }, { signal });
  return {
    isOpen: () => dialog.open,
    render(model) { sheet.render(model); decorate(); },
    retitle: () => sheet.retitle(),
    decorate,
    close: () => dialog.close(),
    open({ surah, juz }) {
      dialog.showModal();
      list.querySelector(surah ? `[data-surah="${surah}"]` : `[data-juz="${juz}"]`)?.scrollIntoView({ block: "center" });
      document.activeElement?.blur();
      renderer.focusCurrent();
    },
  };
}

const svg = paths => `<svg data-index-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const icons = {
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  arrow: svg('<path d="m14 6-6 6 6 6"/>'),
  down: svg('<path d="m6 9 6 6 6-6"/>'),
  sort: svg('<path d="M8 4v16m-3-3 3 3 3-3M16 20V4m-3 3 3-3 3 3"/>'),
  bookmark: svg('<path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1Z"/>'),
};
const rowBase = "tw:relative tw:min-h-[72px] tw:w-full tw:items-center tw:gap-3 tw:rounded-xl tw:border-0 tw:border-b tw:border-slate-200/60 tw:bg-transparent tw:px-3 tw:py-3 tw:text-start tw:text-ui-ink tw:transition-colors tw:duration-150 tw:hover:bg-ui-control tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-ui-accent tw:motion-reduce:transition-none";
const currentRow = "tw:aria-[current=true]:bg-ui-mint/50 tw:aria-[current=true]:text-ui-accent";
const rowArrow = "tw:size-3.5 tw:shrink-0 tw:text-ui-muted/70 tw:ltr:rotate-180";

function icon(element, name) {
  if (element && !element.querySelector("[data-index-icon]")) element.innerHTML = icons[name];
}
function appendArrow(document, row) {
  if (row.querySelector("[data-index-arrow]")) return;
  const arrow = document.createElement("span");
  arrow.dataset.indexArrow = "";
  arrow.className = rowArrow;
  arrow.innerHTML = icons.arrow;
  row.append(arrow);
}

export function createIndexRenderer(document, signal) {
  const dialog = document.getElementById("index-sheet");
  const list = document.getElementById("index-list");
  const tabs = [...dialog.querySelectorAll('button[role="tab"][data-tab]')];
  const window = document.defaultView;

  function decorateSurah(row, location, language) {
    classes(row, `surah-row tw:flex ${rowBase} ${currentRow}`);
    attribute(row, "aria-current", Number(row.dataset.surah) === location?.surah);
    classes(row.querySelector(".surah-no"), "surah-no tw:flex tw:w-6 tw:min-w-6 tw:shrink-0 tw:items-center tw:justify-center tw:text-xs tw:font-normal tw:text-ui-muted/70 tw:tabular-nums");
    classes(row.querySelector(".surah-text"), "surah-text tw:flex tw:min-w-0 tw:flex-1 tw:flex-row tw:flex-wrap tw:items-baseline tw:gap-x-1.5 tw:gap-y-0.5");
    classes(row.querySelector("b"), "tw:w-full tw:truncate tw:text-[15px] tw:leading-6 tw:font-semibold tw:text-inherit");
    const [ayahs, place] = row.querySelectorAll("small");
    classes(place, "tw:order-1 tw:whitespace-nowrap tw:text-[11px] tw:leading-4 tw:text-ui-muted");
    classes(ayahs, "tw:order-2 tw:whitespace-nowrap tw:text-[11px] tw:leading-4 tw:text-ui-muted tw:before:me-1.5 tw:before:content-['·']");
    classes(row.querySelector(".surah-art"), "surah-art tw:hidden");
    let page = row.querySelector("[data-index-page]");
    if (!page) {
      page = document.createElement("span");
      page.dataset.indexPage = "";
      row.append(page);
    }
    classes(page, "tw:shrink-0 tw:text-[11px] tw:font-normal tw:text-ui-muted tw:tabular-nums");
    text(page, indexPageLabel(Number(row.dataset.page), language));
  }

  function decorateParts(language) {
    for (const row of list.querySelectorAll(".part-head")) {
      classes(row, `part-head tw:flex ${rowBase} tw:mt-1 tw:aria-expanded:bg-ui-control`);
      classes(row.querySelector(".part-text"), "part-text tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1");
      classes(row.querySelector("b"), "tw:text-[15px] tw:leading-6 tw:font-semibold tw:text-ui-ink");
      classes(row.querySelector("small"), "tw:truncate tw:text-xs tw:text-ui-muted");
      classes(row.querySelector(".taste"), "taste tw:hidden");
      const fold = row.querySelector(".part-fold");
      icon(fold, "down");
    }
    for (const row of list.querySelectorAll(".quarter-row")) {
      classes(row, `quarter-row ${rowBase} tw:grid tw:min-h-16 tw:grid-cols-[28px_minmax(0,1fr)] tw:gap-x-3 tw:gap-y-1 tw:ps-5`);
      const badge = row.querySelector(".hizb");
      const plain = badge?.classList.contains("plain");
      classes(badge, `hizb ${plain ? "plain tw:bg-transparent tw:after:content-['•']" : "tw:bg-ui-mint"} tw:flex tw:size-7 tw:items-center tw:justify-center tw:rounded-lg tw:text-[11px] tw:font-semibold tw:text-ui-accent tw:tabular-nums tw:before:hidden`);
      if (plain) attribute(badge, "aria-hidden", true);
      else attribute(badge, "aria-label", `${copy[language].hizb} ${badge.textContent}`);
      classes(row.querySelector(".quarter-name"), "quarter-name tw:min-w-0 tw:truncate tw:text-sm tw:font-medium tw:text-ui-ink");
      classes(row.querySelector(".taste"), "taste tw:col-start-2 tw:min-w-0 tw:truncate tw:text-start tw:text-lg tw:leading-7 tw:text-ui-muted");
    }
  }

  function decorateBookmarks(location) {
    for (const row of list.querySelectorAll(".bookmark-row")) {
      classes(row, `bookmark-row tw:flex ${rowBase} ${currentRow}`);
      attribute(row, "aria-current", Number(row.dataset.page) === location?.page);
      const marker = row.querySelector(".tab-icon");
      icon(marker, "bookmark");
      classes(marker, "tab-icon tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-ui-mint/70 tw:p-2 tw:text-ui-accent");
      classes(row.querySelector(".surah-text"), "surah-text tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1");
      classes(row.querySelector("b"), "tw:text-[15px] tw:font-semibold tw:text-ui-ink");
      classes(row.querySelector("small"), "tw:truncate tw:text-xs tw:text-ui-muted");
      appendArrow(document, row);
    }
    const empty = list.querySelector(".index-empty");
    if (empty) {
      classes(empty, "index-empty tw:mx-0 tw:my-4 tw:flex tw:flex-col tw:items-center tw:gap-4 tw:rounded-2xl tw:bg-ui-control/60 tw:px-5 tw:py-8 tw:text-center tw:text-sm tw:leading-7 tw:text-ui-muted");
      if (!empty.querySelector("[data-index-empty]")) {
        const message = empty.textContent;
        const marker = document.createElement("span");
        marker.dataset.indexEmpty = "";
        marker.className = "tw:flex tw:size-12 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-white tw:p-3 tw:text-ui-accent";
        marker.innerHTML = icons.bookmark;
        const paragraph = document.createElement("p");
        paragraph.className = "tw:m-0";
        paragraph.textContent = message;
        empty.replaceChildren(marker, paragraph);
      }
    }
  }

  function render({ location, language }) {
    const labels = copy[language];
    text(document.getElementById("index-title"), labels.title);
    text(document.getElementById("recent-title"), labels.recent);
    attribute(document.getElementById("index-close"), "aria-label", labels.close);
    icon(document.getElementById("index-close"), "close");
    icon(document.getElementById("index-recent-go"), "arrow");
    icon(document.getElementById("index-sort-icon"), "sort");
    attribute(document.getElementById("index-sort"), "aria-label",
      `${document.getElementById("sort-label").textContent}: ${document.getElementById("sort-value").textContent}`);
    for (const tab of tabs) {
      tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
      classes(tab.querySelector(".tab-icon"), "tab-icon tw:hidden");
    }
    const active = tabs.find(tab => tab.getAttribute("aria-selected") === "true");
    if (active) attribute(document.getElementById("index-panel"), "aria-labelledby", active.id);
    for (const heading of list.querySelectorAll(".juz-heading")) classes(heading, "juz-heading tw:hidden");
    for (const row of list.querySelectorAll(".surah-row")) decorateSurah(row, location, language);
    decorateParts(language);
    decorateBookmarks(location);
  }

  function focusCurrent() {
    const current = list.querySelector('[aria-current="true"]') || list.querySelector('.part-head[aria-expanded="true"]');
    current?.scrollIntoView({ block: "center" });
    window.queueMicrotask(() => {
      if (dialog.open && !dialog.contains(document.activeElement)) document.getElementById("index-close").focus({ preventScroll: true });
    });
  }

  document.getElementById("index-tabs").addEventListener("keydown", event => {
    const current = tabs.indexOf(event.target.closest('button[role="tab"][data-tab]'));
    if (current < 0) return;
    const target = indexTabForKey(event.key, current, document.documentElement.dir);
    if (target === null) return;
    event.preventDefault();
    tabs[target].click();
    tabs[target].focus();
  }, { signal });
  dialog.addEventListener("close", () => {
    document.getElementById("title").focus({ preventScroll: true });
  }, { signal });
  return { render, focusCurrent };
}
