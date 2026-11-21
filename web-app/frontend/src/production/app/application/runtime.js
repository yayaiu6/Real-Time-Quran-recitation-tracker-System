import { initialPage } from "./preferences.js";
import { initializeDialogs, labelDialogs, bindPageActions } from "./dialogs.js";
import { ReaderCoordinator } from "./reader.js";
import { ReaderChrome } from "../reader/chrome.js";

import { createPreferences } from "./preferences.js";
import { HeaderView } from "../header/view.js";
import { FooterView } from "../footer/view.js";
import { SettingsService } from "../services/settings.js";
import { LayoutService } from "../services/layout.js";
import { createLocale } from "../services/locale.js";
import { createMessages } from "../services/messages.js";
import { surahNames } from "../services/surah-names.js";
import { IndexFeature } from "../index/service.js";
import { SearchService } from "../search/service.js";
import { MistakeHistory } from "../mistakes/history.js";
import { MistakesFeature } from "../mistakes/service.js";
import { PageFeedback } from "../reader/page-feedback.js";
import { pageWordReference } from "../reader/atlas-location.js";
import { makeSessionFactory } from "../recitation/compose.js";
import { createBrowserClock, loadTitleFont } from "../integration/browser-runtime.js";
import { planCommand, executeEffects } from "./commands.js";
import { mountReaderWheel } from "../navigation/controller.js";

export function startApplicationRuntime(ports) {
  return new ApplicationBootstrap(ports).start();
}

class ApplicationBootstrap {
  constructor(ports) { this.ports = ports; }

  async start() {
    const ui = new UIAdapters(this.ports);
    const { native, signal, report } = this.ports;
    let mushaf;
    try { mushaf = await native.openMushaf(signal); }
    catch (error) {
      if (signal.aborted) { ui.dispose(); return; }
      report.loadError(error);
      ui.loadError();
      return () => ui.dispose();
    }
    if (signal.aborted) {
      mushaf.dispose();
      ui.dispose();
      return;
    }
    return mountFeatures(this.ports, ui, mushaf);
  }
}

class UIAdapters {
  constructor({ document, window, config, icons, colors, titleFontUrl, signal }) {
    const preferences = createPreferences(config.storageNamespace, () => window.localStorage);
    const locale = createLocale({
      document, navigator: window.navigator, preferences, messages: createMessages(config),
      names: surahNames,
    });
    const clock = createBrowserClock(window);
    const services = { document, locale, preferences, icons, clock, signal, dispatch: command => this.dispatch?.(command) };
    const launchSearch = window.location.search;
    for (const [state, color] of Object.entries(colors)) {
      if (color) document.documentElement.style.setProperty(`--v-${state}`, color);
    }
    initializeDialogs(document, icons, signal);
    const header = new HeaderView({ ...services, loadTitleFont: () => loadTitleFont(document, window.FontFace, titleFontUrl) });
    const footer = new FooterView(services);
    const settings = new SettingsService(services);
    const layout = new LayoutService(services);
    this.settings = settings;
    const views = [header, footer, settings, layout];
    this.services = services;
    this.header = header;
    this.footer = footer;
    this.layout = layout;
    this.views = views;
    this.launchSearch = launchSearch;
    this.loadFailed = false;
    const localize = () => {
      const labels = locale.labels();
      document.title = labels.title;
      labelDialogs(document, labels);
      for (const view of views) view.retitle();
      this.pager?.setLabels(page => labels.page(locale.number(page)));
      this.pager?.realign();
      document.getElementById("turn-next").setAttribute("aria-label", labels.nextPage);
      document.getElementById("turn-prev").setAttribute("aria-label", labels.previousPage);
      document.getElementById("loading-text").textContent = this.loadFailed ? labels.loadFailed : labels.loading;
      document.documentElement.style.setProperty("--page-failed", JSON.stringify(labels.pageFailed));
    };
    this.unsubscribeLocale = locale.subscribe(localize);
    localize();
  }

  loadError() {
    const { document, locale } = this.services;
    this.loadFailed = true;
    document.getElementById("loading-text").textContent = locale.labels().loadFailed;
    document.getElementById("loading").classList.add("error");
  }
  dispose() { this.unsubscribeLocale(); }
}

class RecitationFeature {
  constructor({ window, config, key, recognition, createCue, report }, { clock, footer, showBars }) {
    const createSession = makeSessionFactory({ window, config, key, recognition, createCue, clock, report: report.session });
    this.session = createSession({
      state(state) {
        footer.state(state);
        if (state.kind === "failed") showBars();
      },
      progress: fraction => footer.progress(fraction),
      heard: text => footer.heard(text),
      modelReady: info => footer.modelReady(info),
      engineAvailability: state => footer.engineAvailability(state),
      recognitionFrames: (count, speech) => footer.recognitionFrames(count, speech),
      modelFailed: () => footer.modelFailed(),
      position: ref => footer.position(ref),
    });
  }
}

