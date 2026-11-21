export class SettingsService {
  constructor({ document, locale, signal }) {
    this.document = document;
    this.locale = locale;
    this.dialog = document.getElementById("settings-sheet");
    this.dialog.addEventListener("close", () => document.getElementById("settings").focus(), { signal });
    for (const choice of this.dialog.querySelectorAll("[data-lang]")) {
      choice.addEventListener("click", () => locale.setLanguage(choice.dataset.lang), { signal });
    }
  }
  open() { this.dialog.showModal(); }
  retitle() {
    this.document.getElementById("settings-title").textContent = this.locale.labels().settings;
    this.document.getElementById("lang-label").textContent = this.locale.labels().language;
    for (const choice of this.dialog.querySelectorAll("[data-lang]")) {
      choice.setAttribute("aria-pressed", String(choice.dataset.lang === this.locale.language()));
    }
  }
}
