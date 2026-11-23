// QVP web wrapper — the reference thin wrapper over the C ABI (qvp_ffi.wasm).
// Host renderer: Canvas2D. Everything that decides (hit-testing, layout, styles,
// highlights, masks, search, text) lives in the engine; this file only marshals
// and draws. API shape is mirrored by the Kotlin, Dart and React Native wrappers.
(function (global) {
  'use strict';

  /** The absent index of the C ABI (QVP_NONE). */
  const NONE = 0xffffffff;
  const ORNAMENT_KIND = ['ayah_mark', 'surah_header', 'page_frame'];
  const LINEAGE = ['scan', 'font'];
  /** the tallest canvas a browser reliably makes, in device px */
  const MAX_CANVAS_PX = 16384;
// the reader's zoom control: what a pinch does to the page
const ZOOM_MODE = { stepped: 0, continuous: 1, magnify: 2 };
const ZOOM_MODE_NAME = ['stepped', 'continuous', 'magnify'];
  /** The defaults every wrapper shares (QVP_DEFAULT_* in qvp.h; the parity check compares them). */
  const DEFAULTS = { INK: 0x231f20ff, HIGHLIGHT_INK: 0x1a73e8ff, HIGHLIGHT_BAND: 0xd6a3264d, HIGHLIGHT_PAD_X: 1.2, HIGHLIGHT_PAD_Y: 0, HIGHLIGHT_SEAM: 0.25,
    SELECTION_BAND: 0x2d6fd640, SELECTION_PAD_X: 0.6, GAP_BIAS: 0.6, TAP_DISTANCE: 6, GRID_LINES: 15, ASPECT_SLACK: 1.15, MASK_BLOCK: 0xd9d4c8ff, MASK_PAD: 0.6, MASK_RADIUS: 0.8,
    REVEAL_LIT: 1, REVEAL_GREY: 0xc9c4b8ff, CROP_PAD: 2, AYAH_MARK_SCALE_SCAN: 1.5,
    MIN_ZOOM: 0.5, MAX_ZOOM: 12, ZOOMED_THRESHOLD: 1.02, SWIPE_AXIS_RATIO: 1.5, SWIPE_DISTANCE: 40, SWIPE_VELOCITY: 500,
    ZOOM_SNAP_HYSTERESIS: 0.03, ZOOM_QUANTUM: 0.01, REFLOW_RELAX: 0.5, REFLOW_MAX_STRETCH: 2, MAX_INK_HEIGHT: 4096 };
  /** The path kinds (QVP_KIND_*): what a path draws. */
  const KIND = { BODY: 0, MARK: 1, AYAH_NUMBER: 2, AYAH_MARK_ORNAMENT: 3, HEADER_INK: 4, ORNAMENT: 5, PAGE_NUMBER: 6, RUNNING_HEAD: 7, OTHER: 255 };
  /** The mark families (QVP_FAMILY_*) that a theme colours as one. */
  const FAMILY = { NONE: 0, DIACRITIC: 1, TANWIN: 2, DOTS: 3, WAQF: 4, SIFR: 5, SAJDAH: 6, READING_SIGN: 7 };
  /** The mark categories (QVP_CATEGORY_*). `engine.markCategory(mark)` gives a mark's. */
  const CATEGORY = { NONE: 0, HARAKAH: 1, TANWIN: 2, LETTER_DOT: 3, ORTHOGRAPHIC: 4, DABT: 5, WAQF: 6, READING_SIGN: 7, STANDALONE: 8 };
  /** The decoration kinds (QVP_DECORATION_*): the page's ornaments and furniture. */
  const DECORATION = { AYAH_MARK: 0, SURAH_NAME: 1, BASMALAH: 2, DIVISION_MARK: 3, SAJDAH_MARK: 4, PAGE_NUMBER: 5, RUNNING_HEAD: 6, OTHER: 255 };
  /** The text forms (QVP_FORM_*). Every form but `rasm_uthmani` needs the words sidecar. */
  const FORM = { rasm_uthmani: 0, rasm_imlai: 1, qpc: 2, rasm: 3, search: 4 };
  /** The style layers (QVP_LAYER_*). A rule on a higher layer wins over one below it. */
  const LAYER = { BASE: 0, THEME: 10, HIGHLIGHT: 50, SELECTION: 60, TOP: 100 };
  /** The engine's name tables (QVP_NAMES_*), by key. The names come from the engine when it is initialised. */
  const NAMES_TABLE = { mark: 0, kind: 1, family: 2, category: 3, decoration: 4, division: 5, place: 6 };
  let NAMES = null;
  const names = table => { if (!NAMES) throw new Error('QvpEngine.init() first: names come from the engine'); return NAMES[table]; };
  const idOf = (table, v) => { if (typeof v !== 'string') return v; const i = names(table).indexOf(v); return i < 0 ? 255 : i; };

  // 0..1 → 0..255, rounded to the nearest step, as in every wrapper. NaN and out-of-range values
  // clamp first, so a bad alpha is 0 or 255.
  const alpha8 = a => Math.round((Number.isNaN(a) ? 0 : Math.min(Math.max(a, 0), 1)) * 255);
  /**
   * Get a colour as 0xRRGGBBAA. A number passes through. A string is '#rgb', '#rgba', '#rrggbb' or
   * '#rrggbbaa'; `alpha` (0 to 1) applies to the forms without one, which are opaque without it.
   * Any other string gives a colour that is not defined: pass one of these forms. A value that
   * is neither a number nor a string is 0.
   */
  function rgba(c, alpha) {
    if (typeof c === 'number') return c >>> 0;
    if (typeof c !== 'string') return 0;
    let h = c.trim().replace('#', '');
    if (h.length === 3 || h.length === 4) h = [...h].map(x => x + x).join('');
    if (h.length === 6) h += alpha !== undefined ? alpha8(alpha).toString(16).padStart(2, '0') : 'ff';
    return parseInt(h, 16) >>> 0;
  }
  /** Get a 0xRRGGBBAA colour as a CSS `rgba()` string. */
  const css = c => `rgba(${(c >>> 24) & 255},${(c >>> 16) & 255},${(c >>> 8) & 255},${(c & 255) / 255})`;

  /**
   * Make a selector: what a style rule applies to (QVP_SELECTOR_*). A word, a path and a
   * `decorationIndex` are indices on the page, and a line is its printed number from 1. A mark,
   * a category, a family, a kind and a `decoration` kind are each an id or a name.
   */
  const Sel = {
    page: () => ({ selector: 0 }),
    path: i => ({ selector: 1, a: i }),
    wordPath: (w, n) => ({ selector: 2, a: w, b: n }),
    wordMark: (w, n) => ({ selector: 3, a: w, b: n }),                    // nth mark of the word (0-based)
    wordMarkNamed: (w, mark, n = 0) => ({ selector: 4, a: w, b: markId(mark), c: n }),
    wordBody: w => ({ selector: 5, a: w }),
    wordMarks: w => ({ selector: 6, a: w }),
    word: w => ({ selector: 7, a: w }),
    ayah: (s, a) => ({ selector: 8, a: s, b: a }),
    line: n => ({ selector: 9, a: n }),
    mark: m => ({ selector: 10, a: markId(m) }),
    category: c => ({ selector: 11, a: idOf('category', c) }),
    family: f => ({ selector: 12, a: idOf('family', f) }),
    kind: k => ({ selector: 13, a: idOf('kind', k) }),
    decoration: k => ({ selector: 14, a: idOf('decoration', k) }),
    decorationIndex: i => ({ selector: 15, a: i }),
  };
  const markId = m => idOf('mark', m);

  /**
   * Make a target: what resolves to a word list (QVP_TARGET_*). Every call that takes one also takes
   * a string: 'page', '2:255', '2:255:3', '2:255-257', 'line:7' or 'surah:2'.
   */
  const T = {
    page: () => ({ target: 0 }),
    word: i => ({ target: 1, a: i }),
    words: ws => ({ target: 2, words: ws }),
    ayah: (s, a) => ({ target: 3, a: s, b: a }),
    ayahRange: (s, a, b) => ({ target: 4, a: s, b: a, c: b }),
    line: n => ({ target: 5, a: n }),
    surah: s => ({ target: 6, a: s }),
    range: (a, b) => ({ target: 7, a, b }),
  };

  // The inputs of one call go in scratch2 (64 KB). A struct has its own offset, written where
  // it is used. The inputs that vary in length have these regions, [offset, capacity in bytes]:
  // one that outgrows its region goes in a block from the engine's allocator for the length
  // of the call (`_input`, `_withInputs`).
  const SCRATCH = 1 << 16;
  const IN = { STRING: [0, 1024], WORDS: [1024, 3072], PAIRS: [20480, 4096], LINE_SEP: [45056, 1024], TRIPLES: [49152, 4096] };
  /** the error for an engine record call that answered 0 for an index below the count */
  const refused = (call, i, of) => new Error(`${call}(${i}) returned 0 on ${of}`);

  /**
   * The engine: one instance of `qvp_ffi.wasm`. It loads pages, atlases, ornament sets and
   * passages, and owns them until each is freed. Make one with `QvpEngine.init`.
   */
  class QvpEngine {
    /** Instantiate the engine from the bytes of `qvp_ffi.wasm` and read its name tables. */
    static async init(wasmBytes) {
      const { instance } = await WebAssembly.instantiate(wasmBytes, {});
      return new QvpEngine(instance);
    }
    constructor(instance) {
      this._ex = instance.exports;
      this.mem = this.ex.memory;
      this.scratch = this.ex.qvp_alloc(SCRATCH);   // 64 KB for outputs
      this.scratch2 = this.ex.qvp_alloc(SCRATCH);  // 64 KB for inputs
      this._buf = 0; this._bufLen = 0;             // grown on demand for the bigger reads
      this._spill = [];                            // the blocks the call in hand took for inputs that outgrew their region
      this._live = new Set();                      // the pages, atlases, ornament sets and passages not freed yet
      this.td = new TextDecoder();
      this.te = new TextEncoder();
      // Load every name table from the engine once; Sel and markId read them.
      NAMES = Object.fromEntries(Object.entries(NAMES_TABLE).map(([k, t]) => [k, this.names(t)]));
    }
    /** the wasm exports every call goes through; a freed engine has none */
    get ex() { if (!this._ex) throw new Error('QvpEngine was freed'); return this._ex; }
    /** Free every page, atlas, ornament set and passage still open, then the engine's scratch
     * memory. After this, every call that reaches the engine throws, and `free()` on an object
     * it owned does nothing. Safe to call more than once. */
    free() {
      const ex = this._ex;
      if (!ex) return;
      for (const o of [...this._live]) o.free();
      ex.qvp_dealloc(this.scratch, SCRATCH); ex.qvp_dealloc(this.scratch2, SCRATCH);
      if (this._buf) ex.qvp_dealloc(this._buf, this._bufLen);
      for (const b of this._spill) ex.qvp_dealloc(b.p, b.len);
      this._spill.length = 0; this._buf = 0; this._bufLen = 0; this.scratch = 0; this.scratch2 = 0; this._ex = null;
    }
    /** All names of a table (QVP_NAMES_* id or key), index = id. */
    names(table) { const t = typeof table === 'string' ? NAMES_TABLE[table] : table; const n = this.ex.qvp_name_count(t); return Array.from({ length: n }, (_, i) => this.name(t, i)); }
    /** Get how many ids a name table (QVP_NAMES_* id or key) has. */
    nameCount(table) { return this.ex.qvp_name_count(typeof table === 'string' ? NAMES_TABLE[table] : table); }
    /** Get the name of an id in a table; empty outside the table. */
    name(table, id) { this.ex.qvp_name(typeof table === 'string' ? NAMES_TABLE[table] : table, id, this.scratch); return this.qstr(this.scratch); }
    /** Get the id of a name in a table; 255 when the table has no such name. */
    nameId(table, s) { return this._withInputs(() => { const [p, n] = this.putStr(s); return this.ex.qvp_name_id(typeof table === 'string' ? NAMES_TABLE[table] : table, p, n); }); }
    /** Get a fresh view of wasm memory. Take a new one after any call that can grow the memory. */
    dv() { return new DataView(this.mem.buffer); }
    /** Decode `len` bytes of UTF-8 at `ptr` in wasm memory. */
    str(ptr, len) { return this.td.decode(new Uint8Array(this.mem.buffer, ptr, len)); }
    /** Decode the QvpStr {ptr, len} at `at`. It stays valid only until the next call that returns a string. */
    qstr(at) { const d = this.dv(); return this.str(d.getUint32(at, true), d.getUint32(at + 4, true)); }
    /** the reader's pan and zoom: {scale, offsetX, offsetY} in, the same out. The engine owns
     * the arithmetic so every platform pinches alike; the host owns only the gesture. */
    _putView(v, at) { const d = this.dv(); d.setFloat32(at, v.scale, true); d.setFloat32(at + 4, v.offsetX, true); d.setFloat32(at + 8, v.offsetY, true); return at; }
    _getView(at) { const d = this.dv(); return { scale: d.getFloat32(at, true), offsetX: d.getFloat32(at + 4, true), offsetY: d.getFloat32(at + 8, true) }; }
    /** zoom about a point of the viewport (the point between two fingers), clamped */
    viewZoomAbout(view, focalX, focalY, factor, { min = 0, max = 0 } = {}) {
      const i = this._putView(view, this.scratch2 + 32768);
      this.ex.qvp_view_zoom_about(i, focalX, focalY, factor, min, max, this.scratch);
      return this._getView(this.scratch);
    }
    /** move by a drag, in viewport px */
    viewPan(view, dx, dy) { const i = this._putView(view, this.scratch2 + 32768); this.ex.qvp_view_pan(i, dx, dy, this.scratch); return this._getView(this.scratch); }
    /** hold the content against the viewport: centre what does not fill it, cover what does */
    viewClamp(view, contentW, contentH, viewportW, viewportH) { const i = this._putView(view, this.scratch2 + 32768); this.ex.qvp_view_clamp(i, contentW, contentH, viewportW, viewportH, this.scratch); return this._getView(this.scratch); }
    /** +1 or -1 when a released drag is a page swipe, 0 when it is not */
    viewSwipe(dx, dy, vx = 0, vy = 0) { return this.ex.qvp_view_swipe(dx, dy, vx, vy); }
    /** how many pages a released drag turns, in reading order: a mushaf runs right to left, so a
     * flick to the right is the next page. Add it to the page you are on. */
    swipePages(dx, dy, vx = 0, vy = 0) { return this.ex.qvp_swipe_pages(dx, dy, vx, vy); }
    /** true once the reader has zoomed in, by either road: a magnified view, or a page reflowed above the printed size */
    zoomIsZoomed(zoom, view, fitScale = 0) {
      const d = this.dv(), z = this.scratch2 + 41984;
      d.setUint32(z, ZOOM_MODE[zoom && zoom.mode] ?? 0, true);
      d.setUint32(z + 4, (zoom && zoom.step) || 0, true);
      d.setFloat32(z + 8, (zoom && zoom.zoom) || 1, true);
      const v = this._putView(view, this.scratch2 + 42000);
      return !!this.ex.qvp_zoom_is_zoomed(z, v, fitScale);
    }
    /** a scratch buffer of at least `len` bytes, kept between calls; a bigger ask replaces it,
     * so read one ask out before the next */
    buf(len) { if (len > this._bufLen) { if (this._buf) this.ex.qvp_dealloc(this._buf, this._bufLen); this._buf = this.ex.qvp_alloc(len); this._bufLen = len; } return this._buf; }
    /** Call an `(out, cap) → total` getter, `call(out, cap)`, into the scratch first and again
     * into a buffer of the total's size when the scratch was too small, so no array is ever
     * cut short. `size` is one record's bytes. Returns [at, n]: where the records are and how
     * many; read them out before the next engine call. */
    collect(size, call) {
      const cap = Math.floor(SCRATCH / size), n = call(this.scratch, cap);
      if (n <= cap) return [this.scratch, n];
      const at = this.buf(n * size);
      return [at, Math.min(call(at, n), n)];
    }
    /** `len` bytes for an input: its region of scratch2 when it fits, else a block from the
     * engine's allocator that lives until the `_withInputs` around the call returns. A new
     * block can grow the memory, so take a DataView after this call, never before it. */
    _input([off, cap], len) {
      if (len <= cap) return this.scratch2 + off;
      const b = { p: this.ex.qvp_alloc(len), len };
      this._spill.push(b);
      return b.p;
    }
    /** Run `fn`, an engine call with inputs that may outgrow their regions, then free the
     * blocks it took. Nests: an inner call frees its own blocks only. */
    _withInputs(fn) {
      const from = this._spill.length;
      try { return fn(); } finally { while (this._spill.length > from) { const b = this._spill.pop(); this.ex.qvp_dealloc(b.p, b.len); } }
    }
    /** write a JS string into its input region; returns [ptr, len] */
    putStr(s, region = IN.STRING) { const b = this.te.encode(s), p = this._input(region, b.length); new Uint8Array(this.mem.buffer, p, b.length).set(b); return [p, b.length]; }
    /** write a list of uint32 into its input region; returns ptr */
    putU32(arr, region = IN.WORDS) { const p = this._input(region, arr.length * 4); new Uint32Array(this.mem.buffer, p, arr.length).set(arr); return p; }
    /** Call the name getter `fn` for an id and decode the name. */
    nameOf(fn, v) { this.ex[fn](v, this.scratch); return this.qstr(this.scratch); }
    /** Get a mark's name by its id. */
    markName(m) { return this.nameOf('qvp_mark_name', m); }
    /** Get a mark family's name by its id. */
    familyName(f) { return this.nameOf('qvp_family_name', f); }
    /** Get a path kind's name by its id. */
    kindName(k) { return this.nameOf('qvp_kind_name', k); }
    /** Get a mark category's name by its id. */
    categoryName(c) { return this.nameOf('qvp_category_name', c); }
    /** Get the category a mark belongs to. The mark is an id or a name. */
    markCategory(m) { return this.ex.qvp_mark_category(markId(m)); }
    /** Get a mark's id by its name; 255 when the engine has no such mark. */
    markFromName(s) { return this._withInputs(() => { const [p, n] = this.putStr(s); return this.ex.qvp_mark_from_name(p, n); }); }
    /** The engine version, e.g. '0.2.0'. */
    version() { this.ex.qvp_version(this.scratch); return this.qstr(this.scratch); }
    /** The page format version the engine reads. */
    formatVersion() { return this.ex.qvp_format_version(); }
    /** The engine's name, `qvp` (a NUL-terminated C string in wasm memory). */
    engineName() { const p = this.ex.qvp_engine_name(), u = new Uint8Array(this.mem.buffer); let n = 0; while (u[p + n]) n++; return this.str(p, n); }
    /** Remove every Arabic mark (harakah, tatweel, waqf signs and the like) and keep the letters. */
    strip(s) { return this._arabic(0, s); }
    /** Fold the letter forms that search treats as one: أإآٱ to ا, ىئ to ي, ؤ to و, ة to ه, and Arabic-Indic digits to ASCII. */
    fold(s) { return this._arabic(1, s); }
    /** Strip, fold and collapse the spaces, as search does to both the query and the page. */
    normalize(s) { return this._arabic(2, s); }
    /** Normalise, then drop bare alif and hamzah: the key of the loose second search pass, so a typed `الرحمان` finds `الرحمن`. */
    looseKey(s) { return this._arabic(3, s); }
    _arabic(op, s) { this._withInputs(() => { const [p, n] = this.putStr(s); this.ex.qvp_arabic(op, p, n, this.scratch); }); return this.qstr(this.scratch); }
    /** Load a page from the bytes of an `NNN.qvp` file; the engine copies them. Throws on a malformed page. */
    loadPage(bytes) {
      const p = this.ex.qvp_alloc(bytes.length);
      new Uint8Array(this.mem.buffer, p, bytes.length).set(bytes);
      const h = this.ex.qvp_page_load(p, bytes.length);
      this.ex.qvp_dealloc(p, bytes.length);
      if (!h) throw new Error('qvp_page_load failed');
      // a page the engine loaded but refuses to describe is freed, not leaked
      try { return new QvpPage(this, h); } catch (e) { this.ex.qvp_page_free(h); throw e; }
    }
    /** Load the atlas (`atlas.qva`) for cross-page lookup; the engine copies the bytes. Throws on a malformed file. */
    loadAtlas(bytes) {
      const p = this.ex.qvp_alloc(bytes.length);
      new Uint8Array(this.mem.buffer, p, bytes.length).set(bytes);
      const h = this.ex.qvp_atlas_load(p, bytes.length);
      this.ex.qvp_dealloc(p, bytes.length);
      if (!h) throw new Error('qvp_atlas_load failed');
      return new QvpAtlas(this, h);
    }
    /** an ornament set (ornaments.qvo): the medallions, bands and borders of other mushafs and fonts */
    loadOrnaments(bytes) {
      const p = this.ex.qvp_alloc(bytes.length);
      new Uint8Array(this.mem.buffer, p, bytes.length).set(bytes);
      const h = this.ex.qvp_ornaments_load(p, bytes.length);
      this.ex.qvp_dealloc(p, bytes.length);
      if (!h) throw new Error('qvp_ornaments_load failed');
      // a set the engine loaded but refuses to describe is freed, not leaked
      try { return new QvpOrnaments(this, h); } catch (e) { this.ex.qvp_ornaments_free(h); throw e; }
    }
    /** Load the ayahs `from` to `to` of `surah` from the pages that print them, in any order.
     * The passage copies what it needs, so the pages can be freed after this. Throws when an
     * ayah is missing or incomplete, a page is given twice, or the range has over 4,096 words. */
    loadPassage(pages, surah, from, to = from) {
      const [p, n] = this._pageHandles(pages);
      const h = this.ex.qvp_passage_load(p, n, surah, from, to);
      if (!h) throw new Error('qvp_passage_load failed');
      return new QvpPassage(this, h, surah, from);
    }
    /** Load the basmalah printed above `surah` from whichever of the pages prints it. It lays
     * out on one row and has no ayahs and no words. Throws for surah 1, whose basmalah is its
     * first ayah, for surah 9, which has none, and when no page given prints it. */
    loadBasmalah(pages, surah) {
      const [p, n] = this._pageHandles(pages);
      const h = this.ex.qvp_passage_load_basmalah(p, n, surah);
      if (!h) throw new Error('qvp_passage_load_basmalah failed');
      return new QvpPassage(this, h, surah, 1);
    }
    /** the pages' handles as an array in wasm memory: [ptr, count]. A freed page throws here
     * (`page.h`), so none reaches the engine, where it would trap. */
    _pageHandles(pages) {
      if (!pages.length) throw new Error('a passage needs at least one page');
      return [this.putU32(Uint32Array.from(pages, p => p.h)), pages.length];
    }
  }

  // struct writers (wasm32 layouts, see qvp.h)
  function writeTarget(e, at, t) {
    if (typeof t === 'string') t = parseTarget(t);
    // the word list first: a long one takes a new block, which can move the memory
    const wp = t.words ? e.putU32(Uint32Array.from(t.words)) : 0, wn = t.words ? t.words.length : 0;
    const d = e.dv();
    d.setUint8(at, t.target); d.setUint32(at + 4, t.a >>> 0 || 0, true); d.setUint32(at + 8, t.b >>> 0 || 0, true); d.setUint32(at + 12, t.c >>> 0 || 0, true);
    d.setUint32(at + 16, wp, true); d.setUint32(at + 20, wn, true);
    return at;
  }
  /**
   * Parse a target string ('page', '2:255', '2:255:3', '2:255-257', 'line:7', 'surah:2'). A word
   * key needs the page to find its index, so it comes back as `wordKey`. Throws on any other string.
   */
  function parseTarget(s) {
    if (s === 'page') return T.page();
    let m;
    if ((m = /^line:(\d+)$/.exec(s))) return T.line(+m[1]);
    if ((m = /^surah:(\d+)$/.exec(s))) return T.surah(+m[1]);
    if ((m = /^(\d+):(\d+)-(\d+)$/.exec(s))) return T.ayahRange(+m[1], +m[2], +m[3]);
    if ((m = /^(\d+):(\d+):(\d+)$/.exec(s))) return { target: 1, wordKey: [+m[1], +m[2], +m[3]] };
    if ((m = /^(\d+):(\d+)$/.exec(s))) return T.ayah(+m[1], +m[2]);
    throw new Error('bad target ' + s);
  }
  function writeSel(e, at, s) {
    const d = e.dv();
    d.setUint8(at, s.selector); d.setUint32(at + 4, s.a >>> 0 || 0, true); d.setUint32(at + 8, s.b >>> 0 || 0, true); d.setUint32(at + 12, s.c >>> 0 || 0, true);
    return at;
  }
  const HL_DEFAULT = { mode: 'band', height: 'lineSpacing', ink: DEFAULTS.HIGHLIGHT_INK, band: DEFAULTS.HIGHLIGHT_BAND, padX: DEFAULTS.HIGHLIGHT_PAD_X, padY: DEFAULTS.HIGHLIGHT_PAD_Y, radius: 0, seam: DEFAULTS.HIGHLIGHT_SEAM, ms: 0, layer: LAYER.HIGHLIGHT };
  function writeHl(e, at, st) {
    st = { ...HL_DEFAULT, ...st };
    const d = e.dv();
    d.setUint8(at, { ink: 0, band: 1, both: 2 }[st.mode] ?? 1); d.setUint8(at + 1, st.height === 'ink' ? 1 : 0);
    d.setUint32(at + 4, rgba(st.ink), true); d.setUint32(at + 8, rgba(st.band), true);
    d.setFloat32(at + 12, st.padX, true); d.setFloat32(at + 16, st.padY, true); d.setFloat32(at + 20, st.radius, true); d.setFloat32(at + 24, st.seam, true);
    d.setUint32(at + 28, st.ms, true); d.setInt32(at + 32, st.layer, true);
    return at;
  }
  function readBoxes(e, at, n) {
    const d = e.dv(), out = new Array(n);
    for (let i = 0; i < n; i++) { const o = at + i * 32; out[i] = { id: d.getUint32(o, true), line: d.getUint32(o + 4, true), x0: d.getFloat32(o + 8, true), y0: d.getFloat32(o + 12, true), x1: d.getFloat32(o + 16, true), y1: d.getFloat32(o + 20, true), color: d.getUint32(o + 24, true), radius: d.getFloat32(o + 28, true) }; }
    return out;
  }

  /**
   * One loaded page: its records, its geometry, and the engine state that goes with it (layout,
   * styles, highlights, selection, mask, dress). Coordinates are page units unless a name ends in
   * `View`, which means viewport px through the current layout. Make one with `engine.loadPage`.
   */
  class QvpPage {
    constructor(engine, handle) {
      this.e = engine; this._h = handle;
      const ex = engine.ex, s = engine.scratch;
      ex.qvp_page_info(handle, s);
      let d = engine.dv();
      this.width = d.getFloat32(s, true); this.height = d.getFloat32(s + 4, true); this.page = d.getUint32(s + 8, true);
      this.nLines = d.getUint32(s + 12, true); this.nAyahs = d.getUint32(s + 16, true); this.nWords = d.getUint32(s + 20, true); this.nPaths = d.getUint32(s + 24, true); this.nDecorations = d.getUint32(s + 28, true);
      ex.qvp_geometry(handle, s);
      d = engine.dv();
      const opsPtr = d.getUint32(s, true), opsLen = d.getUint32(s + 4, true), ptsPtr = d.getUint32(s + 8, true), ptsLen = d.getUint32(s + 12, true), tabPtr = d.getUint32(s + 16, true), nPaths = d.getUint32(s + 20, true);
      this.ops = new Uint8Array(engine.mem.buffer, opsPtr, opsLen).slice();
      this.pts = new Float32Array(engine.mem.buffer.slice(ptsPtr, ptsPtr + ptsLen * 4));
      this.table = new Uint32Array(engine.mem.buffer.slice(tabPtr, tabPtr + nPaths * 32));
      this.paths = null;
      this.ornaments = null; this.ornamentsRevision = -1;
      this.words = Array.from({ length: this.nWords }, (_, i) => this._word(i));
      this.ayahs = Array.from({ length: this.nAyahs }, (_, i) => this._ayah(i));
      this.lines = Array.from({ length: this.nLines }, (_, i) => this._line(i));
      this.decorations = Array.from({ length: this.nDecorations }, (_, i) => this._deco(i));
      this.lineSpacing = ex.qvp_page_line_spacing(handle);
      this.currentLayout = null;
      this._defaultInk = DEFAULTS.INK;
      engine._live.add(this);   // last: a page the engine refuses to describe is freed by loadPage, not by engine.free
    }
    /** the engine's handle; a freed page has none */
    get h() { if (!this._h) throw new Error('QvpPage was freed'); return this._h; }
    /** Free the engine's page. Safe to call more than once; every call that reaches the engine
     * after it throws. Does nothing after `engine.free()`, which freed the page. */
    free() { if (this._h) { this.e.ex.qvp_page_free(this._h); this._h = 0; this.e._live.delete(this); } }
    // ── dress: another mushaf's ornaments ──
    /**
     * Put other ornaments on the page: up to one per kind. `style` names a mushaf and
     * takes its medallion, band and border together. Each of `ayahMark`, `surahHeader`
     * and `pageFrame` is an ornament of the set, its index, or a style name (the ornament
     * of that kind in that style), and overrides the style for that kind; leave one out
     * for none. Any other value, such as an entry of `set.styles()`, throws a `TypeError`. `colors` is a
     * list of `[ornament, part, colour]`; every part left out keeps the design's own.
     * `gap` is the air between the text and the border and `bandGap` the air between a band
     * and the border, both in page units. `ayahMarkScale` sizes the medallion against the
     * printed ring (0, the default, takes the design's own: `DEFAULTS.AYAH_MARK_SCALE_SCAN`
     * for a scanned mushaf, 1 for a font marker). `pageFrameScale` sizes the border against the
     * design's own: the pattern scales as a whole, so a bigger border fits fewer motifs
     * along each edge; nothing is stretched. `lineArt` draws kinds as line art, their constant-width strokes alone: `true` for
     * every kind, or a list of kinds (`'ayah_mark'`, `'surah_header'`, `'page_frame'`).
     * Returns the readout, or null when the engine refused the spec (an index out of
     * range, an ornament of another kind, a band or border with no slot, or nothing to
     * dress). Replaces any previous
     * dress.
     */
    dress(set, { style = null, ayahMark = style, surahHeader = style, pageFrame = style, gap = 5, bandGap = 5, ayahMarkScale = 0, pageFrameScale = 1, lineArt = false, colors = [] } = {}) {
      // An ornament is a non-negative integer index or an object with one, such as an entry
      // of `set.list`. Anything else (an entry of `set.styles()`, NaN) is a caller's mistake.
      const ornamentIndex = (v, key) => {
        const i = typeof v === 'number' ? v : v !== null && typeof v === 'object' ? v.index : undefined;
        if (!Number.isInteger(i) || i < 0) throw new TypeError(`dress: ${key} must be an ornament, its index or a style name`);
        return i;
      };
      const index = (v, kind, key) => {
        if (v === null || v === undefined) return NONE;
        if (typeof v === 'string') { const o = set.find(kind, v); return o ? o.index : NONE; }
        return ornamentIndex(v, key);
      };
      const ayah = index(ayahMark, 'ayah_mark', 'ayahMark'), header = index(surahHeader, 'surah_header', 'surahHeader'), frame = index(pageFrame, 'page_frame', 'pageFrame');
      const triples = [];
      colors.forEach(([o, part, colour], k) => triples.push(ornamentIndex(o, `colors[${k}]`), part, rgba(colour)));
      const lineMask = lineArt === true ? 7 : Array.isArray(lineArt) ? lineArt.reduce((m, k) => m | (1 << ORNAMENT_KIND.indexOf(k)), 0) : 0;
      this.ornaments = null;
      const ok = this.e._withInputs(() => {
        // the colour triples first: a long list takes a new block, which can move the memory
        const cp = triples.length ? this.e.putU32(Uint32Array.from(triples), IN.TRIPLES) : 0;
        const s = this.e.scratch2 + 36864, d = this.e.dv();   // the dress spec (QvpDressSpec, 40 bytes)
        d.setUint32(s, ayah, true); d.setUint32(s + 4, header, true); d.setUint32(s + 8, frame, true);
        d.setFloat32(s + 12, gap, true); d.setFloat32(s + 16, bandGap, true); d.setFloat32(s + 20, ayahMarkScale, true); d.setFloat32(s + 24, pageFrameScale, true); d.setUint32(s + 28, lineMask, true);
        d.setUint32(s + 32, cp, true); d.setUint32(s + 36, triples.length / 3, true);
        return this.e.ex.qvp_dress(this.h, set.h, s);
      });
      // the engine refits the current layout to the border (or back without it)
      if (this.currentLayout) this.layoutCurrent();
      return ok ? this.dressInfo() : null;
    }
    /** Take the ornaments off: the printed rings and bands come back, and the layout's fit is
     * the undressed one again. */
    undress() { this.e.ex.qvp_undress(this.h); this.ornaments = null; if (this.currentLayout) this.layoutCurrent(); }
    /** `engine.viewClamp` for the dressed box: the content plus the dress overflow, so a drag
     * reaches the border and never goes past it. An undressed page gets the plain clamp. */
    dressClamp(view, viewportW, viewportH) {
      const i = this.e._putView(view, this.e.scratch2 + 32768);
      this.e.ex.qvp_dress_clamp(this.h, i, viewportW, viewportH, this.e.scratch);
      return this.e._getView(this.e.scratch);
    }
    /** For a host that scrolls the page itself: {view, width, height}. `view` shows the
     * dressed box (content plus dress overflow) at `scale`, centred across `viewportW` (at
     * x = 0 when wider) with its top at y = 0; `width` and `height` are the box's size at
     * that scale, the size to give the canvas. An undressed page gets its content centred
     * at the top and the content's size. */
    dressView(scale, viewportW) {
      const s = this.e.scratch;
      this.e.ex.qvp_dress_view(this.h, scale, viewportW, s, s + 16);
      const d = this.e.dv();
      return { view: this.e._getView(s), width: d.getFloat32(s + 16, true), height: d.getFloat32(s + 20, true) };
    }
    /** The readout, or null when the page is not dressed: {ayahMark, surahHeader, pageFrame,
     * ayahMarks, surahHeaders, frameRepeats, frameStretched, draws, revision, viewBox,
     * overflow}. `viewBox` is [x, y, w, h] in page units; a border grows it. `overflow` is
     * [left, top, right, bottom] in layout px. The layout's `fitScale`, `fitX` and `fitY`
     * already fit the content plus this overflow, and `dressClamp` clamps to it. */
    dressInfo() {
      const s = this.e.scratch;
      if (!this.e.ex.qvp_dress_info(this.h, s)) return null;
      const d = this.e.dv(), u = i => d.getUint32(s + i * 4, true), f = i => d.getFloat32(s + i, true);
      const id = v => v === NONE ? null : v;
      return { ayahMark: id(u(0)), surahHeader: id(u(1)), pageFrame: id(u(2)), ayahMarks: u(3), surahHeaders: u(4), frameRepeats: u(5), frameStretched: !!u(6), draws: u(7), revision: u(8),
        viewBox: [f(36), f(40), f(44), f(48)], overflow: [f(52), f(56), f(60), f(64)] };
    }
    /** Counts up whenever the ornament layer is rebuilt: a new dress, or a layout that
     * moved the page under the border. 0 when undressed. */
    dressRevision() { const i = this.dressInfo(); return i ? i.revision : 0; }
    /**
     * The ornament display list as Path2D plus paint, in page units: [{path, color, kind,
     * evenOdd, stroke, strokeWidth, part, placement}]. Draw it behind the page ink. A
     * draw's `placement` is the layout placement index a page draw carries, or null for
     * the border, which is drawn with no group transform.
     */
    dressGeometry() {
      const P = typeof Path2D === 'function' ? Path2D : class { moveTo() {} lineTo() {} quadraticCurveTo() {} bezierCurveTo() {} closePath() {} };
      const rev = this.dressRevision();
      if (this.ornaments && this.ornamentsRevision === rev) return this.ornaments;
      this.ornamentsRevision = rev;
      const s = this.e.scratch;
      this.e.ex.qvp_dress_geometry(this.h, s);
      const d = this.e.dv(), n = d.getUint32(s + 20, true);
      if (!n) return (this.ornaments = []);
      const opsPtr = d.getUint32(s, true), opsLen = d.getUint32(s + 4, true), ptsPtr = d.getUint32(s + 8, true), ptsLen = d.getUint32(s + 12, true), tabPtr = d.getUint32(s + 16, true);
      const ops = new Uint8Array(this.e.mem.buffer, opsPtr, opsLen);
      const pts = new Float32Array(this.e.mem.buffer, ptsPtr, ptsLen);
      const t = new Uint32Array(this.e.mem.buffer.slice(tabPtr, tabPtr + n * 36));
      const tf = new Float32Array(t.buffer);
      const out = new Array(n);
      for (let i = 0; i < n; i++) {
        const p = new P();
        let o = t[i * 9], oe = o + t[i * 9 + 1], k = t[i * 9 + 2];
        for (; o < oe; o++) {
          switch (ops[o]) {
            case 0: p.moveTo(pts[k], pts[k + 1]); k += 2; break;
            case 1: p.lineTo(pts[k], pts[k + 1]); k += 2; break;
            case 2: p.quadraticCurveTo(pts[k], pts[k + 1], pts[k + 2], pts[k + 3]); k += 4; break;
            case 3: p.bezierCurveTo(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], pts[k + 4], pts[k + 5]); k += 6; break;
            case 4: p.closePath(); break;
          }
        }
        const flags = t[i * 9 + 5], placement = t[i * 9 + 8];
        out[i] = { path: p, color: t[i * 9 + 4], kind: ORNAMENT_KIND[flags & 0xff], evenOdd: !!(flags & 0x100), stroke: !!(flags & 0x200), strokeWidth: tf[i * 9 + 6], part: t[i * 9 + 7], placement: placement === NONE ? null : placement };
      }
      return (this.ornaments = out);
    }

    // ── geometry ──
    pathFlags(i) { return this.table[i * 8 + 4]; }
    pathKind(i) { return this.pathFlags(i) & 0xff; }
    pathMark(i) { return (this.pathFlags(i) >> 8) & 0xff; }
    pathFamily(i) { return (this.pathFlags(i) >> 16) & 0xff; }
    pathEvenOdd(i) { return ((this.pathFlags(i) >> 24) & 1) === 1; }
    pathWord(i) { const w = this.table[i * 8 + 5]; return w === NONE ? -1 : w; }
    pathLine(i) { return this.table[i * 8 + 6]; }
    pathCategory(i) { return this.table[i * 8 + 7] & 0xff; }
    pathNthInWord(i) { return (this.table[i * 8 + 7] >> 8) & 0xff; }
    pathNthMark(i) { const n = (this.table[i * 8 + 7] >> 16) & 0xff; return n === 0xff ? -1 : n; }
    buildPaths() {
      if (this.paths) return this.paths;
      const t = this.table, ops = this.ops, pts = this.pts, out = new Array(this.nPaths);
      for (let i = 0; i < this.nPaths; i++) {
        const p = new Path2D();
        let o = t[i * 8], oe = o + t[i * 8 + 1], k = t[i * 8 + 2];
        for (; o < oe; o++) {
          switch (ops[o]) {
            case 0: p.moveTo(pts[k], pts[k + 1]); k += 2; break;
            case 1: p.lineTo(pts[k], pts[k + 1]); k += 2; break;
            case 2: p.quadraticCurveTo(pts[k], pts[k + 1], pts[k + 2], pts[k + 3]); k += 4; break;
            case 3: p.bezierCurveTo(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], pts[k + 4], pts[k + 5]); k += 6; break;
            case 4: p.closePath(); break;
          }
        }
        out[i] = p;
      }
      return (this.paths = out);
    }

    // ── info records ──
    // The engine answers 0 for an index it has no record of. Every index below the page's
    // counts has one, so a 0 here is the engine refusing the page, and the load fails.
    _refused(call, i) { return refused(call, i, `page ${this.page}`); }
    _word(i) {
      const ex = this.e.ex, s = this.e.scratch; if (!ex.qvp_word_info(this.h, i, s)) throw this._refused('qvp_word_info', i);
      const d = this.e.dv();
      return { index: i, surah: d.getUint16(s, true), ayah: d.getUint16(s + 2, true), word: d.getUint16(s + 4, true), line: d.getUint16(s + 6, true), ayahIndex: d.getUint32(s + 8, true), lineIndex: d.getUint32(s + 12, true),
        x0: d.getFloat32(s + 16, true), y0: d.getFloat32(s + 20, true), x1: d.getFloat32(s + 24, true), y1: d.getFloat32(s + 28, true), text: this.e.qstr(s + 32), firstPath: d.getUint32(s + 40, true), nPaths: d.getUint32(s + 44, true) };
    }
    _ayah(i) {
      const ex = this.e.ex, s = this.e.scratch; if (!ex.qvp_ayah_info(this.h, i, s)) throw this._refused('qvp_ayah_info', i);
      const d = this.e.dv();
      return { index: i, surah: d.getUint16(s, true), ayah: d.getUint16(s + 2, true), fragment: d.getUint8(s + 4), fragments: d.getUint8(s + 5), flags: d.getUint8(s + 6), rubuAlHizb: d.getUint16(s + 8, true),
        firstWord: d.getUint32(s + 12, true), nWords: d.getUint32(s + 16, true), ayahMarkDecoration: d.getUint32(s + 20, true), x0: d.getFloat32(s + 24, true), y0: d.getFloat32(s + 28, true), x1: d.getFloat32(s + 32, true), y1: d.getFloat32(s + 36, true) };
    }
    _line(i) {
      const ex = this.e.ex, s = this.e.scratch; if (!ex.qvp_line_info(this.h, i, s)) throw this._refused('qvp_line_info', i);
      const d = this.e.dv();
      return { index: i, lineNumber: d.getUint8(s), isHeader: !!d.getUint8(s + 1), firstWord: d.getUint32(s + 4, true), nWords: d.getUint32(s + 8, true), x0: d.getFloat32(s + 12, true), y0: d.getFloat32(s + 16, true), x1: d.getFloat32(s + 20, true), y1: d.getFloat32(s + 24, true),
        bandY0: d.getFloat32(s + 28, true), bandY1: d.getFloat32(s + 32, true), centre: d.getFloat32(s + 36, true) };
    }
    _deco(i) {
      const ex = this.e.ex, s = this.e.scratch; if (!ex.qvp_decoration_info(this.h, i, s)) throw this._refused('qvp_decoration_info', i);
      const d = this.e.dv();
      return { index: i, decoration: d.getUint8(s), surah: d.getUint16(s + 2, true), ayah: d.getUint16(s + 4, true), line: d.getUint32(s + 8, true), x0: d.getFloat32(s + 12, true), y0: d.getFloat32(s + 16, true), x1: d.getFloat32(s + 20, true), y1: d.getFloat32(s + 24, true),
        text: this.e.qstr(s + 28), firstPath: d.getUint32(s + 36, true), nPaths: d.getUint32(s + 40, true) };
    }
    wordForm(i, form = 'rasm_uthmani') { const s = this.e.scratch; if (!this.e.ex.qvp_word_form(this.h, i, FORM[form] ?? 0, s)) return ''; return this.e.qstr(s); }
    findWord(surah, ayah, word) { const i = this.e.ex.qvp_find_word(this.h, surah, ayah, word); return i < 0 ? -1 : i; }
    _target(t) {
      if (typeof t === 'string') t = parseTarget(t);
      if (t.wordKey) { const i = this.findWord(...t.wordKey); t = i >= 0 ? T.word(i) : T.words([]); }
      if (t instanceof Array) t = T.words(t);
      return writeTarget(this.e, this.e.scratch2 + 4096, t);
    }
    targetWords(t) { const [at, n] = this.e._withInputs(() => { const tp = this._target(t); return this.e.collect(4, (o, c) => this.e.ex.qvp_target_words(this.h, tp, o, c)); }); return Array.from(new Uint32Array(this.e.mem.buffer, at, n)); }

    // ── metadata ──
    surahs() {
      const ex = this.e.ex, s = this.e.scratch, n = ex.qvp_surah_count(this.h), out = [];
      for (let i = 0; i < n; i++) { ex.qvp_surah_at(this.h, i, s); const d = this.e.dv();
        out.push({ number: d.getUint16(s, true), ayahCount: d.getUint16(s + 2, true), hasBanner: !!d.getUint8(s + 4), hasBasmalah: !!d.getUint8(s + 5), place: names('place')[d.getUint8(s + 6)] || '', bannerDecoration: d.getUint32(s + 8, true), arabic: this.e.qstr(s + 12), latin: this.e.qstr(s + 20), english: this.e.qstr(s + 28) }); }
      return out;
    }
    divisions() {
      const ex = this.e.ex, [s, n] = this.e.collect(12, (o, c) => ex.qvp_divisions(this.h, o, c)), d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = s + i * 12; out.push({ division: names('division')[d.getUint8(o)], line: d.getUint8(o + 1), number: d.getUint16(o + 2, true), surah: d.getUint16(o + 4, true), ayah: d.getUint16(o + 6, true), ayahIndex: d.getUint32(o + 8, true) }); }
      return out;
    }
    /** the surah headings in page units: the box a frame fills, and the title ink in it */
    surahHeaders() {
      const ex = this.e.ex, [s, n] = this.e.collect(44, (o, c) => ex.qvp_surah_headers(this.h, o, c)), d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = s + i * 44; out.push({ decoration: d.getUint32(o, true), surah: d.getUint16(o + 4, true), line: d.getUint32(o + 8, true), x0: d.getFloat32(o + 12, true), y0: d.getFloat32(o + 16, true), x1: d.getFloat32(o + 20, true), y1: d.getFloat32(o + 24, true), titleX0: d.getFloat32(o + 28, true), titleY0: d.getFloat32(o + 32, true), titleX1: d.getFloat32(o + 36, true), titleY1: d.getFloat32(o + 40, true) }); }
      return out;
    }
    /** the same, in viewport px through the current layout: what a host draws its own frame around */
    surahHeadersView() {
      const ex = this.e.ex, [s, n] = this.e.collect(44, (o, c) => ex.qvp_surah_headers_view(this.h, o, c)), d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = s + i * 44; out.push({ decoration: d.getUint32(o, true), surah: d.getUint16(o + 4, true), line: d.getUint32(o + 8, true), x0: d.getFloat32(o + 12, true), y0: d.getFloat32(o + 16, true), x1: d.getFloat32(o + 20, true), y1: d.getFloat32(o + 24, true), titleX0: d.getFloat32(o + 28, true), titleY0: d.getFloat32(o + 32, true), titleX1: d.getFloat32(o + 36, true), titleY1: d.getFloat32(o + 40, true) }); }
      return out;
    }
    ayahMarks() {
      const ex = this.e.ex, [s, n] = this.e.collect(32, (o, c) => ex.qvp_ayah_marks(this.h, o, c)), d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = s + i * 32; out.push({ decoration: d.getUint32(o, true), surah: d.getUint16(o + 4, true), ayah: d.getUint16(o + 6, true), line: d.getUint32(o + 8, true), cx: d.getFloat32(o + 12, true), cy: d.getFloat32(o + 16, true), r: d.getFloat32(o + 20, true), ornamentPath: d.getUint32(o + 24, true), numeralPath: d.getUint32(o + 28, true) }); }
      return out;
    }
    /** the ayah medallions in viewport px through the current layout: where each is drawn */
    ayahMarksView() {
      const ex = this.e.ex, [s, n] = this.e.collect(32, (o, c) => ex.qvp_ayah_marks_view(this.h, o, c)), d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = s + i * 32; out.push({ decoration: d.getUint32(o, true), surah: d.getUint16(o + 4, true), ayah: d.getUint16(o + 6, true), line: d.getUint32(o + 8, true), cx: d.getFloat32(o + 12, true), cy: d.getFloat32(o + 16, true), r: d.getFloat32(o + 20, true), ornamentPath: d.getUint32(o + 24, true), numeralPath: d.getUint32(o + 28, true) }); }
      return out;
    }
    rosettes() {
      const ex = this.e.ex, [s, n] = this.e.collect(20, (o, c) => ex.qvp_rosettes(this.h, o, c)), d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = s + i * 20; out.push({ decoration: d.getUint32(o, true), surah: d.getUint16(o + 4, true), ayah: d.getUint16(o + 6, true), juz: d.getUint16(o + 8, true), hizb: d.getUint16(o + 10, true), nisf: d.getUint16(o + 12, true), rubuAlHizb: d.getUint16(o + 14, true), rubuAlHizbInHizb: d.getUint16(o + 16, true) }); }
      return out;
    }
    sajdahs() {
      const ex = this.e.ex, [s, n] = this.e.collect(12, (o, c) => ex.qvp_sajdahs(this.h, o, c)), d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = s + i * 12; out.push({ decoration: d.getUint32(o, true), surah: d.getUint16(o + 4, true), ayah: d.getUint16(o + 6, true), signPath: d.getUint32(o + 8, true) }); }
      return out;
    }
    ayahKeys() { const [at, n] = this.e.collect(4, (o, c) => this.e.ex.qvp_ayah_keys(this.h, o, c)); const v = new Uint32Array(this.e.mem.buffer, at, n); return Array.from(v, k => [k >>> 16, k & 0xffff]); }
    ayahWordCount(surah, ayah) { const n = this.e.ex.qvp_ayah_word_count(this.h, surah, ayah, this.e.scratch); return { count: n, isComplete: !!this.e.dv().getUint8(this.e.scratch) }; }
    /** words for n recitation segments, or null when the counts disagree (follow the ayah whole) */
    reciteMap(surah, ayah, nSegments) {
      // -1 is a mismatch; any other answer is the total, read in full
      if (this.e.ex.qvp_recite_map(this.h, surah, ayah, nSegments, 0, 0) < 0) return null;
      const [at, n] = this.e.collect(4, (o, c) => this.e.ex.qvp_recite_map(this.h, surah, ayah, nSegments, o, c));
      return Array.from(new Uint32Array(this.e.mem.buffer, at, n));
    }
    wordLabel(i) { this.e.ex.qvp_word_label(this.h, i, this.e.scratch); return this.e.qstr(this.e.scratch); }
    ayahLabel(i) { this.e.ex.qvp_ayah_label(this.h, i, this.e.scratch); return this.e.qstr(this.e.scratch); }

    // ── text & search ──
    text(target = 'page', { form = 'rasm_uthmani', wordSep = ' ', lineSep = '\n' } = {}) {
      this.e._withInputs(() => {
        const [wp, wn] = this.e.putStr(wordSep), [lp, ln] = this.e.putStr(lineSep, IN.LINE_SEP);
        this.e.ex.qvp_text(this.h, this._target(target), FORM[form] ?? 0, wp, wn, lp, ln, this.e.scratch);
      });
      return this.e.qstr(this.e.scratch);
    }
    search(query, { form = 'search', mode = 'includes', normalize = true, looseMatch = true, limit = 0 } = {}) {
      const [at, n] = this.e._withInputs(() => { const [qp, qn] = this.e.putStr(query); return this.e.collect(12, (o, c) => this.e.ex.qvp_search(this.h, qp, qn, FORM[form] ?? 4, { includes: 0, exact: 1, prefix: 2 }[mode] ?? 0, normalize ? 1 : 0, looseMatch ? 1 : 0, limit, o, c)); });
      const d = this.e.dv(), out = [];
      for (let i = 0; i < n; i++) { const o = at + i * 12; const w = d.getUint32(o, true); out.push({ word: w, index: d.getUint32(o + 4, true), isLooseMatch: !!d.getUint8(o + 8), wordKey: this.wordKey(w), text: this.words[w].text }); }
      return out;
    }
    wordKey(i) { const w = this.words[i]; return `${w.surah}:${w.ayah}:${w.word}`; }
    /** attach a words sidecar (object or JSON string/bytes); returns words updated */
    attachWords(sidecar) { const s = typeof sidecar === 'string' ? sidecar : sidecar instanceof Uint8Array ? this.e.td.decode(sidecar) : JSON.stringify(sidecar); const b = this.e.te.encode(s); const p = this.e.ex.qvp_alloc(b.length); new Uint8Array(this.e.mem.buffer, p, b.length).set(b); const n = this.e.ex.qvp_attach_words(this.h, p, b.length); this.e.ex.qvp_dealloc(p, b.length); return n; }
    hasForm(form) { return !!this.e.ex.qvp_has_form(this.h, FORM[form] ?? 0); }
    citation(words) { this.e._withInputs(() => this.e.ex.qvp_citation(this.h, this.e.putU32(Uint32Array.from(words)), words.length, this.e.scratch)); return this.e.qstr(this.e.scratch); }

    // ── hit testing ──
    hitTestExact(x, y) { return this.e.ex.qvp_hit_test_exact(this.h, x, y, this.e.scratch) ? this._hit(this.e.scratch) : null; }
    hitTestExactView(viewX, viewY) { return this.e.ex.qvp_hit_test_exact_view(this.h, viewX, viewY, this.e.scratch) ? this._hit(this.e.scratch) : null; }
    // The engine owns maxDistance through its sentinel: 0 is unlimited. Gap bias has no sentinel, so DEFAULTS.GAP_BIAS (the engine's own number) fills it.
    _hitOpt(o) { const d = this.e.dv(), at = this.e.scratch2 + 8192; d.setFloat32(at, o?.maxDistance ?? 0, true); d.setFloat32(at + 4, o?.gapBias ?? DEFAULTS.GAP_BIAS, true); d.setUint8(at + 8, o?.preferExact === false ? 0 : 1); return at; }
    /** the one hit shape for every hit test; the exact variants report distance 0, and isExact is true only when the point is inside an outline */
    _hit(s) { const d = this.e.dv(); const f = v => (v === NONE ? -1 : v); const h = { word: f(d.getUint32(s, true)), path: f(d.getUint32(s + 4, true)), decoration: f(d.getUint32(s + 8, true)), line: f(d.getUint32(s + 12, true)), distance: d.getFloat32(s + 16, true), isExact: !!d.getUint8(s + 20) }; if (h.word >= 0) { h.wordKey = this.wordKey(h.word); const w = this.words[h.word]; h.ayahKey = `${w.surah}:${w.ayah}`; } return h; }
    /** gap-aware: every point on a printed line resolves to the word the user meant */
    hitTest(x, y, opt = {}) { return this.e.ex.qvp_hit_test(this.h, x, y, this._hitOpt(opt), this.e.scratch) ? this._hit(this.e.scratch) : null; }
    hitTestView(viewX, viewY, opt = {}) { return this.e.ex.qvp_hit_test_view(this.h, viewX, viewY, this._hitOpt(opt), this.e.scratch) ? this._hit(this.e.scratch) : null; }
    /** the hit boxes in viewport px through the current layout: what a tap is resolved with */
    hitAreasView(gapBias = DEFAULTS.GAP_BIAS) { const [at, n] = this.e.collect(40, (o, c) => this.e.ex.qvp_hit_areas_view(this.h, gapBias, o, c)), d = this.e.dv(), out = []; for (let i = 0; i < n; i++) { const o = at + i * 40; out.push({ word: d.getUint32(o, true), line: d.getUint32(o + 4, true), x0: d.getFloat32(o + 8, true), y0: d.getFloat32(o + 12, true), x1: d.getFloat32(o + 16, true), y1: d.getFloat32(o + 20, true), inkX0: d.getFloat32(o + 24, true), inkY0: d.getFloat32(o + 28, true), inkX1: d.getFloat32(o + 32, true), inkY1: d.getFloat32(o + 36, true) }); } return out; }
    lineBands() { const [at, n] = this.e.collect(28, (o, c) => this.e.ex.qvp_line_bands(this.h, o, c)), d = this.e.dv(), out = []; for (let i = 0; i < n; i++) { const o = at + i * 28; out.push({ line: d.getUint32(o, true), lineNumber: d.getUint32(o + 4, true), y0: d.getFloat32(o + 8, true), y1: d.getFloat32(o + 12, true), mid: d.getFloat32(o + 16, true), inkY0: d.getFloat32(o + 20, true), inkY1: d.getFloat32(o + 24, true) }); } return out; }
    hitAreas(gapBias = DEFAULTS.GAP_BIAS) { const [at, n] = this.e.collect(40, (o, c) => this.e.ex.qvp_hit_areas(this.h, gapBias, o, c)), d = this.e.dv(), out = []; for (let i = 0; i < n; i++) { const o = at + i * 40; out.push({ word: d.getUint32(o, true), line: d.getUint32(o + 4, true), x0: d.getFloat32(o + 8, true), y0: d.getFloat32(o + 12, true), x1: d.getFloat32(o + 16, true), y1: d.getFloat32(o + 20, true), inkX0: d.getFloat32(o + 24, true), inkY0: d.getFloat32(o + 28, true), inkX1: d.getFloat32(o + 32, true), inkY1: d.getFloat32(o + 36, true) }); } return out; }

    // ── layout ──
    /** Write a layout spec (QvpLayoutSpec, 76 bytes) at scratch offset `s`. */
    _writeLayoutSpec(spec, s) {
      // The engine lays out whatever numbers it gets and cannot refuse a spec, so a field that
      // is not a finite number is refused here by name, before anything of the page changes.
      // A field left out (undefined or null) takes its default; the viewport has none.
      const number = (o, key, fallback, prefix = '') => { const v = o[key] ?? fallback; if (!Number.isFinite(v)) throw new TypeError(`layout: ${prefix}${key} must be a finite number`); return v; };
      const n = (key, fallback) => number(spec, key, fallback);
      const r = spec.reflow, rn = (key, fallback) => number(r, key, fallback, 'reflow.');
      const d = this.e.dv();
      d.setFloat32(s, n('viewportW'), true); d.setFloat32(s + 4, n('viewportH'), true); d.setFloat32(s + 8, n('padTop', 0), true); d.setFloat32(s + 12, n('padBottom', 0), true);
      d.setFloat32(s + 16, n('padLeft', 0), true); d.setFloat32(s + 20, n('padRight', 0), true); d.setFloat32(s + 24, n('lineSpacing', 1), true);
      d.setUint8(s + 28, spec.fillHeight ? 1 : 0); d.setUint32(s + 32, n('gridLines', 0), true);
      d.setFloat32(s + 36, n('cropLeft', 0), true); d.setFloat32(s + 40, n('cropRight', 0), true); d.setFloat32(s + 44, n('maxAspectSlack', 0), true);
      d.setFloat32(s + 48, r ? rn('zoom', 1) : 0, true);
      // 255 asks the engine for its own default
      const fill = { ragged: 0, justified: 1, centred: 2, centered: 2 }[r && r.fill] ?? 255;
      const breaks = { greedy: 0, even: 1, fitted: 2, printed: 3 }[r && r.breaks] ?? 255;
      d.setUint8(s + 52, fill); d.setUint8(s + 53, breaks); d.setUint8(s + 54, r && r.gaps === 'printed' ? 0 : 1);
      d.setFloat32(s + 56, r ? rn('wordGap', 1) : 1, true);
      d.setFloat32(s + 60, r ? rn('maxStretch', 0) : 0, true);
      d.setFloat32(s + 64, r ? rn('relax', -1) : -1, true);
      // bannerZoom: how big a surah name or basmalah may get against its printed size as the
      // reader zooms; 0 lets it grow with the page until it fills the row.
      d.setFloat32(s + 68, n('bannerZoom', 0), true);
      // Native frames preserve the printed page by default; a host may supply its own.
      d.setUint8(s + 72, spec.surahFrames === false ? 0 : 1);
    }
    /** Leading (page units) that makes the page fill the padded viewport of `spec`; max 0 = unlimited. */
    layoutLineSpacingToFill(spec, max = 0) { const s = this.e.scratch; this._writeLayoutSpec(spec, s); return this.e.ex.qvp_layout_line_spacing_to_fill(this.h, s, max); }
    /** the share of the padded viewport left empty when the page is fitted to width */
    layoutWastedFraction(spec) { const s = this.e.scratch; this._writeLayoutSpec(spec, s); return this.e.ex.qvp_layout_wasted_fraction(this.h, s); }
    /** the page's height laid out for `spec` at the printed pitch, in viewport px: contentH before fill-height adds leading, padding included */
    layoutPrintedHeight(spec) { const s = this.e.scratch; this._writeLayoutSpec(spec, s); return this.e.ex.qvp_layout_printed_height(this.h, s); }
    /** the grid this page is laid out inside: the mushaf's line count and the printed line spacing */
    get grid() { this.e.ex.qvp_page_grid(this.h, this.e.scratch); const d = this.e.dv(); return { lines: d.getUint32(this.e.scratch, true), lineSpacing: d.getFloat32(this.e.scratch + 4, true) }; }
    layout(spec) {
      const ex = this.e.ex, s = this.e.scratch;
      this._writeLayoutSpec(spec, s);
      ex.qvp_layout(this.h, s, s + 128);
      return this._readLayout(s + 128);
    }
    /** read a QvpLayout the engine has written at `o`, and everything that goes with it */
    _readLayout(o) {
      const ex = this.e.ex; let d = this.e.dv();
      const n = d.getUint32(o + 24, true), lp = d.getUint32(o + 28, true);
      const f = new Float32Array(this.e.mem.buffer.slice(lp, lp + n * 12));
      const lineDy = new Float32Array(n), slots = new Array(n);
      for (let i = 0; i < n; i++) { lineDy[i] = f[i * 3]; slots[i] = [f[i * 3 + 1], f[i * 3 + 2]]; }
      const reflowed = d.getUint32(o + 44, true) === 1, rows = d.getUint32(o + 48, true);
      const L = { scale: d.getFloat32(o, true), offsetX: d.getFloat32(o + 4, true), offsetY: d.getFloat32(o + 8, true), contentW: d.getFloat32(o + 12, true), contentH: d.getFloat32(o + 16, true), lineSpacing: d.getFloat32(o + 20, true), lineDy, slots,
        fitScale: d.getFloat32(o + 32, true), fitX: d.getFloat32(o + 36, true), fitY: d.getFloat32(o + 40, true), reflowed, rows };
      // where each group of paths sits: {dx, dy, k} triples, and the group of every path
      const ng = ex.qvp_layout_groups(this.h, 0, 0);
      const gp = this.e.buf(ng * 16);
      ex.qvp_layout_groups(this.h, gp, ng);
      L.groups = new Float32Array(this.e.mem.buffer.slice(gp, gp + ng * 16));
      const np = ex.qvp_layout_path_groups(this.h, 0, 0);
      if (np) { const pp = this.e.buf(np * 4); ex.qvp_layout_path_groups(this.h, pp, np); L.pathGroup = new Uint32Array(this.e.mem.buffer.slice(pp, pp + np * 4)); }
      else L.pathGroup = null;
      // paths this layout leaves undrawn: sheet furniture and a native surah frame hidden by the spec or reflow
      const no = ex.qvp_layout_omitted_paths(this.h, 0, 0);
      if (no) { const op = this.e.buf(no * 4); ex.qvp_layout_omitted_paths(this.h, op, no); L.omitted = new Set(new Uint32Array(this.e.mem.buffer, op, no)); }
      else L.omitted = null;
      // paths drawn a second time elsewhere: a sajdah line whose words ended up on two rows
      const nr = ex.qvp_layout_repeats(this.h, 0, 0);
      L.repeats = [];
      if (nr) {
        const rp = this.e.buf(nr * 24); ex.qvp_layout_repeats(this.h, rp, nr);
        const f = new Float32Array(this.e.mem.buffer.slice(rp, rp + nr * 24));
        for (let i = 0; i < nr; i++) L.repeats.push({ firstPath: f[i * 6], nPaths: f[i * 6 + 1], dx: f[i * 6 + 2], dy: f[i * 6 + 3], kx: f[i * 6 + 4], ky: f[i * 6 + 5] });
      }
      return (this.currentLayout = L);
    }
    // ── the reader's zoom control ──
    /** where the zoom control stands: {mode, step, zoom}. All zero is what a page opens on:
     * stepped, on the printed page. */
    _putZoom(z, at) { const d = this.e.dv(); d.setUint32(at, ZOOM_MODE[z && z.mode] ?? 0, true); d.setUint32(at + 4, (z && z.step) || 0, true); d.setFloat32(at + 8, (z && z.zoom) || 1, true); return at; }
    _getZoom(at) { const d = this.e.dv(); return { mode: ZOOM_MODE_NAME[d.getUint32(at, true)] || 'stepped', step: d.getUint32(at + 4, true), zoom: d.getFloat32(at + 8, true) }; }
    _getZoomChange(at) { return { zoom: this._getZoom(at), view: this.e._getView(at + 12), relaid: !!this.e.dv().getUint32(at + 24, true) }; }
    /** the same control under another policy, keeping the size the reader is at */
    zoomMode(spec, zoom, mode) {
      const s = this.e.scratch2 + 40960; this._writeLayoutSpec(spec, s);
      const z = this._putZoom(zoom, this.e.scratch2 + 41984);
      this.e.ex.qvp_zoom_mode(this.h, s, z, ZOOM_MODE[mode] ?? 0, this.e.scratch);
      return this._getZoom(this.e.scratch);
    }
    /** one frame of a pinch: `factor` is the fingers' distance against their distance when
     * they went down, and (x, y) the point between them. Returns {zoom, view, relaid}. */
    zoomPinch(spec, zoom, view, factor, x, y) {
      const s = this.e.scratch2 + 40960; this._writeLayoutSpec(spec, s);
      const z = this._putZoom(zoom, this.e.scratch2 + 41984);
      const v = this.e._putView(view, this.e.scratch2 + 42000);
      this.e.ex.qvp_zoom_pinch(this.h, s, z, v, factor, x, y, this.e.scratch);
      const c = this._getZoomChange(this.e.scratch);
      // the engine laid the page out inside the call: keep the cached layout with it
      if (c.relaid) this.layoutCurrent();
      return c;
    }
    /** the control moved straight to a step: a size button, a double tap, a reset. Step 0 is
     * the printed page. */
    zoomToStep(spec, zoom, step, view) {
      const s = this.e.scratch2 + 40960; this._writeLayoutSpec(spec, s);
      const z = this._putZoom(zoom, this.e.scratch2 + 41984);
      const v = this.e._putView(view, this.e.scratch2 + 42000);
      this.e.ex.qvp_zoom_to_step(this.h, s, z, step, v, this.e.scratch);
      const c = this._getZoomChange(this.e.scratch);
      if (c.relaid) this.layoutCurrent();
      return c;
    }
    /** `spec` with this control's zoom in it: what the host lays out and draws with */
    zoomSpec(spec, zoom) {
      const s = this.e.scratch2 + 40960; this._writeLayoutSpec(spec, s);
      const z = this._putZoom(zoom, this.e.scratch2 + 41984);
      this.e.ex.qvp_zoom_spec(this.h, s, z, this.e.scratch);
      const v = this.e.dv().getFloat32(this.e.scratch + 48, true);
      // The control owns the reflow zoom alone, and the engine hands every other field back as
      // the host set it. So the host's own spec carries every knob, and only the zoom is read
      // back. On the printed page the zoom is 0 and the knobs stay: dropping them there would
      // leave the pinch that leaves the printed page to lay it out with the engine's defaults.
      if (v > 0 || spec.reflow) return { ...spec, reflow: { ...(spec.reflow || {}), zoom: v } };
      return { ...spec, reflow: null };
    }
    /** The same control on this page: what the reader was reading at, carried onto the page they
     * turned to. A step carries as a step, because every page's steps are its own; a free zoom
     * carries as a size, held inside what this page can reach. */
    zoomCarried(spec, zoom) {
      const s = this.e.scratch2 + 40960; this._writeLayoutSpec(spec, s);
      const z = this._putZoom(zoom, this.e.scratch2 + 41984);
      this.e.ex.qvp_zoom_carried(this.h, s, z, this.e.scratch);
      return this._getZoom(this.e.scratch);
    }
    /** the reflow zoom one step of this page's control means; step 0 is the printed page */
    zoomAtStep(spec, step) {
      const s = this.e.scratch2 + 40960; this._writeLayoutSpec(spec, s);
      return this.e.ex.qvp_zoom_at_step(this.h, s, step);
    }
    /** true once the reader has zoomed in, by either road: a magnified view, or a page reflowed
     * above the printed size. `fitScale` is the scale the page is fitted at (0 = it is at it). */
    zoomIsZoomed(zoom, view, fitScale = 0) {
      return this.e.zoomIsZoomed(zoom, view, fitScale);
    }
    /** what a sideways drag on this page means: 'pan' it, or 'turnPage' */
    sidewaysDrag(zoom, view, fitScale = 0) {
      const z = this._putZoom(zoom, this.e.scratch2 + 41984);
      const v = this.e._putView(view, this.e.scratch2 + 42000);
      return this.e.ex.qvp_sideways_drag(this.h, z, v, fitScale) === 1 ? 'turnPage' : 'pan';
    }
    /** The layout the page already has, without computing one: what to read after a call that
     * laid the page out itself, as the zoom control does. */
    layoutCurrent() {
      const s = this.e.scratch;
      if (!this.e.ex.qvp_layout_current(this.h, s + 128)) return this.currentLayout;
      return this._readLayout(s + 128);
    }
    /** Everything the current layout draws, in drawing order: `{path, placement}` pairs into
     * `layoutPlacements()`. Omitted paths are already gone and a repeated one is already there
     * twice, so one loop draws any page — printed or reflowed. */
    layoutDrawList(bandTop = 0, bandBottom = 0) {
      const n = this.e.ex.qvp_layout_draw_list(this.h, bandTop, bandBottom, 0, 0);
      if (!n) return new Uint32Array(0);
      const p = this.e.buf(n * 8); this.e.ex.qvp_layout_draw_list(this.h, bandTop, bandBottom, p, n);
      return new Uint32Array(this.e.mem.buffer.slice(p, p + n * 8));
    }
    /** what a draw list's `placement` indexes: every group, then every repeat */
    layoutPlacements() {
      const n = this.e.ex.qvp_layout_placements(this.h, 0, 0);
      if (!n) return new Float32Array(0);
      const p = this.e.buf(n * 16); this.e.ex.qvp_layout_placements(this.h, p, n);
      return new Float32Array(this.e.mem.buffer.slice(p, p + n * 16));
    }
    /** the largest reflow zoom at which every word of this page still fits a row */
    reflowMaxZoom(spec) { const s = this.e.scratch; this._writeLayoutSpec(spec, s); return this.e.ex.qvp_reflow_max_zoom(this.h, s); }
    /** the zoom each step of a reader's zoom control lands on for this page, rising */
    zoomLevels(spec, nominals, band) {
      const s = this.e.scratch; this._writeLayoutSpec(spec, s);
      const k = nominals ? nominals.length : 0;
      // one block, two halves: a second `buf` could replace the first and free the nominals
      const b = this.e.buf((k + 8) * 4), np = k ? b : 0, out = b + k * 4;
      if (k) new Float32Array(this.e.mem.buffer, np, k).set(nominals);
      const n = this.e.ex.qvp_zoom_levels(this.h, s, np, k, band || 0, out, 8);
      return Array.from(new Float32Array(this.e.mem.buffer, out, n));
    }
    /** the zoom steps this page ships with, lowest first; zoom 1 is the step before them */
    zoomSteps(spec) {
      const s = this.e.scratch; this._writeLayoutSpec(spec, s);
      const out = this.e.buf(8 * 4);
      const n = this.e.ex.qvp_zoom_steps(this.h, s, out, 8);
      return Array.from(new Float32Array(this.e.mem.buffer, out, n));
    }
    /** every zoom the search weighs for one step of a zoom control, with its cost */
    zoomLevelCandidates(spec, nominal, band, floor) {
      const s = this.e.scratch; this._writeLayoutSpec(spec, s);
      // one block, two halves: a second `buf` could replace the first and free it
      const N = 64, z = this.e.buf(N * 8), c = z + N * 4;
      const n = this.e.ex.qvp_zoom_level_candidates(this.h, s, nominal, band || 0, floor || 0, z, c, N);
      const zs = new Float32Array(this.e.mem.buffer, z, n), cs = new Float32Array(this.e.mem.buffer, c, n);
      return Array.from(zs, (v, i) => ({ zoom: v, cost: cs[i] }));
    }
    /** the words of a reflowed row, in reading order */
    rowWords(row) {
      const n = this.e.ex.qvp_layout_row_words(this.h, row, 0, 0);
      if (!n) return [];
      const p = this.e.buf(n * 4); this.e.ex.qvp_layout_row_words(this.h, row, p, n);
      return Array.from(new Uint32Array(this.e.mem.buffer, p, n));
    }
    /** the row a word landed on in a reflowed layout, or null */
    wordRow(word) { const r = this.e.ex.qvp_layout_word_row(this.h, word); return r === 0xffffffff ? null : r; }
    /** the view that puts a point inside a word (nx, ny from 0 to 1) at a place on the screen,
     * then clamps: how a pinch holds its place when the layout reflows under it */
    viewAnchor(view, word, nx, ny, toX, toY, viewportW, viewportH) {
      const i = this.e._putView(view, this.e.scratch2 + 32768);
      this.e.ex.qvp_view_anchor(this.h, i, word, nx, ny, toX, toY, viewportW, viewportH, this.e.scratch);
      return this.e._getView(this.e.scratch);
    }
    /** Which band of the current layout to keep drawn, `{top, height}` in layout px: the whole
     * page when it fits, otherwise two screens around the reader. The top moves in steps, so a
     * pan inside one step redraws nothing; pass `top` and `top + height` to `layoutDrawList`.
     * `maxHeight` is the tallest band the host can draw and `maxPixels` the pixels it keeps for
     * one, both in viewport px; 0 takes `MAX_INK_HEIGHT` and no pixel limit. The pixel limit
     * never takes the band below one screen. */
    layoutInkBand(view, viewportW, viewportH, { maxHeight = 0, maxPixels = 0 } = {}) {
      const i = this.e._putView(view, this.e.scratch2 + 32768);
      this.e.ex.qvp_layout_ink_band(this.h, i, viewportW, viewportH, maxHeight, maxPixels, this.e.scratch);
      const f = new Float32Array(this.e.mem.buffer, this.e.scratch, 2);
      return { top: f[0], height: f[1] };
    }
    /** where a viewport point lands in the laid-out page, for turning a touch into a hit test */
    viewToLayout(view, vx, vy) {
      const i = this.e._putView(view, this.e.scratch2 + 32768);
      this.e.ex.qvp_view_to_layout(this.h, i, vx, vy, this.e.scratch);
      const f = new Float32Array(this.e.mem.buffer, this.e.scratch, 2);
      return { x: f[0], y: f[1] };
    }
    wordBoundsView(i) { this.e.ex.qvp_word_bounds_view(this.h, i, this.e.scratch); const f = new Float32Array(this.e.mem.buffer, this.e.scratch, 4); return { x0: f[0], y0: f[1], x1: f[2], y1: f[3] }; }

    // ── styles (handles undo exactly) ──
    style(sel, color, { ms = 0, layer = LAYER.BASE } = {}) { return this.e.ex.qvp_style_add(this.h, layer, writeSel(this.e, this.e.scratch2 + 12288, sel), rgba(color), ms); }
    styleTarget(target, color, { ms = 0, layer = LAYER.BASE } = {}) { return this.e._withInputs(() => this.e.ex.qvp_style_add_target(this.h, layer, this._target(target), rgba(color), ms)); }
    removeStyle(handle) { return this.e.ex.qvp_style_remove(this.h, handle); }
    recolorStyle(handle, color, ms = 0) { return this.e.ex.qvp_style_recolor(this.h, handle, rgba(color), ms); }
    hide(sel) { return this.e.ex.qvp_style_hide(this.h, writeSel(this.e, this.e.scratch2 + 12288, sel)); }
    clearStyles() { this.e.ex.qvp_style_clear(this.h); }
    clearLayer(layer) { this.e.ex.qvp_style_clear_layer(this.h, layer); }
    setDefaultColor(color) { this._defaultInk = rgba(color); this.e.ex.qvp_style_default_color(this.h, this._defaultInk); }
    get defaultInk() { return this._defaultInk; }
    /** {ink, diacritics, dots, waqf, sifr, ayahMark, numeral, headers, marks: {name: colour}, ms} → handle */
    theme(t) {
      const pairs = Object.entries(t.marks || {}).flatMap(([m, col]) => [markId(m), rgba(col)]);
      return this.e._withInputs(() => {
        // the pairs first: a long list takes a new block, which can move the memory
        const mp = pairs.length ? this.e.putU32(Uint32Array.from(pairs), IN.PAIRS) : 0;
        const d = this.e.dv(), at = this.e.scratch2 + 16384, c = v => (v === undefined || v === null ? 0 : rgba(v));
        ['ink', 'diacritics', 'dots', 'waqf', 'sifr', 'ayahMark', 'numeral', 'headers'].forEach((k, i) => d.setUint32(at + i * 4, c(t[k]), true));
        d.setUint32(at + 32, t.ms || 0, true);
        d.setUint32(at + 36, mp, true); d.setUint32(at + 40, pairs.length / 2, true);
        return this.e.ex.qvp_theme(this.h, at);
      });
    }
    styleHandles() { return this._u32s((o, c) => this.e.ex.qvp_style_handles(this.h, o, c)); }
    /** every value of a `uint32_t` array getter, however many */
    _u32s(call) { const [at, n] = this.e.collect(4, call); return Array.from(new Uint32Array(this.e.mem.buffer, at, n)); }

    // ── clock & display list ──
    /** advance animations; returns true while something is still moving */
    tick(nowMs) { return !!this.e.ex.qvp_tick(this.h, nowMs); }
    colors() { const p = this.e.ex.qvp_colors(this.h); return new Uint32Array(this.e.mem.buffer.slice(p, p + this.nPaths * 4)); }
    styledPaths() {
      const ex = this.e.ex; const n = ex.qvp_styled_paths(this.h, 0, 0); if (!n) return [];
      const buf = ex.qvp_alloc(n * 8); ex.qvp_styled_paths(this.h, buf, n);
      const v = new Uint32Array(this.e.mem.buffer.slice(buf, buf + n * 8)); ex.qvp_dealloc(buf, n * 8);
      const out = new Array(n); for (let i = 0; i < n; i++) out[i] = [v[i * 2], v[i * 2 + 1]]; return out;
    }
    colorOf(i) { return this.e.ex.qvp_color_of(this.h, i) >>> 0; }

    // ── highlights ──
    /** style: {mode:'ink'|'band'|'both', height:'lineSpacing'|'ink', ink, band, padX, padY, radius, seam, ms, layer} */
    highlight(target, style = {}) { return this.e._withInputs(() => this.e.ex.qvp_highlight_add(this.h, this._target(target), writeHl(this.e, this.e.scratch2 + 24576, style))); }
    moveHighlight(handle, target) { return !!this.e._withInputs(() => this.e.ex.qvp_highlight_move(this.h, handle, this._target(target))); }
    restyleHighlight(handle, style) { return !!this.e.ex.qvp_highlight_restyle(this.h, handle, writeHl(this.e, this.e.scratch2 + 24576, style)); }
    removeHighlight(handle) { return !!this.e.ex.qvp_highlight_remove(this.h, handle); }
    clearHighlights() { this.e.ex.qvp_highlight_clear(this.h); }
    highlightHandles() { return this._u32s((o, c) => this.e.ex.qvp_highlight_handles(this.h, o, c)); }
    highlightWords(h) { return this._u32s((o, c) => this.e.ex.qvp_highlight_words(this.h, h, o, c)); }
    /** animated band boxes in viewport px; draw each id as one nonzero path behind the ink */
    highlightBoxesView() { const [at, n] = this.e.collect(32, (o, c) => this.e.ex.qvp_highlight_boxes_view(this.h, o, c)); return readBoxes(this.e, at, n); }
    wordBands(words, { height = 'lineSpacing', padX = DEFAULTS.HIGHLIGHT_PAD_X, padY = DEFAULTS.HIGHLIGHT_PAD_Y } = {}) { const [at, n] = this.e._withInputs(() => { const wp = this.e.putU32(Uint32Array.from(words)); return this.e.collect(32, (o, c) => this.e.ex.qvp_word_bands(this.h, wp, words.length, height === 'ink' ? 1 : 0, padX, padY, o, c)); }); return readBoxes(this.e, at, n); }

    // ── selection ──
    select(anchor, focus = anchor) { this.e.ex.qvp_select(this.h, anchor < 0 ? NONE : anchor, focus < 0 ? NONE : focus); }
    clearSelection() { this.e.ex.qvp_select(this.h, NONE, NONE); }
    selection() { return this._u32s((o, c) => this.e.ex.qvp_selection(this.h, o, c)); }
    selectionText(form = 'rasm_uthmani', includeCitation = false) { this.e.ex.qvp_selection_text(this.h, FORM[form] ?? 0, includeCitation ? 1 : 0, this.e.scratch); return this.e.qstr(this.e.scratch); }

    // ── memorisation ──
    mask(target, mode = 'hide') { this.e._withInputs(() => this.e.ex.qvp_mask(this.h, this._target(target), { hide: 0, block: 1, blur: 2 }[mode] ?? 0)); }
    maskFrom(i, mode = 'hide') { this.e.ex.qvp_mask_from(this.h, i, { hide: 0, block: 1, blur: 2 }[mode] ?? 0); }
    maskOptions({ blockColor = DEFAULTS.MASK_BLOCK, padX = DEFAULTS.MASK_PAD, padY = DEFAULTS.MASK_PAD, radius = DEFAULTS.MASK_RADIUS, reverse = false } = {}) { this.e.ex.qvp_mask_options(this.h, rgba(blockColor), padX, padY, radius, reverse ? 1 : 0); }
    unmaskNext(n = 1) { return this.e.ex.qvp_unmask_next(this.h, n); }
    maskBack(n = 1) { return this.e.ex.qvp_mask_back(this.h, n); }
    unmaskWord(i) { return !!this.e.ex.qvp_unmask_word(this.h, i); }
    maskWord(i) { return !!this.e.ex.qvp_mask_word(this.h, i); }
    unmaskAll() { this.e.ex.qvp_unmask_all(this.h); }
    maskAll() { this.e.ex.qvp_mask_all(this.h); }
    unmask() { this.e.ex.qvp_unmask(this.h); }
    maskHidden() { return this._u32s((o, c) => this.e.ex.qvp_mask_hidden(this.h, o, c)); }
    maskWords() { return this._u32s((o, c) => this.e.ex.qvp_mask_words(this.h, o, c)); }
    /** band boxes for a word list in viewport px through the current layout */
    wordBandsView(words, { height = 'lineSpacing', padX = DEFAULTS.HIGHLIGHT_PAD_X, padY = DEFAULTS.HIGHLIGHT_PAD_Y } = {}) { const [at, n] = this.e._withInputs(() => { const wp = this.e.putU32(Uint32Array.from(words)); return this.e.collect(32, (o, c) => this.e.ex.qvp_word_bands_view(this.h, wp, words.length, height === 'ink' ? 1 : 0, padX, padY, o, c)); }); return readBoxes(this.e, at, n); }
    maskBoxesView() { const [at, n] = this.e.collect(32, (o, c) => this.e.ex.qvp_mask_boxes_view(this.h, o, c)); return readBoxes(this.e, at, n); }
    /** greyed page with a lit window: {lit, byAyah, grey, ink, ayahMarks, ms} → steps */
    revealStart({ lit = DEFAULTS.REVEAL_LIT, byAyah = false, grey = DEFAULTS.REVEAL_GREY, ink = DEFAULTS.INK, ayahMarks = true, ms = 0 } = {}) { return this.e.ex.qvp_reveal_start(this.h, lit, byAyah ? 1 : 0, rgba(grey), rgba(ink), ayahMarks ? 1 : 0, ms); }
    revealGoto(at) { return !!this.e.ex.qvp_reveal_goto(this.h, BigInt(at)); }
    revealPosition() { const v = Number(this.e.ex.qvp_reveal_position(this.h)); return v === -2 ? null : v; }
    revealStepCount() { return this.e.ex.qvp_reveal_step_count(this.h); }
    revealStepOf(i) { return Number(this.e.ex.qvp_reveal_step_of(this.h, i)); }
    revealStop() { this.e.ex.qvp_reveal_stop(this.h); }

    // ── crop ──
    cropBounds(target, { pad = DEFAULTS.CROP_PAD, keepAyahMarks = true } = {}) { if (!this.e._withInputs(() => this.e.ex.qvp_crop_bounds(this.h, this._target(target), pad, keepAyahMarks ? 1 : 0, this.e.scratch))) return null; const d = this.e.dv(), s = this.e.scratch; return { x0: d.getFloat32(s, true), y0: d.getFloat32(s + 4, true), x1: d.getFloat32(s + 8, true), y1: d.getFloat32(s + 12, true), nWords: d.getUint32(s + 16, true), ayahMarkDecoration: d.getUint32(s + 20, true) }; }
    cropSvg(target, { pad = DEFAULTS.CROP_PAD, keepAyahMarks = true, background = null } = {}) { if (!this.e._withInputs(() => this.e.ex.qvp_crop_svg(this.h, this._target(target), pad, keepAyahMarks ? 1 : 0, background ? rgba(background) : 0, this.e.scratch))) return null; return this.e.qstr(this.e.scratch); }
  }

  /** The cross-page lookup: which page an ayah, a surah or a division is on. Make one with `engine.loadAtlas`. */
  class QvpAtlas {
    constructor(engine, handle) { this.e = engine; this._h = handle; engine._live.add(this); }
    /** the engine's handle; a freed atlas has none */
    get h() { if (!this._h) throw new Error('QvpAtlas was freed'); return this._h; }
    /** Free the engine's atlas. Safe to call more than once; every call that reaches the engine
     * after it throws. Does nothing after `engine.free()`, which freed the atlas. */
    free() { if (this._h) { this.e.ex.qvp_atlas_free(this._h); this._h = 0; this.e._live.delete(this); } }
    pageOf(surah, ayah) { const p = this.e.ex.qvp_atlas_page_of(this.h, surah, ayah); return p < 0 ? null : p; }
    pageRange(page) { if (!this.e.ex.qvp_atlas_page_range(this.h, page, this.e.scratch)) return null; const v = new Uint16Array(this.e.mem.buffer, this.e.scratch, 4); return { first: [v[0], v[1]], last: [v[2], v[3]] }; }
    _surah(s) { const d = this.e.dv(); return { number: d.getUint16(s, true), page: d.getUint16(s + 2, true), ayahCount: d.getUint16(s + 4, true), place: names('place')[d.getUint8(s + 6)] || '', arabic: this.e.qstr(s + 8), latin: this.e.qstr(s + 16), english: this.e.qstr(s + 24) }; }
    surah(n) { return this.e.ex.qvp_atlas_surah(this.h, n, this.e.scratch) ? this._surah(this.e.scratch) : null; }
    surahs() { const n = this.e.ex.qvp_atlas_surah_count(this.h), out = []; for (let i = 0; i < n; i++) { this.e.ex.qvp_atlas_surah_at(this.h, i, this.e.scratch); out.push(this._surah(this.e.scratch)); } return out; }
    pageOfSurah(n) { const s = this.surah(n); return s ? s.page : null; }
    /** How many pages the atlas covers. */
    pageCount() { return this.e.ex.qvp_atlas_page_count(this.h); }
    /** The whole atlas as JSON text. */
    json() { this.e.ex.qvp_atlas_json(this.h, this.e.scratch); return this.e.qstr(this.e.scratch); }
    division(kind, n) { if (!this.e.ex.qvp_atlas_division(this.h, { juz: 0, hizb: 1, nisf: 2, rubu_al_hizb: 3 }[kind], n, this.e.scratch)) return null; const v = new Uint16Array(this.e.mem.buffer, this.e.scratch, 4); return { rubuAlHizb: v[0], surah: v[1], ayah: v[2], page: v[3], ayahKey: `${v[1]}:${v[2]}` }; }
    juz(n) { return this.division('juz', n); }
    hizb(n) { return this.division('hizb', n); }
    rubuAlHizb(n) { return this.division('rubu_al_hizb', n); }
    divisionOf(kind, surah, ayah) { const v = this.e.ex.qvp_atlas_division_of(this.h, { juz: 0, hizb: 1, nisf: 2, rubu_al_hizb: 3 }[kind], surah, ayah); return v < 0 ? null : v; }
    juzOf(surah, ayah) { return this.divisionOf('juz', surah, ayah); }
    pagesOfJuz(n) { if (!this.e.ex.qvp_atlas_pages_of_juz(this.h, n, this.e.scratch)) return null; const v = new Uint16Array(this.e.mem.buffer, this.e.scratch, 2); return [v[0], v[1]]; }
    searchSurahs(text) { const [at, c] = this.e._withInputs(() => { const [p, n] = this.e.putStr(text); return this.e.collect(2, (o, cap) => this.e.ex.qvp_atlas_search_surahs(this.h, p, n, o, cap)); }); return Array.from(new Uint16Array(this.e.mem.buffer, at, c)).map(k => this.surah(k)); }
  }

  // where the rows of a passage start (QVP_ALIGN_*)
  const PASSAGE_ALIGN = { right: 0, center: 1, centre: 1, justified: 2 };

  /**
   * A contiguous range of complete ayahs, or a surah's basmalah, laid out on rows away from
   * its page. It copies what it needs, so its pages can be freed once it is loaded. Lengths
   * of a layout are layout px: a point (x, y) of a path draws at
   * `scale · (kx · x + dx), scale · (ky · y + dy)` under the draw's placement.
   */
  class QvpPassage {
    constructor(engine, handle, surah, from) {
      this.e = engine; this._h = handle;
      const ex = engine.ex, s = engine.scratch;
      /** the ayahs in reading order, each with its text from the page's own word records */
      this.ayahs = Array.from({ length: ex.qvp_passage_ayah_count(handle) }, (_, i) => { ex.qvp_passage_ayah_text(handle, i, s); return { surah, ayah: from + i, text: engine.qstr(s) }; });
      /** the printed line spacing of the first word, page units. Every word has that size. */
      this.lineSpacing = ex.qvp_passage_line_spacing(handle);
      /** the last layout */
      this.currentLayout = null;
      engine._live.add(this);
    }
    /** the engine's handle; a freed passage has none */
    get h() { if (!this._h) throw new Error('QvpPassage was freed'); return this._h; }
    /** Free the engine's passage. Safe to call more than once; every call that reaches the
     * engine after it throws. Does nothing after `engine.free()`, which freed the passage. */
    free() { if (this._h) { this.e.ex.qvp_passage_free(this._h); this._h = 0; this.e._live.delete(this); } }
    /** Write a passage spec (QvpPassageSpec, 32 bytes) at `at`. A knob left out takes the
     * engine's default, and so does `maxStretch` 0. */
    _writeSpec(spec, at) {
      const align = spec.align == null ? 0 : PASSAGE_ALIGN[spec.align];
      if (align === undefined) throw new Error('bad align ' + spec.align);
      const d = this.e.dv();
      d.setFloat32(at, spec.width ?? 0, true); d.setFloat32(at + 4, spec.scale ?? 1, true);
      d.setFloat32(at + 8, spec.lineSpacing ?? 1, true); d.setFloat32(at + 12, spec.padding ?? 2, true);
      d.setUint8(at + 16, align); d.setUint8(at + 17, spec.keepAyahMark ? 1 : 0); d.setUint16(at + 18, 0, true);
      d.setUint32(at + 20, spec.maxRows || 0, true); d.setFloat32(at + 24, spec.ellipsisWidth || 0, true);
      d.setFloat32(at + 28, spec.maxStretch ?? 0, true);
      return at;
    }
    /** `n` records of `size` bytes from an array getter, each read by `record(view, offset)` */
    _collect(getter, n, size, record) {
      // The engine takes a buffer even for an empty answer, so the smallest ask is one record.
      const p = this.e.buf(Math.max(1, n) * size), got = Math.min(getter(this.h, p, n), n), d = this.e.dv();
      return Array.from({ length: got }, (_, i) => record(d, p + i * size));
    }
    /** Lay the passage out at `spec` and keep the layout: {width, height, scale, lineSpacing,
     * isTruncated, ellipsis, rows, words, ayahs, draws, placements}. Null when the spec is out
     * of range, and the last layout then stays. Spec: {width, scale, lineSpacing, padding, align:
     * 'right'|'center'|'justified', maxRows, keepAyahMark, ellipsisWidth, maxStretch}. */
    layout(spec = {}) {
      if (spec.maxRows < 0) return null;
      const ex = this.e.ex, s = this.e.scratch;
      const sp = this._writeSpec(spec, this.e.scratch2 + 43008);
      if (!ex.qvp_passage_layout(this.h, sp, s)) return null;
      const d = this.e.dv();
      const nRows = d.getUint32(s + 16, true), nWords = d.getUint32(s + 20, true), nAyahs = d.getUint32(s + 24, true), nDraws = d.getUint32(s + 28, true);
      const isTruncated = !!d.getUint8(s + 32);
      const L = { width: d.getFloat32(s, true), height: d.getFloat32(s + 4, true), scale: d.getFloat32(s + 8, true), lineSpacing: d.getFloat32(s + 12, true), isTruncated,
        // after a cut, where the host draws its ellipsis: from the last row's top to its baseline
        ellipsis: isTruncated ? { x0: d.getFloat32(s + 36, true), y0: d.getFloat32(s + 40, true), x1: d.getFloat32(s + 44, true), y1: d.getFloat32(s + 48, true) } : null };
      L.rows = this._collect(ex.qvp_passage_rows, nRows, 20, (v, o) => ({ x0: v.getFloat32(o, true), y0: v.getFloat32(o + 4, true), x1: v.getFloat32(o + 8, true), y1: v.getFloat32(o + 12, true), baseline: v.getFloat32(o + 16, true) }));
      L.words = this._collect(ex.qvp_passage_words, nWords, 44, (v, o) => ({ surah: v.getUint16(o, true), ayah: v.getUint16(o + 2, true), word: v.getUint16(o + 4, true), page: v.getUint16(o + 6, true), row: v.getUint32(o + 8, true),
        x0: v.getFloat32(o + 12, true), y0: v.getFloat32(o + 16, true), x1: v.getFloat32(o + 20, true), y1: v.getFloat32(o + 24, true),
        wordX0: v.getFloat32(o + 28, true), wordY0: v.getFloat32(o + 32, true), wordX1: v.getFloat32(o + 36, true), wordY1: v.getFloat32(o + 40, true) }));
      L.ayahs = this._collect(ex.qvp_passage_ayahs, nAyahs, 20, (v, o) => ({ surah: v.getUint16(o, true), ayah: v.getUint16(o + 2, true), x0: v.getFloat32(o + 4, true), y0: v.getFloat32(o + 8, true), x1: v.getFloat32(o + 12, true), y1: v.getFloat32(o + 16, true) }));
      // every path to draw, in drawing order: page number, path index on that page, placement index
      L.draws = this._collect(ex.qvp_passage_draw_list, nDraws, 12, (v, o) => ({ page: v.getUint32(o, true), path: v.getUint32(o + 4, true), placement: v.getUint32(o + 8, true) }));
      const nPlacements = ex.qvp_passage_placements(this.h, 0, 0);
      L.placements = this._collect(ex.qvp_passage_placements, nPlacements, 16, (v, o) => ({ dx: v.getFloat32(o, true), dy: v.getFloat32(o + 4, true), kx: v.getFloat32(o + 8, true), ky: v.getFloat32(o + 12, true) }));
      return (this.currentLayout = L);
    }
  }

  /**
   * The ornaments of other mushafs and fonts, from `ornaments.qvo`. None of these
   * outlines is part of a QVP page. Each ornament says what it may be redistributed under.
   * Read `licence` before you publish a page wearing it.
   */
  class QvpOrnaments {
    constructor(engine, handle) {
      this.e = engine; this._h = handle;
      this.count = engine.ex.qvp_ornament_count(handle);
      /** every ornament: {index, kind, lineage, style, riwayah, hasSlices, licence, parts} */
      this.list = Array.from({ length: this.count }, (_, i) => this._ornament(i));
      engine._live.add(this);   // last: a set the engine refuses to describe is freed by loadOrnaments, not by engine.free
    }
    /** the engine's handle; a freed set has none */
    get h() { if (!this._h) throw new Error('QvpOrnaments was freed'); return this._h; }
    /** Free the engine's ornament set. Safe to call more than once; every call that reaches the
     * engine after it throws. Does nothing after `engine.free()`, which freed the set. */
    free() { if (this._h) { this.e.ex.qvp_ornaments_free(this._h); this._h = 0; this.e._live.delete(this); } }
    // Every index below the set's counts has a record; a 0 is the engine refusing the set, and the load fails.
    _ornament(i) {
      const s = this.e.scratch;
      if (!this.e.ex.qvp_ornament_info(this.h, i, s)) throw refused('qvp_ornament_info', i, 'the ornament set');
      const d = this.e.dv(), u = k => d.getUint32(s + k * 4, true);
      return {
        index: i, kind: ORNAMENT_KIND[u(0)], lineage: LINEAGE[u(1)], style: this.e.qstr(s + 24), riwayah: this.e.qstr(s + 32), hasSlices: !!u(3),
        licence: { id: this.e.qstr(s + 40), status: this.e.qstr(s + 48), redistributable: !!u(4), attribution: this.e.qstr(s + 56) },
        // one entry per printed colour; `slot` in a design's palette is the window it leaves open; it has alpha 0
        parts: Array.from({ length: u(2) }, (_, k) => this._part(i, k)),
      };
    }
    _part(i, k) {
      const s = this.e.scratch2 + 4096;   // not `scratch`: an ornament is being read out of it
      if (!this.e.ex.qvp_ornament_part(this.h, i, k, s)) throw refused('qvp_ornament_part', `${i}, ${k}`, 'the ornament set');
      const d = this.e.dv();
      return { index: k, color: d.getUint32(s, true), stroke: !!d.getUint32(s + 4, true), name: this.e.qstr(s + 8) };
    }
    /** the ornament of `kind` ('ayah_mark' | 'surah_header' | 'page_frame') in `style`, or null */
    find(kind, style) { const i = this.e._withInputs(() => this.e.ex.qvp_ornament_find(this.h, ORNAMENT_KIND.indexOf(kind), ...this.e.putStr(style))); return i < 0 ? null : this.list[i]; }
    /** the ornaments of one kind */
    ofKind(kind) { return this.list.filter(o => o.kind === kind); }
    /** every style in the set, with the ornament it has of each kind or null:
     * [{style, riwayah, lineage, ayahMark, surahHeader, pageFrame}], in the set's order */
    styles() {
      const out = [];
      for (const o of this.list) {
        let s = out.find(x => x.style === o.style);
        if (!s) { s = { style: o.style, riwayah: o.riwayah, lineage: o.lineage, ayahMark: null, surahHeader: null, pageFrame: null }; out.push(s); }
        s[{ ayah_mark: 'ayahMark', surah_header: 'surahHeader', page_frame: 'pageFrame' }[o.kind]] = o;
      }
      return out;
    }
  }

  /**
   * Canvas2D host renderer. Order: highlight bands → base ink (cached) → styled ink → mask boxes.
   * Call `page.tick(performance.now())` before `draw` each frame; keep drawing while it returns true.
   */
  class CanvasRenderer {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.base = document.createElement('canvas'); this.baseKey = '';
      // the engine's draw list for the band in hand, kept until the band moves
      this.list = null; this.places = null; this.listKey = '';
      /// How much ink to keep ready at once: a page that fits is drawn once and scrolling never
      /// draws again. About 17 MB for a page of this mushaf at the first zoom step.
      this.inkBudget = 64 << 20;
      // the ornament layer's raster, its key, and the layout it was drawn under
      this.ornamentLayer = null; this.ornamentKey = ''; this.ornamentFor = null;
      this.stats = { baseMs: 0, overlayMs: 0, basePaths: 0, overlayPaths: 0, bands: 0 };
    }
    /**
     * The ornament layer, behind everything else. Each draw carries the placement its
     * ink is drawn under, so it moves with its word or title under any layout; the
     * border carries none and sits in layout space. Rasterised once per band, like the
     * base ink, so a scroll inside the band is one blit: a tiled border is hundreds of
     * outlines and nothing about it changes while a highlight animates or the reader
     * scrolls. The engine's band of a dressed page holds every part of the border on the
     * screen, except under a screen taller than the tallest band, where the band keeps the
     * page's ink and the top of the border can be clipped. So the layer is the band, the same
     * rows as the base ink. A new layout
     * redraws it, as it moves the placements.
     */
    drawOrnaments(c, page, view, dpr, bandTop, bandH, bandView) {
      const info = page.dressInfo();
      if (!info) { this.ornamentLayer = null; this.ornamentKey = ''; this.ornamentFor = null; return; }
      // the band, held to the tallest canvas a browser makes, which the band reaches only by rounding
      const W = this.canvas.width, H = Math.min(MAX_CANVAS_PX, Math.max(1, Math.ceil(bandH * dpr)));
      const L = page.currentLayout;
      // `page.h` is the page's engine handle, unique while the page is open: two dressed pages
      // drawn by one renderer with no layout would otherwise share a revision and a raster
      const key = `${page.h}|${view.scale.toFixed(4)}|${view.offsetX.toFixed(1)}|${bandTop.toFixed(1)}|${dpr}|${info.revision}|${W}x${H}`;
      if (!this.ornamentLayer || key !== this.ornamentKey || this.ornamentFor !== L) {
        if (!this.ornamentLayer) this.ornamentLayer = document.createElement('canvas');
        this.ornamentLayer.width = W; this.ornamentLayer.height = H;
        const b = this.ornamentLayer.getContext('2d');
        const v = bandView;
        let cur = -2;
        for (const o of page.dressGeometry()) {
          if (o.placement !== cur) {
            const [a, d, tx, ty] = o.placement === null ? this.placementTransform(page, v, { dx: 0, dy: 0, kx: 1, ky: 1 }, dpr) : this.groupTransform(page, v, o.placement, dpr);
            b.setTransform(a, 0, 0, d, tx, ty);
            cur = o.placement;
          }
          if (o.stroke) { b.strokeStyle = css(o.color); b.lineWidth = o.strokeWidth; b.lineCap = 'round'; b.lineJoin = 'round'; b.stroke(o.path); }
          else { b.fillStyle = css(o.color); b.fill(o.path, o.evenOdd ? 'evenodd' : 'nonzero'); }
        }
        this.ornamentKey = key; this.ornamentFor = L;
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.ornamentLayer, 0, Math.round(dpr * (view.offsetY + bandTop)));
    }
    /** transform of one group of paths: a point p is drawn at (kx·p.x + dx, ky·p.y + dy), page units */
    groupTransform(page, view, group, dpr) {
      const L = page.currentLayout || { scale: 1, offsetX: 0, offsetY: 0, lineDy: null, groups: null };
      let dx = 0, dy = 0, kx = 1, ky = 1;
      if (L.groups && L.groups.length > group * 4) { dx = L.groups[group * 4]; dy = L.groups[group * 4 + 1]; kx = L.groups[group * 4 + 2]; ky = L.groups[group * 4 + 3]; }
      else if (L.lineDy) dy = L.lineDy[group] || 0;
      return this.placementTransform(page, view, { dx, dy, kx, ky }, dpr);
    }
    /** transform of one placement: [a, d, tx, ty] for setTransform(a, 0, 0, d, tx, ty) */
    placementTransform(page, view, p, dpr) {
      const L = page.currentLayout || { scale: 1, offsetX: 0, offsetY: 0 };
      const s = dpr * view.scale * L.scale;
      return [s * p.kx, s * p.ky, dpr * (view.offsetX + view.scale * (L.offsetX + p.dx * L.scale)), dpr * (view.offsetY + view.scale * (L.offsetY + p.dy * L.scale))];
    }
    /** Get the transform of one printed line as [scale, tx, ty], for a host overlay on that line. */
    lineTransform(page, view, line, dpr) { const [a, , tx, ty] = this.groupTransform(page, view, line, dpr); return [a, tx, ty]; }
    /** Draw a passage layout into a context, its top left at (x, y) in CSS px: every draw under
     * its placement, with the path from the page the draw names. `pages` maps a page number to
     * its QvpPage (a Map or an object). `ink` is one colour, or `(page, path) => colour` to pick
     * an ink per path, from its page's `pathKind` for instance. */
    static drawPassage(c, layout, pages, { x = 0, y = 0, dpr = 1, ink = DEFAULTS.INK } = {}) {
      const pageOf = n => { const p = pages instanceof Map ? pages.get(n) : pages[n]; if (!p) throw new Error('the passage draws page ' + n + ', which was not given'); return p; };
      const k = dpr * layout.scale, perPath = typeof ink === 'function';
      if (!perPath) c.fillStyle = css(rgba(ink));
      let page = null, paths = null, cur = -1;
      for (const dr of layout.draws) {
        if (!page || page.page !== dr.page) { page = pageOf(dr.page); paths = page.buildPaths(); }
        if (dr.placement !== cur) {
          const p = layout.placements[dr.placement];
          c.setTransform(k * p.kx, 0, 0, k * p.ky, dpr * (x + layout.scale * p.dx), dpr * (y + layout.scale * p.dy));
          cur = dr.placement;
        }
        if (perPath) c.fillStyle = css(rgba(ink(page, dr.path)));
        c.fill(paths[dr.path], page.pathEvenOdd(dr.path) ? 'evenodd' : 'nonzero');
      }
    }
    /** put a context into one group's space, so a host overlay lands where the group is drawn */
    setGroupTransform(c, page, view, group, dpr) { const [a, d, tx, ty] = this.groupTransform(page, view, group, dpr); c.setTransform(a, 0, 0, d, tx, ty); }
    /** the group a path is drawn with: its reflow group, or its printed line */
    pathGroup(page, i) { const L = page.currentLayout; return L && L.pathGroup ? L.pathGroup[i] : page.pathLine(i); }
    /** boxes are in layout viewport px; view adds pan/zoom on top */
    drawBoxes(c, boxes, view, dpr) {
      c.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offsetX, dpr * view.offsetY);
      let cur = null, col = 0;
      const flush = () => { if (cur) { c.fillStyle = css(col); c.fill(cur, 'nonzero'); cur = null; } };
      for (const b of boxes) {
        if (!cur || b.id !== cur.id || b.color !== col) { flush(); cur = new Path2D(); cur.id = b.id; col = b.color; }
        if (b.radius > 0) cur.roundRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, b.radius); else cur.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      }
      flush();
    }
    /**
     * Draw one frame of the page into the canvas: the view's pan and zoom on top of the current
     * layout, at `dpr` device px per CSS px. The base ink is cached between frames.
     */
    draw(page, view, dpr) {
      const paths = page.buildPaths();
      const styled = page.styledPaths();
      const styledSet = new Set(styled.map(s => s[0]));
      const L = page.currentLayout || { scale: 1, offsetX: 0, offsetY: 0, lineDy: null, lineSpacing: 0 };
      const ink = page.defaultInk;
      const W = this.canvas.width, H = this.canvas.height;
      // The cached ink is a band of the page, not the screen, so scrolling inside it is one
      // blit and nothing is drawn again. The engine picks the band: the whole page when it
      // fits, otherwise two screens around the reader, with a top that moves in steps. It is
      // asked in device px, so its limits are the canvas's own: the tallest canvas a browser
      // makes, and the ink budget at four bytes a pixel.
      const scale = view.scale || 1;
      const band = page.layoutInkBand({ scale: scale * dpr, offsetX: view.offsetX * dpr, offsetY: view.offsetY * dpr }, W, H,
        { maxHeight: MAX_CANVAS_PX, maxPixels: this.inkBudget / 4 });
      // the ink drawn into the band, in layout px: what the engine is asked for
      const cullTop = band.top, cullBottom = band.top + band.height;
      const bandTop = band.top * scale, bandH = band.height * scale;   // view px
      // the view the band is rendered under: the reader's, less where the band starts
      const bandView = { ...view, offsetY: -bandTop };
      const key = `${view.scale.toFixed(4)}|${view.offsetX.toFixed(1)}|${bandTop.toFixed(1)}|${dpr}|${ink}|${L.scale}|${L.lineSpacing}|${L.lineDy ? L.lineDy[0] : ''}|${L.groups ? L.groups.length + ':' + L.groups[1] : ''}|${(L.repeats || []).length}|${L.omitted ? L.omitted.size : 0}|${[...styledSet].sort((a, b) => a - b).join(',')}`;
      // The engine says what is drawn and where: each path once under its placement, again for
      // every row a decoration repeats over, and nothing for a path this layout leaves out. It
      // is asked once per band, not once per frame: a scroll inside the band changes neither.
      const listKey = `${page.page}|${cullTop.toFixed(1)}|${cullBottom.toFixed(1)}|${L.scale}|${L.rows}|${L.contentH}`;
      if (listKey !== this.listKey) {
        this.list = page.layoutDrawList(cullTop, cullBottom);
        this.places = page.layoutPlacements();
        this.listKey = listKey;
      }
      const list = this.list, places = this.places;
      const setPlace = (c, g, v = view) => {
        const [a, d, tx, ty] = this.placementTransform(page, v, { dx: places[g * 4], dy: places[g * 4 + 1], kx: places[g * 4 + 2], ky: places[g * 4 + 3] }, dpr);
        c.setTransform(a, 0, 0, d, tx, ty);
      };
      const baseH = Math.max(1, Math.ceil(bandH * dpr));
      if (key !== this.baseKey || this.base.width !== W || this.base.height !== baseH) {
        const t0 = performance.now();
        this.base.width = W; this.base.height = baseH;
        const b = this.base.getContext('2d');
        b.fillStyle = css(ink);
        let n = 0, cur = -1;
        for (let k = 0; k < list.length; k += 2) {
          const i = list[k], g = list[k + 1];
          if (styledSet.has(i)) continue;
          if (g !== cur) { setPlace(b, g, bandView); cur = g; }
          b.fill(paths[i], page.pathEvenOdd(i) ? 'evenodd' : 'nonzero'); n++;
        }
        this.baseKey = key; this.stats.baseMs = performance.now() - t0; this.stats.basePaths = n;
      }
      const t1 = performance.now();
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
      this.drawOrnaments(c, page, view, dpr, bandTop, bandH, bandView);
      const bands = page.highlightBoxesView();
      this.drawBoxes(c, bands, view, dpr);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.base, 0, Math.round(dpr * (view.offsetY + bandTop)));
      const colors = new Map(styled);
      let cur = -1;
      for (let k = 0; k < list.length; k += 2) {
        const i = list[k], g = list[k + 1];
        const col = colors.get(i);
        if (col === undefined || (col & 255) === 0) continue;
        if (g !== cur) { setPlace(c, g); cur = g; }
        c.fillStyle = css(col); c.fill(paths[i], page.pathEvenOdd(i) ? 'evenodd' : 'nonzero');
      }
      this.drawBoxes(c, page.maskBoxesView(), view, dpr);
      this.stats.overlayMs = performance.now() - t1; this.stats.overlayPaths = styled.length; this.stats.bands = bands.length;
    }
  }

  global.QVP = { QvpEngine, QvpPage, QvpAtlas, QvpOrnaments, QvpPassage, CanvasRenderer, Sel, T, KIND, FAMILY, CATEGORY, DECORATION, FORM, LAYER, NAMES_TABLE, DEFAULTS, NONE, css, rgba, parseTarget };
})(typeof window !== 'undefined' ? window : globalThis);