class ReaderFeature extends ReaderCoordinator {
  pageSettled(page, window, document) {
    executeEffects([["header", page], ["preference", "page", page], ["url", page], ["loaded"]], {
      header: value => this.pageChanged(value),
      preference: (key, value) => this.preferences.set(key, value),
      url(value) {
        const url = new URL(window.location.href);
        url.searchParams.set("page", String(value));
        window.history.replaceState(null, "", url);
      },
      loaded: () => { document.getElementById("loading").hidden = true; },
    });
  }
}

function mountFeatures(ports, ui, mushaf) {
  const { document, window, native, optional = {}, colors, signal, icons } = ports;
  const { services, header, footer, layout, views, launchSearch } = ui;
  const { preferences, locale, clock } = services;
  const highlights = native.createHighlights();
  let reader;
  const pager = ui.pager = native.createPager(document.getElementById("pager"), mushaf, highlights, page => {
    reader.pageSettled(page, window, document);
  });
  pager.setLabels(page => locale.labels().page(locale.number(page)));
  const { session: recitation } = new RecitationFeature(ports, { clock, footer, showBars: () => reader.showBars() });
  reader = new ReaderFeature({
    chrome: new ReaderChrome(document, signal), mushaf, pager, preferences,
    onLocation: info => header.show(info),
    onHidden: hidden => footer.eyeOn(hidden),
    reciting: () => recitation.isRunning && recitation.hasPlace,
    makeText: optional.createTextView && (async () => {
      const corpus = await recitation.corpus;
      const text = await optional.createTextView(document.getElementById("text-view"), corpus);
      recitation.addView(text);
      return text;
    }),
  });
  const mistakes = new MistakeHistory();
  recitation.addView(mistakes);
  const log = new MistakesFeature({
    ...services, log: mistakes,
    dispatch,
    reciting: () => recitation.isRunning,
    surahName: surah => locale.surahName(surah, mushaf.atlas.surah(surah)?.arabic ?? ""),
  });
  log.onCount = count => footer.mistakeCount(count);
  const index = new IndexFeature({
    ...services, mushaf, bookmarks: header.bookmarks, place: () => reader.place(),
    location: () => header.info, dispatch,
  });
  const search = new SearchService({ ...services, mushaf, dispatch });
  const effects = {
    "pager-page": (...args) => reader.goTo(...args),
    "pager-ayah": (...args) => reader.goToAyah(...args),
    "pager-next": () => reader.next(),
    "pager-previous": () => reader.previous(),
    "reader-mode": mode => reader.setLayout(mode),
    "reader-hidden": hidden => reader.setHidden(hidden),
    "session-start": () => recitation.start(),
    "session-stop": () => recitation.stop(),
    "dialog-index": () => index.open(),
    "dialog-search": () => search.open(),
    "dialog-layout": () => layout.open(reader.layout),
    "dialog-mistakes": () => log.open(),
    "dialog-settings": () => ui.settings.open(),
    "dialog-close": source => ({ index, search, mistakes: log })[source].close(),
  };
  function dispatch(command) {
    return executeEffects(planCommand(command, {
      active: !signal.aborted, running: recitation.isRunning, canUseText: Boolean(optional.createTextView),
    }), effects);
  }
  ui.dispatch = dispatch;
  footer.controls = {
    microphone: () => ({ type: recitation.isRunning ? "STOP_RECITATION" : "START_RECITATION" }),
    hidden: () => ({ type: "SET_HIDDEN_MODE", hidden: !reader.hidden }),
  };
  views.push(reader, log, index, search);
  for (const view of [reader, log, index, search]) view.retitle();
  let pages;
  recitation.corpus.then(corpus => {
    if (!corpus || signal.aborted) return;
    pages = new PageFeedback({ pager, highlights, corpus, wordReference: pageWordReference, colors, clock });
    recitation.addView(pages);
    reader.attachPages(pages);
    for (const view of [log, index, search]) view.setCorpus(corpus);
  });
  pager.goTo(initialPage(launchSearch, preferences));
  bindPageActions(document, dispatch, icons, signal);
  const unmountWheel = mountReaderWheel(document, { dispatch });
  return () => {
    ui.dispatch = null;
    unmountWheel();
    ui.dispose();
    pages?.dispose();
    pager.dispose();
    mushaf.dispose();
    const stopped = recitation.dispose();
    footer.dispose();
    search.dispose();
    log.dispose();
    return stopped;
  };
}
