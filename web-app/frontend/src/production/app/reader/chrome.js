// Owns the reader's chrome visibility and the focusability of hidden bars.
export class ReaderChrome {
  constructor(document, signal) {
    this.root = document.getElementById("app");
    this.bars = ["topbar", "footer"].map(id => document.getElementById(id));
    document.getElementById("reader").addEventListener("click", () => this.setShown(!this.shown), { signal });
    for (const id of ["page-top", "page-bottom"]) {
      document.getElementById(id).addEventListener("click", () => this.setShown(true), { signal });
    }
  }
  get shown() { return !this.root.classList.contains("bare"); }
  setShown(shown) {
    this.root.classList.toggle("bare", !shown);
    for (const bar of this.bars) bar.inert = !shown;
  }
}
