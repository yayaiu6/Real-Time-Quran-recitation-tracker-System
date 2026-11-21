import { IndexSelection, indexRows } from "./model.js";
import { createIndexController } from "./controller.js";

export class IndexFeature {
  constructor(ports) {
    this.ports = ports;
    this.selection = new IndexSelection();
    this.controller = createIndexController(ports, {
      select: tab => {
        if (!this.selection.select(tab)) return false;
        this.render();
        return true;
      },
      sort: () => { this.selection.sort(); this.render(); },
      toggle: juz => { this.selection.toggle(juz); this.render(); },
      navigate: command => ports.dispatch(command),
      recent: () => {
        const { surah, ayah } = ports.place();
        ports.dispatch({ type: "NAVIGATE_AYAH", surah, ayah, from: "index" });
      },
    });
  }

  setCorpus(corpus) {
    this.corpus = corpus;
    if (this.controller.isOpen() && this.selection.tab === "parts") this.render();
  }

  open() {
    const place = this.ports.place();
    const juz = this.ports.mushaf.atlas.juzOf(place.surah, place.ayah) ?? 1;
    this.selection.reveal(juz);
    this.render();
    this.controller.open(this.selection.tab === "surahs" ? { surah: place.surah } : { juz });
  }

  close() { this.controller.close(); }

  retitle() {
    this.controller.retitle();
    if (this.controller.isOpen()) this.render();
    else this.controller.decorate();
  }

  render() {
    const { mushaf, bookmarks, place } = this.ports;
    const { tab, descending } = this.selection;
    this.controller.render({ place: place(), tab, descending, rows: indexRows(mushaf.atlas, bookmarks, this.selection, this.corpus) });
  }
}
