export class MistakeSheet {
  constructor({ document, locale, icons }) {
    this.document = document;
    this.locale = locale;
    this.dialog = this.node("mistakes-sheet");
    this.list = this.node("mistakes-list");
    this.node("notice-icon").innerHTML = icons.info;
    this.targets = new WeakMap();
  }
  node(id) { return this.document.getElementById(id); }
  open() { this.dialog.showModal(); this.list.scrollTop = 0; }
  close() { this.dialog.close(); }
  retitle() {
    this.node("mistakes-title").textContent = this.locale.labels().mistakesTitle;
    this.node("mistakes-notice").textContent = this.locale.labels().feedbackNotice;
  }
  render(model, corpus) {
    this.corpus = corpus;
    this.summary(model);
    this.list.replaceChildren(...(model.cards.length ? model.cards.map(card => this.card(card)) : [this.empty(model.empty)]));
  }
  empty([titleText, hintText]) {
    const empty = this.document.createElement("li");
    empty.className = "mistakes-empty";
    const title = this.document.createElement("b");
    const hint = this.document.createElement("span");
    title.textContent = titleText;
    hint.textContent = hintText;
    empty.append(title, hint);
    return empty;
  }
  summary({ range, chips }) {
    const summary = this.node("mistakes-range"), counts = this.node("mistakes-counts");
    if (range === null) { summary.hidden = true; counts.hidden = true; return; }
    summary.hidden = false;
    summary.textContent = range;
    counts.hidden = false;
    counts.replaceChildren(...chips.map(({ tone, text }) => {
      const chip = this.document.createElement("span");
      chip.className = "count-chip"; chip.dataset.tone = tone;
      chip.textContent = text;
      return chip;
    }));
  }
  card({ group, target, tone, title, reference: place }) {
    const item = this.document.createElement("li"), button = this.document.createElement("button");
    const labels = this.locale.labels();
    button.type = "button"; button.className = "mistake";
    button.dataset.review = JSON.stringify({
      surah: group.surah, ayah: group.ayah, words: group.words, kind: group.kind, corrected: group.corrected, tajweed: group.tajweed,
    });
    button.dataset.tone = tone;
    button.setAttribute("aria-label", `${place} — ${title}`);
    const head = this.document.createElement("span");
    head.className = "mistake-head";
    const reference = this.document.createElement("span"), kind = this.document.createElement("span");
    reference.className = "mistake-ref"; reference.textContent = place;
    kind.className = "mistake-kind"; kind.textContent = title;
    head.append(reference, kind);
    if (group.corrected) {
      const corrected = this.document.createElement("span");
      corrected.className = "mistake-corrected"; corrected.textContent = labels.corrected; head.append(corrected);
    }
    const heard = group.kind === "tajweed" ? this.tajweedRecited(group.tajweed)
      : group.detail ? this.soundRecited(group.detail, group, this.corpus) : null;
    const box = this.document.createElement("span"), ayah = this.document.createElement("span");
    box.className = "mistake-box"; ayah.className = "mistake-ayah";
    const first = this.corpus.ayahFirstWord(group.surah, group.ayah);
    const end = first + this.corpus.ayahWordCount(group.surah, group.ayah);
    const previewStart = Math.max(first, group.words[0] - 5), previewEnd = Math.min(end, group.words.at(-1) + 6);
    if (previewStart > first) ayah.append("… ");
    for (let index = previewStart; index < previewEnd; index++) {
      const word = this.document.createElement("span");
      word.textContent = this.corpus.displayWord(index);
      if (group.words.includes(index)) word.className = heard ? "expected-word" : "mistaken";
      ayah.append(word, " ");
    }
    if (previewEnd < end) ayah.append("…");
    if (heard) {
      box.append(this.comparisonRow(labels.expected, ayah), this.comparisonRow(labels.recited, heard));
      box.classList.add("two-rows");
    } else box.append(ayah);
    button.append(head, box);
    this.targets.set(button, target);
    item.append(button);
    return item;
  }
  sound(text, kind) {
    const sound = this.document.createElement("bdi");
    sound.className = `sound ${kind}`; sound.lang = "ar"; sound.textContent = text;
    return sound;
  }
  soundRecited(detail, group, corpus) {
    let heard = (detail.heard ?? "").trim();
    const expected = (detail.expected ?? "").trim();
    let fallback = false;
    if (!heard && group.words?.length) {
      heard = (corpus.plainWord(group.words[0]) ?? "").trim();
      fallback = heard.length > 0;
    }
    if (!heard && !expected) return null;
    const sounds = this.document.createElement("span");
    sounds.className = "mistake-sounds";
    if (heard) sounds.append(this.sound(heard, "heard"));
    if (!fallback && heard && expected && heard !== expected) sounds.append(this.locale.labels().insteadOf, this.sound(expected, "right"));
    if (!heard && expected) sounds.append(this.sound(expected, "right"));
    return sounds;
  }
  tajweedRecited(rules) {
    if (!rules.length) return null;
    const detail = this.document.createElement("span"), labels = this.locale.labels();
    detail.className = "mistake-detail";
    detail.textContent = rules.map(rule => rule.kind === "qalqalah" ? labels.qalqalahMissed
      : labels.harakat(this.locale.number(rule.heard), this.locale.number(rule.required))).join(" · ");
    return detail;
  }
  comparisonRow(label, content) {
    const row = this.document.createElement("span"), title = this.document.createElement("span");
    row.className = "mistake-row"; title.className = "mistake-label"; title.textContent = label;
    row.append(title, content);
    return row;
  }
}
