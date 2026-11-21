// Use these QVP browser bindings with their paired renderer WASM.
const n = (function() {
    let t = 4294967295,
        n = [`ayah_mark`, `surah_header`, `page_frame`],
        r = [`scan`, `font`],
        i = 16384,
        a = {
            stepped: 0,
            continuous: 1,
            magnify: 2
        },
        o = [`stepped`, `continuous`, `magnify`],
        s = {
            INK: 589242623,
            HIGHLIGHT_INK: 443803903,
            HIGHLIGHT_BAND: 3601016397,
            HIGHLIGHT_PAD_X: 1.2,
            HIGHLIGHT_PAD_Y: 0,
            HIGHLIGHT_SEAM: .25,
            SELECTION_BAND: 762304064,
            SELECTION_PAD_X: .6,
            GAP_BIAS: .6,
            TAP_DISTANCE: 6,
            GRID_LINES: 15,
            ASPECT_SLACK: 1.15,
            MASK_BLOCK: 3654600959,
            MASK_PAD: .6,
            MASK_RADIUS: .8,
            REVEAL_LIT: 1,
            REVEAL_GREY: 3385112831,
            CROP_PAD: 2,
            AYAH_MARK_SCALE_SCAN: 1.5,
            MIN_ZOOM: .5,
            MAX_ZOOM: 12,
            ZOOMED_THRESHOLD: 1.02,
            SWIPE_AXIS_RATIO: 1.5,
            SWIPE_DISTANCE: 40,
            SWIPE_VELOCITY: 500,
            ZOOM_SNAP_HYSTERESIS: .03,
            ZOOM_QUANTUM: .01,
            REFLOW_RELAX: .5,
            REFLOW_MAX_STRETCH: 2
        },
        c = {
            BODY: 0,
            MARK: 1,
            AYAH_NUMBER: 2,
            AYAH_MARK_ORNAMENT: 3,
            HEADER_INK: 4,
            ORNAMENT: 5,
            PAGE_NUMBER: 6,
            RUNNING_HEAD: 7,
            OTHER: 255
        },
        l = {
            NONE: 0,
            DIACRITIC: 1,
            TANWIN: 2,
            DOTS: 3,
            WAQF: 4,
            SIFR: 5,
            SAJDAH: 6,
            READING_SIGN: 7
        },
        u = {
            NONE: 0,
            HARAKAH: 1,
            TANWIN: 2,
            LETTER_DOT: 3,
            ORTHOGRAPHIC: 4,
            DABT: 5,
            WAQF: 6,
            READING_SIGN: 7,
            STANDALONE: 8
        },
        d = {
            AYAH_MARK: 0,
            SURAH_NAME: 1,
            BASMALAH: 2,
            DIVISION_MARK: 3,
            SAJDAH_MARK: 4,
            PAGE_NUMBER: 5,
            RUNNING_HEAD: 6,
            OTHER: 255
        },
        f = {
            rasm_uthmani: 0,
            rasm_imlai: 1,
            qpc: 2,
            rasm: 3,
            search: 4
        },
        p = {
            BASE: 0,
            THEME: 10,
            HIGHLIGHT: 50,
            SELECTION: 60,
            TOP: 100
        },
        m = {
            mark: 0,
            kind: 1,
            family: 2,
            category: 3,
            decoration: 4,
            division: 5,
            place: 6
        },
        h = null,
        g = e => {
            if (!h) throw Error(`QvpEngine.init() first: names come from the engine`);
            return h[e]
        },
        _ = (e, t) => {
            if (typeof t != `string`) return t;
            let n = g(e).indexOf(t);
            return n < 0 ? 255 : n
        },
        v = e => Math.round((Number.isNaN(e) ? 0 : Math.min(Math.max(e, 0), 1)) * 255);

    function y(e, t) {
        if (typeof e == `number`) return e >>> 0;
        if (typeof e != `string`) return 0;
        let n = e.trim().replace(`#`, ``);
        return (n.length === 3 || n.length === 4) && (n = [...n].map(e => e + e).join(``)), n.length === 6 && (n += t === void 0 ? `ff` : v(t).toString(16).padStart(2, `0`)), parseInt(n, 16) >>> 0
    }
    let b = e => `rgba(${e>>>24&255},${e>>>16&255},${e>>>8&255},${(e&255)/255})`,
        x = {
            page: () => ({
                selector: 0
            }),
            path: e => ({
                selector: 1,
                a: e
            }),
            wordPath: (e, t) => ({
                selector: 2,
                a: e,
                b: t
            }),
            wordMark: (e, t) => ({
                selector: 3,
                a: e,
                b: t
            }),
            wordMarkNamed: (e, t, n = 0) => ({
                selector: 4,
                a: e,
                b: S(t),
                c: n
            }),
            wordBody: e => ({
                selector: 5,
                a: e
            }),
            wordMarks: e => ({
                selector: 6,
                a: e
            }),
            word: e => ({
                selector: 7,
                a: e
            }),
            ayah: (e, t) => ({
                selector: 8,
                a: e,
                b: t
            }),
            line: e => ({
                selector: 9,
                a: e
            }),
            mark: e => ({
                selector: 10,
                a: S(e)
            }),
            category: e => ({
                selector: 11,
                a: _(`category`, e)
            }),
            family: e => ({
                selector: 12,
                a: _(`family`, e)
            }),
            kind: e => ({
                selector: 13,
                a: _(`kind`, e)
            }),
            decoration: e => ({
                selector: 14,
                a: _(`decoration`, e)
            }),
            decorationIndex: e => ({
                selector: 15,
                a: e
            })
        },
        S = e => _(`mark`, e),
        C = {
            page: () => ({
                target: 0
            }),
            word: e => ({
                target: 1,
                a: e
            }),
            words: e => ({
                target: 2,
                words: e
            }),
            ayah: (e, t) => ({
                target: 3,
                a: e,
                b: t
            }),
            ayahRange: (e, t, n) => ({
                target: 4,
                a: e,
                b: t,
                c: n
            }),
            line: e => ({
                target: 5,
                a: e
            }),
            surah: e => ({
                target: 6,
                a: e
            }),
            range: (e, t) => ({
                target: 7,
                a: e,
                b: t
            })
        },
        w = 65536,
        T = {
            STRING: [0, 1024],
            WORDS: [1024, 3072],
            PAIRS: [20480, 4096],
            LINE_SEP: [45056, 1024],
            TRIPLES: [49152, 4096]
        },
        E = (e, t, n) => Error(`${e}(${t}) returned 0 on ${n}`);
    class ee {
        static async init(e) {
            let {
                instance: t
            } = await WebAssembly.instantiate(e, {});
            return new ee(t)
        }
        constructor(e) {
            this._ex = e.exports, this.mem = this.ex.memory, this.scratch = this.ex.qvp_alloc(w), this.scratch2 = this.ex.qvp_alloc(w), this._buf = 0, this._bufLen = 0, this._spill = [], this._live = new Set, this.td = new TextDecoder, this.te = new TextEncoder, h = Object.fromEntries(Object.entries(m).map(([e, t]) => [e, this.names(t)]))
        }
        get ex() {
            if (!this._ex) throw Error(`QvpEngine was freed`);
            return this._ex
        }
        free() {
            let e = this._ex;
            if (e) {
                for (let e of [...this._live]) e.free();
                e.qvp_dealloc(this.scratch, w), e.qvp_dealloc(this.scratch2, w), this._buf && e.qvp_dealloc(this._buf, this._bufLen);
                for (let t of this._spill) e.qvp_dealloc(t.p, t.len);
                this._spill.length = 0, this._buf = 0, this._bufLen = 0, this.scratch = 0, this.scratch2 = 0, this._ex = null
            }
        }
        names(e) {
            let t = typeof e == `string` ? m[e] : e,
                n = this.ex.qvp_name_count(t);
            return Array.from({
                length: n
            }, (e, n) => this.name(t, n))
        }
        nameCount(e) {
            return this.ex.qvp_name_count(typeof e == `string` ? m[e] : e)
        }
        name(e, t) {
            return this.ex.qvp_name(typeof e == `string` ? m[e] : e, t, this.scratch), this.qstr(this.scratch)
        }
        nameId(e, t) {
            return this._withInputs(() => {
                let [n, r] = this.putStr(t);
                return this.ex.qvp_name_id(typeof e == `string` ? m[e] : e, n, r)
            })
        }
        dv() {
            return new DataView(this.mem.buffer)
        }
        str(e, t) {
            return this.td.decode(new Uint8Array(this.mem.buffer, e, t))
        }
        qstr(e) {
            let t = this.dv();
            return this.str(t.getUint32(e, !0), t.getUint32(e + 4, !0))
        }
        _putView(e, t) {
            let n = this.dv();
            return n.setFloat32(t, e.scale, !0), n.setFloat32(t + 4, e.offsetX, !0), n.setFloat32(t + 8, e.offsetY, !0), t
        }
        _getView(e) {
            let t = this.dv();
            return {
                scale: t.getFloat32(e, !0),
                offsetX: t.getFloat32(e + 4, !0),
                offsetY: t.getFloat32(e + 8, !0)
            }
        }
        viewZoomAbout(e, t, n, r, {
            min: i = 0,
            max: a = 0
        } = {}) {
            let o = this._putView(e, this.scratch2 + 32768);
            return this.ex.qvp_view_zoom_about(o, t, n, r, i, a, this.scratch), this._getView(this.scratch)
        }
        viewPan(e, t, n) {
            let r = this._putView(e, this.scratch2 + 32768);
            return this.ex.qvp_view_pan(r, t, n, this.scratch), this._getView(this.scratch)
        }
        viewClamp(e, t, n, r, i) {
            let a = this._putView(e, this.scratch2 + 32768);
            return this.ex.qvp_view_clamp(a, t, n, r, i, this.scratch), this._getView(this.scratch)
        }
        viewSwipe(e, t, n = 0, r = 0) {
            return this.ex.qvp_view_swipe(e, t, n, r)
        }
        swipePages(e, t, n = 0, r = 0) {
            return this.ex.qvp_swipe_pages(e, t, n, r)
        }
        zoomIsZoomed(e, t, n = 0) {
            let r = this.dv(),
                i = this.scratch2 + 41984;
            r.setUint32(i, a[e && e.mode] ?? 0, !0), r.setUint32(i + 4, e && e.step || 0, !0), r.setFloat32(i + 8, e && e.zoom || 1, !0);
            let o = this._putView(t, this.scratch2 + 42e3);
            return !!this.ex.qvp_zoom_is_zoomed(i, o, n)
        }
        buf(e) {
            return e > this._bufLen && (this._buf && this.ex.qvp_dealloc(this._buf, this._bufLen), this._buf = this.ex.qvp_alloc(e), this._bufLen = e), this._buf
        }
        collect(e, t) {
            let n = Math.floor(w / e),
                r = t(this.scratch, n);
            if (r <= n) return [this.scratch, r];
            let i = this.buf(r * e);
            return [i, Math.min(t(i, r), r)]
        }
        _input([e, t], n) {
            if (n <= t) return this.scratch2 + e;
            let r = {
                p: this.ex.qvp_alloc(n),
                len: n
            };
            return this._spill.push(r), r.p
        }
        _withInputs(e) {
            let t = this._spill.length;
            try {
                return e()
            } finally {
                for (; this._spill.length > t;) {
                    let e = this._spill.pop();
                    this.ex.qvp_dealloc(e.p, e.len)
                }
            }
        }
        putStr(e, t = T.STRING) {
            let n = this.te.encode(e),
                r = this._input(t, n.length);
            return new Uint8Array(this.mem.buffer, r, n.length).set(n), [r, n.length]
        }
        putU32(e, t = T.WORDS) {
            let n = this._input(t, e.length * 4);
            return new Uint32Array(this.mem.buffer, n, e.length).set(e), n
        }
        nameOf(e, t) {
            return this.ex[e](t, this.scratch), this.qstr(this.scratch)
        }
        markName(e) {
            return this.nameOf(`qvp_mark_name`, e)
        }
        familyName(e) {
            return this.nameOf(`qvp_family_name`, e)
        }
        kindName(e) {
            return this.nameOf(`qvp_kind_name`, e)
        }
        categoryName(e) {
            return this.nameOf(`qvp_category_name`, e)
        }
        markCategory(e) {
            return this.ex.qvp_mark_category(S(e))
        }
        markFromName(e) {
            return this._withInputs(() => {
                let [t, n] = this.putStr(e);
                return this.ex.qvp_mark_from_name(t, n)
            })
        }
        version() {
            return this.ex.qvp_version(this.scratch), this.qstr(this.scratch)
        }
        formatVersion() {
            return this.ex.qvp_format_version()
        }
        engineName() {
            let e = this.ex.qvp_engine_name(),
                t = new Uint8Array(this.mem.buffer),
                n = 0;
            for (; t[e + n];) n++;
            return this.str(e, n)
        }
        strip(e) {
            return this._arabic(0, e)
        }
        fold(e) {
            return this._arabic(1, e)
        }
        normalize(e) {
            return this._arabic(2, e)
        }
        looseKey(e) {
            return this._arabic(3, e)
        }
        _arabic(e, t) {
            return this._withInputs(() => {
                let [n, r] = this.putStr(t);
                this.ex.qvp_arabic(e, n, r, this.scratch)
            }), this.qstr(this.scratch)
        }
        loadPage(e) {
            let t = this.ex.qvp_alloc(e.length);
            new Uint8Array(this.mem.buffer, t, e.length).set(e);
            let n = this.ex.qvp_page_load(t, e.length);
            if (this.ex.qvp_dealloc(t, e.length), !n) throw Error(`qvp_page_load failed`);
            try {
                return new ae(this, n)
            } catch (e) {
                throw this.ex.qvp_page_free(n), e
            }
        }
        loadAtlas(e) {
            let t = this.ex.qvp_alloc(e.length);
            new Uint8Array(this.mem.buffer, t, e.length).set(e);
            let n = this.ex.qvp_atlas_load(t, e.length);
            if (this.ex.qvp_dealloc(t, e.length), !n) throw Error(`qvp_atlas_load failed`);
            return new oe(this, n)
        }
        loadOrnaments(e) {
            let t = this.ex.qvp_alloc(e.length);
            new Uint8Array(this.mem.buffer, t, e.length).set(e);
            let n = this.ex.qvp_ornaments_load(t, e.length);
            if (this.ex.qvp_dealloc(t, e.length), !n) throw Error(`qvp_ornaments_load failed`);
            try {
                return new le(this, n)
            } catch (e) {
                throw this.ex.qvp_ornaments_free(n), e
            }
        }
        loadPassage(e, t, n, r = n) {
            let [i, a] = this._pageHandles(e), o = this.ex.qvp_passage_load(i, a, t, n, r);
            if (!o) throw Error(`qvp_passage_load failed`);
            return new ce(this, o, t, n)
        }
        loadBasmalah(e, t) {
            let [n, r] = this._pageHandles(e), i = this.ex.qvp_passage_load_basmalah(n, r, t);
            if (!i) throw Error(`qvp_passage_load_basmalah failed`);
            return new ce(this, i, t, 1)
        }
        _pageHandles(e) {
            if (!e.length) throw Error(`a passage needs at least one page`);
            return [this.putU32(Uint32Array.from(e, e => e.h)), e.length]
        }
    }

    function te(e, t, n) {
        typeof n == `string` && (n = D(n));
        let r = n.words ? e.putU32(Uint32Array.from(n.words)) : 0,
            i = n.words ? n.words.length : 0,
            a = e.dv();
        return a.setUint8(t, n.target), a.setUint32(t + 4, n.a >>> 0 || 0, !0), a.setUint32(t + 8, n.b >>> 0 || 0, !0), a.setUint32(t + 12, n.c >>> 0 || 0, !0), a.setUint32(t + 16, r, !0), a.setUint32(t + 20, i, !0), t
    }

    function D(e) {
        if (e === `page`) return C.page();
        let t;
        if (t = /^line:(\d+)$/.exec(e)) return C.line(+t[1]);
        if (t = /^surah:(\d+)$/.exec(e)) return C.surah(+t[1]);
        if (t = /^(\d+):(\d+)-(\d+)$/.exec(e)) return C.ayahRange(+t[1], +t[2], +t[3]);
        if (t = /^(\d+):(\d+):(\d+)$/.exec(e)) return {
            target: 1,
            wordKey: [+t[1], +t[2], +t[3]]
        };
        if (t = /^(\d+):(\d+)$/.exec(e)) return C.ayah(+t[1], +t[2]);
        throw Error(`bad target ` + e)
    }

    function O(e, t, n) {
        let r = e.dv();
        return r.setUint8(t, n.selector), r.setUint32(t + 4, n.a >>> 0 || 0, !0), r.setUint32(t + 8, n.b >>> 0 || 0, !0), r.setUint32(t + 12, n.c >>> 0 || 0, !0), t
    }
    let ne = {
        mode: `band`,
        height: `lineSpacing`,
        ink: s.HIGHLIGHT_INK,
        band: s.HIGHLIGHT_BAND,
        padX: s.HIGHLIGHT_PAD_X,
        padY: s.HIGHLIGHT_PAD_Y,
        radius: 0,
        seam: s.HIGHLIGHT_SEAM,
        ms: 0,
        layer: p.HIGHLIGHT
    };

    function re(e, t, n) {
        n = {
            ...ne,
            ...n
        };
        let r = e.dv();
        return r.setUint8(t, {
            ink: 0,
            band: 1,
            both: 2
        } [n.mode] ?? 1), r.setUint8(t + 1, +(n.height === `ink`)), r.setUint32(t + 4, y(n.ink), !0), r.setUint32(t + 8, y(n.band), !0), r.setFloat32(t + 12, n.padX, !0), r.setFloat32(t + 16, n.padY, !0), r.setFloat32(t + 20, n.radius, !0), r.setFloat32(t + 24, n.seam, !0), r.setUint32(t + 28, n.ms, !0), r.setInt32(t + 32, n.layer, !0), t
    }

    function ie(e, t, n) {
        let r = e.dv(),
            i = Array(n);
        for (let e = 0; e < n; e++) {
            let n = t + e * 32;
            i[e] = {
                id: r.getUint32(n, !0),
                line: r.getUint32(n + 4, !0),
                x0: r.getFloat32(n + 8, !0),
                y0: r.getFloat32(n + 12, !0),
                x1: r.getFloat32(n + 16, !0),
                y1: r.getFloat32(n + 20, !0),
                color: r.getUint32(n + 24, !0),
                radius: r.getFloat32(n + 28, !0)
            }
        }
        return i
    }
    class ae {
        constructor(e, t) {
            this.e = e, this._h = t;
            let n = e.ex,
                r = e.scratch;
            n.qvp_page_info(t, r);
            let i = e.dv();
            this.width = i.getFloat32(r, !0), this.height = i.getFloat32(r + 4, !0), this.page = i.getUint32(r + 8, !0), this.nLines = i.getUint32(r + 12, !0), this.nAyahs = i.getUint32(r + 16, !0), this.nWords = i.getUint32(r + 20, !0), this.nPaths = i.getUint32(r + 24, !0), this.nDecorations = i.getUint32(r + 28, !0), n.qvp_geometry(t, r), i = e.dv();
            let a = i.getUint32(r, !0),
                o = i.getUint32(r + 4, !0),
                c = i.getUint32(r + 8, !0),
                l = i.getUint32(r + 12, !0),
                u = i.getUint32(r + 16, !0),
                d = i.getUint32(r + 20, !0);
            this.ops = new Uint8Array(e.mem.buffer, a, o).slice(), this.pts = new Float32Array(e.mem.buffer.slice(c, c + l * 4)), this.table = new Uint32Array(e.mem.buffer.slice(u, u + d * 32)), this.paths = null, this.ornaments = null, this.ornamentsRevision = -1, this.words = Array.from({
                length: this.nWords
            }, (e, t) => this._word(t)), this.ayahs = Array.from({
                length: this.nAyahs
            }, (e, t) => this._ayah(t)), this.lines = Array.from({
                length: this.nLines
            }, (e, t) => this._line(t)), this.decorations = Array.from({
                length: this.nDecorations
            }, (e, t) => this._deco(t)), this.lineSpacing = n.qvp_page_line_spacing(t), this.currentLayout = null, this._defaultInk = s.INK, e._live.add(this)
        }
        get h() {
            if (!this._h) throw Error(`QvpPage was freed`);
            return this._h
        }
        free() {
            this._h && (this.e.ex.qvp_page_free(this._h), this._h = 0, this.e._live.delete(this))
        }
        dress(e, {
            style: r = null,
            ayahMark: i = r,
            surahHeader: a = r,
            pageFrame: o = r,
            gap: s = 5,
            bandGap: c = 5,
            ayahMarkScale: l = 0,
            pageFrameScale: u = 1,
            lineArt: d = !1,
            colors: f = []
        } = {}) {
            let p = (e, t) => {
                    let n = typeof e == `number` ? e : typeof e == `object` && e ? e.index : void 0;
                    if (!Number.isInteger(n) || n < 0) throw TypeError(`dress: ${t} must be an ornament, its index or a style name`);
                    return n
                },
                m = (n, r, i) => {
                    if (n == null) return t;
                    if (typeof n == `string`) {
                        let i = e.find(r, n);
                        return i ? i.index : t
                    }
                    return p(n, i)
                },
                h = m(i, `ayah_mark`, `ayahMark`),
                g = m(a, `surah_header`, `surahHeader`),
                _ = m(o, `page_frame`, `pageFrame`),
                v = [];
            f.forEach(([e, t, n], r) => v.push(p(e, `colors[${r}]`), t, y(n)));
            let b = d === !0 ? 7 : Array.isArray(d) ? d.reduce((e, t) => e | 1 << n.indexOf(t), 0) : 0;
            this.ornaments = null;
            let x = this.e._withInputs(() => {
                let t = v.length ? this.e.putU32(Uint32Array.from(v), T.TRIPLES) : 0,
                    n = this.e.scratch2 + 36864,
                    r = this.e.dv();
                return r.setUint32(n, h, !0), r.setUint32(n + 4, g, !0), r.setUint32(n + 8, _, !0), r.setFloat32(n + 12, s, !0), r.setFloat32(n + 16, c, !0), r.setFloat32(n + 20, l, !0), r.setFloat32(n + 24, u, !0), r.setUint32(n + 28, b, !0), r.setUint32(n + 32, t, !0), r.setUint32(n + 36, v.length / 3, !0), this.e.ex.qvp_dress(this.h, e.h, n)
            });
            return this.currentLayout && this.layoutCurrent(), x ? this.dressInfo() : null
        }
        undress() {
            this.e.ex.qvp_undress(this.h), this.ornaments = null, this.currentLayout && this.layoutCurrent()
        }
        dressClamp(e, t, n) {
            let r = this.e._putView(e, this.e.scratch2 + 32768);
            return this.e.ex.qvp_dress_clamp(this.h, r, t, n, this.e.scratch), this.e._getView(this.e.scratch)
        }
        dressView(e, t) {
            let n = this.e.scratch;
            this.e.ex.qvp_dress_view(this.h, e, t, n, n + 16);
            let r = this.e.dv();
            return {
                view: this.e._getView(n),
                width: r.getFloat32(n + 16, !0),
                height: r.getFloat32(n + 20, !0)
            }
        }
        dressInfo() {
            let e = this.e.scratch;
            if (!this.e.ex.qvp_dress_info(this.h, e)) return null;
            let n = this.e.dv(),
                r = t => n.getUint32(e + t * 4, !0),
                i = t => n.getFloat32(e + t, !0),
                a = e => e === t ? null : e;
            return {
                ayahMark: a(r(0)),
                surahHeader: a(r(1)),
                pageFrame: a(r(2)),
                ayahMarks: r(3),
                surahHeaders: r(4),
                frameRepeats: r(5),
                frameStretched: !!r(6),
                draws: r(7),
                revision: r(8),
                viewBox: [i(36), i(40), i(44), i(48)],
                overflow: [i(52), i(56), i(60), i(64)]
            }
        }
        dressRevision() {
            let e = this.dressInfo();
            return e ? e.revision : 0
        }
        dressGeometry() {
            let e = typeof Path2D == `function` ? Path2D : class {
                    moveTo() {}
                    lineTo() {}
                    quadraticCurveTo() {}
                    bezierCurveTo() {}
                    closePath() {}
                },
                r = this.dressRevision();
            if (this.ornaments && this.ornamentsRevision === r) return this.ornaments;
            this.ornamentsRevision = r;
            let i = this.e.scratch;
            this.e.ex.qvp_dress_geometry(this.h, i);
            let a = this.e.dv(),
                o = a.getUint32(i + 20, !0);
            if (!o) return this.ornaments = [];
            let s = a.getUint32(i, !0),
                c = a.getUint32(i + 4, !0),
                l = a.getUint32(i + 8, !0),
                u = a.getUint32(i + 12, !0),
                d = a.getUint32(i + 16, !0),
                f = new Uint8Array(this.e.mem.buffer, s, c),
                p = new Float32Array(this.e.mem.buffer, l, u),
                m = new Uint32Array(this.e.mem.buffer.slice(d, d + o * 36)),
                h = new Float32Array(m.buffer),
                g = Array(o);
            for (let r = 0; r < o; r++) {
                let i = new e,
                    a = m[r * 9],
                    o = a + m[r * 9 + 1],
                    s = m[r * 9 + 2];
                for (; a < o; a++) switch (f[a]) {
                    case 0:
                        i.moveTo(p[s], p[s + 1]), s += 2;
                        break;
                    case 1:
                        i.lineTo(p[s], p[s + 1]), s += 2;
                        break;
                    case 2:
                        i.quadraticCurveTo(p[s], p[s + 1], p[s + 2], p[s + 3]), s += 4;
                        break;
                    case 3:
                        i.bezierCurveTo(p[s], p[s + 1], p[s + 2], p[s + 3], p[s + 4], p[s + 5]), s += 6;
                        break;
                    case 4:
                        i.closePath()
                }
                let c = m[r * 9 + 5],
                    l = m[r * 9 + 8];
                g[r] = {
                    path: i,
                    color: m[r * 9 + 4],
                    kind: n[c & 255],
                    evenOdd: !!(c & 256),
                    stroke: !!(c & 512),
                    strokeWidth: h[r * 9 + 6],
                    part: m[r * 9 + 7],
                    placement: l === t ? null : l
                }
            }
            return this.ornaments = g
        }
        pathFlags(e) {
            return this.table[e * 8 + 4]
        }
        pathKind(e) {
            return this.pathFlags(e) & 255
        }
        pathMark(e) {
            return this.pathFlags(e) >> 8 & 255
        }
        pathFamily(e) {
            return this.pathFlags(e) >> 16 & 255
        }
        pathEvenOdd(e) {
            return (this.pathFlags(e) >> 24 & 1) == 1
        }
        pathWord(e) {
            let n = this.table[e * 8 + 5];
            return n === t ? -1 : n
        }
        pathLine(e) {
            return this.table[e * 8 + 6]
        }
        pathCategory(e) {
            return this.table[e * 8 + 7] & 255
        }
        pathNthInWord(e) {
            return this.table[e * 8 + 7] >> 8 & 255
        }
        pathNthMark(e) {
            let t = this.table[e * 8 + 7] >> 16 & 255;
            return t === 255 ? -1 : t
        }
        buildPaths() {
            if (this.paths) return this.paths;
            let e = this.table,
                t = this.ops,
                n = this.pts,
                r = Array(this.nPaths);
            for (let i = 0; i < this.nPaths; i++) {
                let a = new Path2D,
                    o = e[i * 8],
                    s = o + e[i * 8 + 1],
                    c = e[i * 8 + 2];
                for (; o < s; o++) switch (t[o]) {
                    case 0:
                        a.moveTo(n[c], n[c + 1]), c += 2;
                        break;
                    case 1:
                        a.lineTo(n[c], n[c + 1]), c += 2;
                        break;
                    case 2:
                        a.quadraticCurveTo(n[c], n[c + 1], n[c + 2], n[c + 3]), c += 4;
                        break;
                    case 3:
                        a.bezierCurveTo(n[c], n[c + 1], n[c + 2], n[c + 3], n[c + 4], n[c + 5]), c += 6;
                        break;
                    case 4:
                        a.closePath()
                }
                r[i] = a
            }
            return this.paths = r
        }
        _refused(e, t) {
            return E(e, t, `page ${this.page}`)
        }
        _word(e) {
            let t = this.e.ex,
                n = this.e.scratch;
            if (!t.qvp_word_info(this.h, e, n)) throw this._refused(`qvp_word_info`, e);
            let r = this.e.dv();
            return {
                index: e,
                surah: r.getUint16(n, !0),
                ayah: r.getUint16(n + 2, !0),
                word: r.getUint16(n + 4, !0),
                line: r.getUint16(n + 6, !0),
                ayahIndex: r.getUint32(n + 8, !0),
                lineIndex: r.getUint32(n + 12, !0),
                x0: r.getFloat32(n + 16, !0),
                y0: r.getFloat32(n + 20, !0),
                x1: r.getFloat32(n + 24, !0),
                y1: r.getFloat32(n + 28, !0),
                text: this.e.qstr(n + 32),
                firstPath: r.getUint32(n + 40, !0),
                nPaths: r.getUint32(n + 44, !0)
            }
        }
        _ayah(e) {
            let t = this.e.ex,
                n = this.e.scratch;
            if (!t.qvp_ayah_info(this.h, e, n)) throw this._refused(`qvp_ayah_info`, e);
            let r = this.e.dv();
            return {
                index: e,
                surah: r.getUint16(n, !0),
                ayah: r.getUint16(n + 2, !0),
                fragment: r.getUint8(n + 4),
                fragments: r.getUint8(n + 5),
                flags: r.getUint8(n + 6),
                rubuAlHizb: r.getUint16(n + 8, !0),
                firstWord: r.getUint32(n + 12, !0),
                nWords: r.getUint32(n + 16, !0),
                ayahMarkDecoration: r.getUint32(n + 20, !0),
                x0: r.getFloat32(n + 24, !0),
                y0: r.getFloat32(n + 28, !0),
                x1: r.getFloat32(n + 32, !0),
                y1: r.getFloat32(n + 36, !0)
            }
        }
        _line(e) {
            let t = this.e.ex,
                n = this.e.scratch;
            if (!t.qvp_line_info(this.h, e, n)) throw this._refused(`qvp_line_info`, e);
            let r = this.e.dv();
            return {
                index: e,
                lineNumber: r.getUint8(n),
                isHeader: !!r.getUint8(n + 1),
                firstWord: r.getUint32(n + 4, !0),
                nWords: r.getUint32(n + 8, !0),
                x0: r.getFloat32(n + 12, !0),
                y0: r.getFloat32(n + 16, !0),
                x1: r.getFloat32(n + 20, !0),
                y1: r.getFloat32(n + 24, !0),
                bandY0: r.getFloat32(n + 28, !0),
                bandY1: r.getFloat32(n + 32, !0),
                centre: r.getFloat32(n + 36, !0)
            }
        }
        _deco(e) {
            let t = this.e.ex,
                n = this.e.scratch;
            if (!t.qvp_decoration_info(this.h, e, n)) throw this._refused(`qvp_decoration_info`, e);
            let r = this.e.dv();
            return {
                index: e,
                decoration: r.getUint8(n),
                surah: r.getUint16(n + 2, !0),
                ayah: r.getUint16(n + 4, !0),
                line: r.getUint32(n + 8, !0),
                x0: r.getFloat32(n + 12, !0),
                y0: r.getFloat32(n + 16, !0),
                x1: r.getFloat32(n + 20, !0),
                y1: r.getFloat32(n + 24, !0),
                text: this.e.qstr(n + 28),
                firstPath: r.getUint32(n + 36, !0),
                nPaths: r.getUint32(n + 40, !0)
            }
        }
        wordForm(e, t = `rasm_uthmani`) {
            let n = this.e.scratch;
            return this.e.ex.qvp_word_form(this.h, e, f[t] ?? 0, n) ? this.e.qstr(n) : ``
        }
        findWord(e, t, n) {
            let r = this.e.ex.qvp_find_word(this.h, e, t, n);
            return r < 0 ? -1 : r
        }
        _target(e) {
            if (typeof e == `string` && (e = D(e)), e.wordKey) {
                let t = this.findWord(...e.wordKey);
                e = t >= 0 ? C.word(t) : C.words([])
            }
            return e instanceof Array && (e = C.words(e)), te(this.e, this.e.scratch2 + 4096, e)
        }
        targetWords(e) {
            let [t, n] = this.e._withInputs(() => {
                let t = this._target(e);
                return this.e.collect(4, (e, n) => this.e.ex.qvp_target_words(this.h, t, e, n))
            });
            return Array.from(new Uint32Array(this.e.mem.buffer, t, n))
        }
        surahs() {
            let e = this.e.ex,
                t = this.e.scratch,
                n = e.qvp_surah_count(this.h),
                r = [];
            for (let i = 0; i < n; i++) {
                e.qvp_surah_at(this.h, i, t);
                let n = this.e.dv();
                r.push({
                    number: n.getUint16(t, !0),
                    ayahCount: n.getUint16(t + 2, !0),
                    hasBanner: !!n.getUint8(t + 4),
                    hasBasmalah: !!n.getUint8(t + 5),
                    place: g(`place`)[n.getUint8(t + 6)] || ``,
                    bannerDecoration: n.getUint32(t + 8, !0),
                    arabic: this.e.qstr(t + 12),
                    latin: this.e.qstr(t + 20),
                    english: this.e.qstr(t + 28)
                })
            }
            return r
        }
        divisions() {
            let e = this.e.ex,
                [t, n] = this.e.collect(12, (t, n) => e.qvp_divisions(this.h, t, n)),
                r = this.e.dv(),
                i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 12;
                i.push({
                    division: g(`division`)[r.getUint8(n)],
                    line: r.getUint8(n + 1),
                    number: r.getUint16(n + 2, !0),
                    surah: r.getUint16(n + 4, !0),
                    ayah: r.getUint16(n + 6, !0),
                    ayahIndex: r.getUint32(n + 8, !0)
                })
            }
            return i
        }
        surahHeaders() {
            let e = this.e.ex,
                [t, n] = this.e.collect(44, (t, n) => e.qvp_surah_headers(this.h, t, n)),
                r = this.e.dv(),
                i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 44;
                i.push({
                    decoration: r.getUint32(n, !0),
                    surah: r.getUint16(n + 4, !0),
                    line: r.getUint32(n + 8, !0),
                    x0: r.getFloat32(n + 12, !0),
                    y0: r.getFloat32(n + 16, !0),
                    x1: r.getFloat32(n + 20, !0),
                    y1: r.getFloat32(n + 24, !0),
                    titleX0: r.getFloat32(n + 28, !0),
                    titleY0: r.getFloat32(n + 32, !0),
                    titleX1: r.getFloat32(n + 36, !0),
                    titleY1: r.getFloat32(n + 40, !0)
                })
            }
            return i
        }
        surahHeadersView() {
            let e = this.e.ex,
                [t, n] = this.e.collect(44, (t, n) => e.qvp_surah_headers_view(this.h, t, n)),
                r = this.e.dv(),
                i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 44;
                i.push({
                    decoration: r.getUint32(n, !0),
                    surah: r.getUint16(n + 4, !0),
                    line: r.getUint32(n + 8, !0),
                    x0: r.getFloat32(n + 12, !0),
                    y0: r.getFloat32(n + 16, !0),
                    x1: r.getFloat32(n + 20, !0),
                    y1: r.getFloat32(n + 24, !0),
                    titleX0: r.getFloat32(n + 28, !0),
                    titleY0: r.getFloat32(n + 32, !0),
                    titleX1: r.getFloat32(n + 36, !0),
                    titleY1: r.getFloat32(n + 40, !0)
                })
            }
            return i
        }
        ayahMarks() {
            let e = this.e.ex,
                [t, n] = this.e.collect(32, (t, n) => e.qvp_ayah_marks(this.h, t, n)),
                r = this.e.dv(),
                i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 32;
                i.push({
                    decoration: r.getUint32(n, !0),
                    surah: r.getUint16(n + 4, !0),
                    ayah: r.getUint16(n + 6, !0),
                    line: r.getUint32(n + 8, !0),
                    cx: r.getFloat32(n + 12, !0),
                    cy: r.getFloat32(n + 16, !0),
                    r: r.getFloat32(n + 20, !0),
                    ornamentPath: r.getUint32(n + 24, !0),
                    numeralPath: r.getUint32(n + 28, !0)
                })
            }
            return i
        }
        ayahMarksView() {
            let e = this.e.ex,
                [t, n] = this.e.collect(32, (t, n) => e.qvp_ayah_marks_view(this.h, t, n)),
                r = this.e.dv(),
                i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 32;
                i.push({
                    decoration: r.getUint32(n, !0),
                    surah: r.getUint16(n + 4, !0),
                    ayah: r.getUint16(n + 6, !0),
                    line: r.getUint32(n + 8, !0),
                    cx: r.getFloat32(n + 12, !0),
                    cy: r.getFloat32(n + 16, !0),
                    r: r.getFloat32(n + 20, !0),
                    ornamentPath: r.getUint32(n + 24, !0),
                    numeralPath: r.getUint32(n + 28, !0)
                })
            }
            return i
        }
        rosettes() {
            let e = this.e.ex,
                [t, n] = this.e.collect(20, (t, n) => e.qvp_rosettes(this.h, t, n)),
                r = this.e.dv(),
                i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 20;
                i.push({
                    decoration: r.getUint32(n, !0),
                    surah: r.getUint16(n + 4, !0),
                    ayah: r.getUint16(n + 6, !0),
                    juz: r.getUint16(n + 8, !0),
                    hizb: r.getUint16(n + 10, !0),
                    nisf: r.getUint16(n + 12, !0),
                    rubuAlHizb: r.getUint16(n + 14, !0),
                    rubuAlHizbInHizb: r.getUint16(n + 16, !0)
                })
            }
            return i
        }
        sajdahs() {
            let e = this.e.ex,
                [t, n] = this.e.collect(12, (t, n) => e.qvp_sajdahs(this.h, t, n)),
                r = this.e.dv(),
                i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 12;
                i.push({
                    decoration: r.getUint32(n, !0),
                    surah: r.getUint16(n + 4, !0),
                    ayah: r.getUint16(n + 6, !0),
                    signPath: r.getUint32(n + 8, !0)
                })
            }
            return i
        }
        ayahKeys() {
            let [e, t] = this.e.collect(4, (e, t) => this.e.ex.qvp_ayah_keys(this.h, e, t)), n = new Uint32Array(this.e.mem.buffer, e, t);
            return Array.from(n, e => [e >>> 16, e & 65535])
        }
        ayahWordCount(e, t) {
            return {
                count: this.e.ex.qvp_ayah_word_count(this.h, e, t, this.e.scratch),
                isComplete: !!this.e.dv().getUint8(this.e.scratch)
            }
        }
        reciteMap(e, t, n) {
            if (this.e.ex.qvp_recite_map(this.h, e, t, n, 0, 0) < 0) return null;
            let [r, i] = this.e.collect(4, (r, i) => this.e.ex.qvp_recite_map(this.h, e, t, n, r, i));
            return Array.from(new Uint32Array(this.e.mem.buffer, r, i))
        }
        wordLabel(e) {
            return this.e.ex.qvp_word_label(this.h, e, this.e.scratch), this.e.qstr(this.e.scratch)
        }
        ayahLabel(e) {
            return this.e.ex.qvp_ayah_label(this.h, e, this.e.scratch), this.e.qstr(this.e.scratch)
        }
        text(e = `page`, {
            form: t = `rasm_uthmani`,
            wordSep: n = ` `,
            lineSep: r = `
`
        } = {}) {
            return this.e._withInputs(() => {
                let [i, a] = this.e.putStr(n), [o, s] = this.e.putStr(r, T.LINE_SEP);
                this.e.ex.qvp_text(this.h, this._target(e), f[t] ?? 0, i, a, o, s, this.e.scratch)
            }), this.e.qstr(this.e.scratch)
        }
        search(e, {
            form: t = `search`,
            mode: n = `includes`,
            normalize: r = !0,
            looseMatch: i = !0,
            limit: a = 0
        } = {}) {
            let [o, s] = this.e._withInputs(() => {
                let [o, s] = this.e.putStr(e);
                return this.e.collect(12, (e, c) => this.e.ex.qvp_search(this.h, o, s, f[t] ?? 4, {
                    includes: 0,
                    exact: 1,
                    prefix: 2
                } [n] ?? 0, +!!r, +!!i, a, e, c))
            }), c = this.e.dv(), l = [];
            for (let e = 0; e < s; e++) {
                let t = o + e * 12,
                    n = c.getUint32(t, !0);
                l.push({
                    word: n,
                    index: c.getUint32(t + 4, !0),
                    isLooseMatch: !!c.getUint8(t + 8),
                    wordKey: this.wordKey(n),
                    text: this.words[n].text
                })
            }
            return l
        }
        wordKey(e) {
            let t = this.words[e];
            return `${t.surah}:${t.ayah}:${t.word}`
        }
        attachWords(e) {
            let t = typeof e == `string` ? e : e instanceof Uint8Array ? this.e.td.decode(e) : JSON.stringify(e),
                n = this.e.te.encode(t),
                r = this.e.ex.qvp_alloc(n.length);
            new Uint8Array(this.e.mem.buffer, r, n.length).set(n);
            let i = this.e.ex.qvp_attach_words(this.h, r, n.length);
            return this.e.ex.qvp_dealloc(r, n.length), i
        }
        hasForm(e) {
            return !!this.e.ex.qvp_has_form(this.h, f[e] ?? 0)
        }
        citation(e) {
            return this.e._withInputs(() => this.e.ex.qvp_citation(this.h, this.e.putU32(Uint32Array.from(e)), e.length, this.e.scratch)), this.e.qstr(this.e.scratch)
        }
        hitTestExact(e, t) {
            return this.e.ex.qvp_hit_test_exact(this.h, e, t, this.e.scratch) ? this._hit(this.e.scratch) : null
        }
        hitTestExactView(e, t) {
            return this.e.ex.qvp_hit_test_exact_view(this.h, e, t, this.e.scratch) ? this._hit(this.e.scratch) : null
        }
        _hitOpt(e) {
            let t = this.e.dv(),
                n = this.e.scratch2 + 8192;
            return t.setFloat32(n, e?.maxDistance ?? 0, !0), t.setFloat32(n + 4, e?.gapBias ?? s.GAP_BIAS, !0), t.setUint8(n + 8, e?.preferExact === !1 ? 0 : 1), n
        }
        _hit(e) {
            let n = this.e.dv(),
                r = e => e === t ? -1 : e,
                i = {
                    word: r(n.getUint32(e, !0)),
                    path: r(n.getUint32(e + 4, !0)),
                    decoration: r(n.getUint32(e + 8, !0)),
                    line: r(n.getUint32(e + 12, !0)),
                    distance: n.getFloat32(e + 16, !0),
                    isExact: !!n.getUint8(e + 20)
                };
            if (i.word >= 0) {
                i.wordKey = this.wordKey(i.word);
                let e = this.words[i.word];
                i.ayahKey = `${e.surah}:${e.ayah}`
            }
            return i
        }
        hitTest(e, t, n = {}) {
            return this.e.ex.qvp_hit_test(this.h, e, t, this._hitOpt(n), this.e.scratch) ? this._hit(this.e.scratch) : null
        }
        hitTestView(e, t, n = {}) {
            return this.e.ex.qvp_hit_test_view(this.h, e, t, this._hitOpt(n), this.e.scratch) ? this._hit(this.e.scratch) : null
        }
        hitAreasView(e = s.GAP_BIAS) {
            let [t, n] = this.e.collect(40, (t, n) => this.e.ex.qvp_hit_areas_view(this.h, e, t, n)), r = this.e.dv(), i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 40;
                i.push({
                    word: r.getUint32(n, !0),
                    line: r.getUint32(n + 4, !0),
                    x0: r.getFloat32(n + 8, !0),
                    y0: r.getFloat32(n + 12, !0),
                    x1: r.getFloat32(n + 16, !0),
                    y1: r.getFloat32(n + 20, !0),
                    inkX0: r.getFloat32(n + 24, !0),
                    inkY0: r.getFloat32(n + 28, !0),
                    inkX1: r.getFloat32(n + 32, !0),
                    inkY1: r.getFloat32(n + 36, !0)
                })
            }
            return i
        }
        lineBands() {
            let [e, t] = this.e.collect(28, (e, t) => this.e.ex.qvp_line_bands(this.h, e, t)), n = this.e.dv(), r = [];
            for (let i = 0; i < t; i++) {
                let t = e + i * 28;
                r.push({
                    line: n.getUint32(t, !0),
                    lineNumber: n.getUint32(t + 4, !0),
                    y0: n.getFloat32(t + 8, !0),
                    y1: n.getFloat32(t + 12, !0),
                    mid: n.getFloat32(t + 16, !0),
                    inkY0: n.getFloat32(t + 20, !0),
                    inkY1: n.getFloat32(t + 24, !0)
                })
            }
            return r
        }
        hitAreas(e = s.GAP_BIAS) {
            let [t, n] = this.e.collect(40, (t, n) => this.e.ex.qvp_hit_areas(this.h, e, t, n)), r = this.e.dv(), i = [];
            for (let e = 0; e < n; e++) {
                let n = t + e * 40;
                i.push({
                    word: r.getUint32(n, !0),
                    line: r.getUint32(n + 4, !0),
                    x0: r.getFloat32(n + 8, !0),
                    y0: r.getFloat32(n + 12, !0),
                    x1: r.getFloat32(n + 16, !0),
                    y1: r.getFloat32(n + 20, !0),
                    inkX0: r.getFloat32(n + 24, !0),
                    inkY0: r.getFloat32(n + 28, !0),
                    inkX1: r.getFloat32(n + 32, !0),
                    inkY1: r.getFloat32(n + 36, !0)
                })
            }
            return i
        }
        _writeLayoutSpec(e, t) {
            let n = (e, t, n, r = ``) => {
                    let i = e[t] ?? n;
                    if (!Number.isFinite(i)) throw TypeError(`layout: ${r}${t} must be a finite number`);
                    return i
                },
                r = (t, r) => n(e, t, r),
                i = e.reflow,
                a = (e, t) => n(i, e, t, `reflow.`),
                o = this.e.dv();
            o.setFloat32(t, r(`viewportW`), !0), o.setFloat32(t + 4, r(`viewportH`), !0), o.setFloat32(t + 8, r(`padTop`, 0), !0), o.setFloat32(t + 12, r(`padBottom`, 0), !0), o.setFloat32(t + 16, r(`padLeft`, 0), !0), o.setFloat32(t + 20, r(`padRight`, 0), !0), o.setFloat32(t + 24, r(`lineSpacing`, 1), !0), o.setUint8(t + 28, +!!e.fillHeight), o.setUint32(t + 32, r(`gridLines`, 0), !0), o.setFloat32(t + 36, r(`cropLeft`, 0), !0), o.setFloat32(t + 40, r(`cropRight`, 0), !0), o.setFloat32(t + 44, r(`maxAspectSlack`, 0), !0), o.setFloat32(t + 48, i ? a(`zoom`, 1) : 0, !0);
            let s = {
                    ragged: 0,
                    justified: 1,
                    centred: 2,
                    centered: 2
                } [i && i.fill] ?? 255,
                c = {
                    greedy: 0,
                    even: 1,
                    fitted: 2,
                    printed: 3
                } [i && i.breaks] ?? 255;
            o.setUint8(t + 52, s), o.setUint8(t + 53, c), o.setUint8(t + 54, i && i.gaps === `printed` ? 0 : 1), o.setFloat32(t + 56, i ? a(`wordGap`, 1) : 1, !0), o.setFloat32(t + 60, i ? a(`maxStretch`, 0) : 0, !0), o.setFloat32(t + 64, i ? a(`relax`, -1) : -1, !0), o.setFloat32(t + 68, r(`bannerZoom`, 0), !0), o.setUint8(t + 72, e.surahFrames === !1 ? 0 : 1)
        }
        layoutLineSpacingToFill(e, t = 0) {
            let n = this.e.scratch;
            return this._writeLayoutSpec(e, n), this.e.ex.qvp_layout_line_spacing_to_fill(this.h, n, t)
        }
        layoutWastedFraction(e) {
            let t = this.e.scratch;
            return this._writeLayoutSpec(e, t), this.e.ex.qvp_layout_wasted_fraction(this.h, t)
        }
        layoutPrintedHeight(e) {
            let t = this.e.scratch;
            return this._writeLayoutSpec(e, t), this.e.ex.qvp_layout_printed_height(this.h, t)
        }
        get grid() {
            this.e.ex.qvp_page_grid(this.h, this.e.scratch);
            let e = this.e.dv();
            return {
                lines: e.getUint32(this.e.scratch, !0),
                lineSpacing: e.getFloat32(this.e.scratch + 4, !0)
            }
        }
        layout(e) {
            let t = this.e.ex,
                n = this.e.scratch;
            return this._writeLayoutSpec(e, n), t.qvp_layout(this.h, n, n + 128), this._readLayout(n + 128)
        }
        _readLayout(e) {
            let t = this.e.ex,
                n = this.e.dv(),
                r = n.getUint32(e + 24, !0),
                i = n.getUint32(e + 28, !0),
                a = new Float32Array(this.e.mem.buffer.slice(i, i + r * 12)),
                o = new Float32Array(r),
                s = Array(r);
            for (let e = 0; e < r; e++) o[e] = a[e * 3], s[e] = [a[e * 3 + 1], a[e * 3 + 2]];
            let c = n.getUint32(e + 44, !0) === 1,
                l = n.getUint32(e + 48, !0),
                u = {
                    scale: n.getFloat32(e, !0),
                    offsetX: n.getFloat32(e + 4, !0),
                    offsetY: n.getFloat32(e + 8, !0),
                    contentW: n.getFloat32(e + 12, !0),
                    contentH: n.getFloat32(e + 16, !0),
                    lineSpacing: n.getFloat32(e + 20, !0),
                    lineDy: o,
                    slots: s,
                    fitScale: n.getFloat32(e + 32, !0),
                    fitX: n.getFloat32(e + 36, !0),
                    fitY: n.getFloat32(e + 40, !0),
                    reflowed: c,
                    rows: l
                },
                d = t.qvp_layout_groups(this.h, 0, 0),
                f = this.e.buf(d * 16);
            t.qvp_layout_groups(this.h, f, d), u.groups = new Float32Array(this.e.mem.buffer.slice(f, f + d * 16));
            let p = t.qvp_layout_path_groups(this.h, 0, 0);
            if (p) {
                let e = this.e.buf(p * 4);
                t.qvp_layout_path_groups(this.h, e, p), u.pathGroup = new Uint32Array(this.e.mem.buffer.slice(e, e + p * 4))
            } else u.pathGroup = null;
            let m = t.qvp_layout_omitted_paths(this.h, 0, 0);
            if (m) {
                let e = this.e.buf(m * 4);
                t.qvp_layout_omitted_paths(this.h, e, m), u.omitted = new Set(new Uint32Array(this.e.mem.buffer, e, m))
            } else u.omitted = null;
            let h = t.qvp_layout_repeats(this.h, 0, 0);
            if (u.repeats = [], h) {
                let e = this.e.buf(h * 24);
                t.qvp_layout_repeats(this.h, e, h);
                let n = new Float32Array(this.e.mem.buffer.slice(e, e + h * 24));
                for (let e = 0; e < h; e++) u.repeats.push({
                    firstPath: n[e * 6],
                    nPaths: n[e * 6 + 1],
                    dx: n[e * 6 + 2],
                    dy: n[e * 6 + 3],
                    kx: n[e * 6 + 4],
                    ky: n[e * 6 + 5]
                })
            }
            return this.currentLayout = u
        }
        _putZoom(e, t) {
            let n = this.e.dv();
            return n.setUint32(t, a[e && e.mode] ?? 0, !0), n.setUint32(t + 4, e && e.step || 0, !0), n.setFloat32(t + 8, e && e.zoom || 1, !0), t
        }
        _getZoom(e) {
            let t = this.e.dv();
            return {
                mode: o[t.getUint32(e, !0)] || `stepped`,
                step: t.getUint32(e + 4, !0),
                zoom: t.getFloat32(e + 8, !0)
            }
        }
        _getZoomChange(e) {
            return {
                zoom: this._getZoom(e),
                view: this.e._getView(e + 12),
                relaid: !!this.e.dv().getUint32(e + 24, !0)
            }
        }
        zoomMode(e, t, n) {
            let r = this.e.scratch2 + 40960;
            this._writeLayoutSpec(e, r);
            let i = this._putZoom(t, this.e.scratch2 + 41984);
            return this.e.ex.qvp_zoom_mode(this.h, r, i, a[n] ?? 0, this.e.scratch), this._getZoom(this.e.scratch)
        }
        zoomPinch(e, t, n, r, i, a) {
            let o = this.e.scratch2 + 40960;
            this._writeLayoutSpec(e, o);
            let s = this._putZoom(t, this.e.scratch2 + 41984),
                c = this.e._putView(n, this.e.scratch2 + 42e3);
            this.e.ex.qvp_zoom_pinch(this.h, o, s, c, r, i, a, this.e.scratch);
            let l = this._getZoomChange(this.e.scratch);
            return l.relaid && this.layoutCurrent(), l
        }
        zoomToStep(e, t, n, r) {
            let i = this.e.scratch2 + 40960;
            this._writeLayoutSpec(e, i);
            let a = this._putZoom(t, this.e.scratch2 + 41984),
                o = this.e._putView(r, this.e.scratch2 + 42e3);
            this.e.ex.qvp_zoom_to_step(this.h, i, a, n, o, this.e.scratch);
            let s = this._getZoomChange(this.e.scratch);
            return s.relaid && this.layoutCurrent(), s
        }
        zoomSpec(e, t) {
            let n = this.e.scratch2 + 40960;
            this._writeLayoutSpec(e, n);
            let r = this._putZoom(t, this.e.scratch2 + 41984);
            this.e.ex.qvp_zoom_spec(this.h, n, r, this.e.scratch);
            let i = this.e.dv().getFloat32(this.e.scratch + 48, !0);
            return i > 0 || e.reflow ? {
                ...e,
                reflow: {
                    ...e.reflow || {},
                    zoom: i
                }
            } : {
                ...e,
                reflow: null
            }
        }
        zoomCarried(e, t) {
            let n = this.e.scratch2 + 40960;
            this._writeLayoutSpec(e, n);
            let r = this._putZoom(t, this.e.scratch2 + 41984);
            return this.e.ex.qvp_zoom_carried(this.h, n, r, this.e.scratch), this._getZoom(this.e.scratch)
        }
        zoomAtStep(e, t) {
            let n = this.e.scratch2 + 40960;
            return this._writeLayoutSpec(e, n), this.e.ex.qvp_zoom_at_step(this.h, n, t)
        }
        zoomIsZoomed(e, t, n = 0) {
            return this.e.zoomIsZoomed(e, t, n)
        }
        sidewaysDrag(e, t, n = 0) {
            let r = this._putZoom(e, this.e.scratch2 + 41984),
                i = this.e._putView(t, this.e.scratch2 + 42e3);
            return this.e.ex.qvp_sideways_drag(this.h, r, i, n) === 1 ? `turnPage` : `pan`
        }
        layoutCurrent() {
            let e = this.e.scratch;
            return this.e.ex.qvp_layout_current(this.h, e + 128) ? this._readLayout(e + 128) : this.currentLayout
        }
        layoutDrawList(e = 0, t = 0) {
            let n = this.e.ex.qvp_layout_draw_list(this.h, e, t, 0, 0);
            if (!n) return new Uint32Array;
            let r = this.e.buf(n * 8);
            return this.e.ex.qvp_layout_draw_list(this.h, e, t, r, n), new Uint32Array(this.e.mem.buffer.slice(r, r + n * 8))
        }
        layoutPlacements() {
            let e = this.e.ex.qvp_layout_placements(this.h, 0, 0);
            if (!e) return new Float32Array;
            let t = this.e.buf(e * 16);
            return this.e.ex.qvp_layout_placements(this.h, t, e), new Float32Array(this.e.mem.buffer.slice(t, t + e * 16))
        }
        reflowMaxZoom(e) {
            let t = this.e.scratch;
            return this._writeLayoutSpec(e, t), this.e.ex.qvp_reflow_max_zoom(this.h, t)
        }
        zoomLevels(e, t, n) {
            let r = this.e.scratch;
            this._writeLayoutSpec(e, r);
            let i = t ? t.length : 0,
                a = this.e.buf((i + 8) * 4),
                o = i ? a : 0,
                s = a + i * 4;
            i && new Float32Array(this.e.mem.buffer, o, i).set(t);
            let c = this.e.ex.qvp_zoom_levels(this.h, r, o, i, n || 0, s, 8);
            return Array.from(new Float32Array(this.e.mem.buffer, s, c))
        }
        zoomSteps(e) {
            let t = this.e.scratch;
            this._writeLayoutSpec(e, t);
            let n = this.e.buf(32),
                r = this.e.ex.qvp_zoom_steps(this.h, t, n, 8);
            return Array.from(new Float32Array(this.e.mem.buffer, n, r))
        }
        zoomLevelCandidates(e, t, n, r) {
            let i = this.e.scratch;
            this._writeLayoutSpec(e, i);
            let a = this.e.buf(512),
                o = a + 256,
                s = this.e.ex.qvp_zoom_level_candidates(this.h, i, t, n || 0, r || 0, a, o, 64),
                c = new Float32Array(this.e.mem.buffer, a, s),
                l = new Float32Array(this.e.mem.buffer, o, s);
            return Array.from(c, (e, t) => ({
                zoom: e,
                cost: l[t]
            }))
        }
        rowWords(e) {
            let t = this.e.ex.qvp_layout_row_words(this.h, e, 0, 0);
            if (!t) return [];
            let n = this.e.buf(t * 4);
            return this.e.ex.qvp_layout_row_words(this.h, e, n, t), Array.from(new Uint32Array(this.e.mem.buffer, n, t))
        }
        wordRow(e) {
            let t = this.e.ex.qvp_layout_word_row(this.h, e);
            return t === 4294967295 ? null : t
        }
        viewAnchor(e, t, n, r, i, a, o, s) {
            let c = this.e._putView(e, this.e.scratch2 + 32768);
            return this.e.ex.qvp_view_anchor(this.h, c, t, n, r, i, a, o, s, this.e.scratch), this.e._getView(this.e.scratch)
        }
        viewToLayout(e, t, n) {
            let r = this.e._putView(e, this.e.scratch2 + 32768);
            this.e.ex.qvp_view_to_layout(this.h, r, t, n, this.e.scratch);
            let i = new Float32Array(this.e.mem.buffer, this.e.scratch, 2);
            return {
                x: i[0],
                y: i[1]
            }
        }
        wordBoundsView(e) {
            this.e.ex.qvp_word_bounds_view(this.h, e, this.e.scratch);
            let t = new Float32Array(this.e.mem.buffer, this.e.scratch, 4);
            return {
                x0: t[0],
                y0: t[1],
                x1: t[2],
                y1: t[3]
            }
        }
        style(e, t, {
            ms: n = 0,
            layer: r = p.BASE
        } = {}) {
            return this.e.ex.qvp_style_add(this.h, r, O(this.e, this.e.scratch2 + 12288, e), y(t), n)
        }
        styleTarget(e, t, {
            ms: n = 0,
            layer: r = p.BASE
        } = {}) {
            return this.e._withInputs(() => this.e.ex.qvp_style_add_target(this.h, r, this._target(e), y(t), n))
        }
        removeStyle(e) {
            return this.e.ex.qvp_style_remove(this.h, e)
        }
        recolorStyle(e, t, n = 0) {
            return this.e.ex.qvp_style_recolor(this.h, e, y(t), n)
        }
        hide(e) {
            return this.e.ex.qvp_style_hide(this.h, O(this.e, this.e.scratch2 + 12288, e))
        }
        clearStyles() {
            this.e.ex.qvp_style_clear(this.h)
        }
        clearLayer(e) {
            this.e.ex.qvp_style_clear_layer(this.h, e)
        }
        setDefaultColor(e) {
            this._defaultInk = y(e), this.e.ex.qvp_style_default_color(this.h, this._defaultInk)
        }
        get defaultInk() {
            return this._defaultInk
        }
        theme(e) {
            let t = Object.entries(e.marks || {}).flatMap(([e, t]) => [S(e), y(t)]);
            return this.e._withInputs(() => {
                let n = t.length ? this.e.putU32(Uint32Array.from(t), T.PAIRS) : 0,
                    r = this.e.dv(),
                    i = this.e.scratch2 + 16384,
                    a = e => e == null ? 0 : y(e);
                return [`ink`, `diacritics`, `dots`, `waqf`, `sifr`, `ayahMark`, `numeral`, `headers`].forEach((t, n) => r.setUint32(i + n * 4, a(e[t]), !0)), r.setUint32(i + 32, e.ms || 0, !0), r.setUint32(i + 36, n, !0), r.setUint32(i + 40, t.length / 2, !0), this.e.ex.qvp_theme(this.h, i)
            })
        }
        styleHandles() {
            return this._u32s((e, t) => this.e.ex.qvp_style_handles(this.h, e, t))
        }
        _u32s(e) {
            let [t, n] = this.e.collect(4, e);
            return Array.from(new Uint32Array(this.e.mem.buffer, t, n))
        }
        tick(e) {
            return !!this.e.ex.qvp_tick(this.h, e)
        }
        colors() {
            let e = this.e.ex.qvp_colors(this.h);
            return new Uint32Array(this.e.mem.buffer.slice(e, e + this.nPaths * 4))
        }
        styledPaths() {
            let e = this.e.ex,
                t = e.qvp_styled_paths(this.h, 0, 0);
            if (!t) return [];
            let n = e.qvp_alloc(t * 8);
            e.qvp_styled_paths(this.h, n, t);
            let r = new Uint32Array(this.e.mem.buffer.slice(n, n + t * 8));
            e.qvp_dealloc(n, t * 8);
            let i = Array(t);
            for (let e = 0; e < t; e++) i[e] = [r[e * 2], r[e * 2 + 1]];
            return i
        }
        colorOf(e) {
            return this.e.ex.qvp_color_of(this.h, e) >>> 0
        }
        highlight(e, t = {}) {
            return this.e._withInputs(() => this.e.ex.qvp_highlight_add(this.h, this._target(e), re(this.e, this.e.scratch2 + 24576, t)))
        }
        moveHighlight(e, t) {
            return !!this.e._withInputs(() => this.e.ex.qvp_highlight_move(this.h, e, this._target(t)))
        }
        restyleHighlight(e, t) {
            return !!this.e.ex.qvp_highlight_restyle(this.h, e, re(this.e, this.e.scratch2 + 24576, t))
        }
        removeHighlight(e) {
            return !!this.e.ex.qvp_highlight_remove(this.h, e)
        }
        clearHighlights() {
            this.e.ex.qvp_highlight_clear(this.h)
        }
        highlightHandles() {
            return this._u32s((e, t) => this.e.ex.qvp_highlight_handles(this.h, e, t))
        }
        highlightWords(e) {
            return this._u32s((t, n) => this.e.ex.qvp_highlight_words(this.h, e, t, n))
        }
        highlightBoxesView() {
            let [e, t] = this.e.collect(32, (e, t) => this.e.ex.qvp_highlight_boxes_view(this.h, e, t));
            return ie(this.e, e, t)
        }
        wordBands(e, {
            height: t = `lineSpacing`,
            padX: n = s.HIGHLIGHT_PAD_X,
            padY: r = s.HIGHLIGHT_PAD_Y
        } = {}) {
            let [i, a] = this.e._withInputs(() => {
                let i = this.e.putU32(Uint32Array.from(e));
                return this.e.collect(32, (a, o) => this.e.ex.qvp_word_bands(this.h, i, e.length, +(t === `ink`), n, r, a, o))
            });
            return ie(this.e, i, a)
        }
        select(e, n = e) {
            this.e.ex.qvp_select(this.h, e < 0 ? t : e, n < 0 ? t : n)
        }
        clearSelection() {
            this.e.ex.qvp_select(this.h, t, t)
        }
        selection() {
            return this._u32s((e, t) => this.e.ex.qvp_selection(this.h, e, t))
        }
        selectionText(e = `rasm_uthmani`, t = !1) {
            return this.e.ex.qvp_selection_text(this.h, f[e] ?? 0, +!!t, this.e.scratch), this.e.qstr(this.e.scratch)
        }
        mask(e, t = `hide`) {
            this.e._withInputs(() => this.e.ex.qvp_mask(this.h, this._target(e), {
                hide: 0,
                block: 1,
                blur: 2
            } [t] ?? 0))
        }
        maskFrom(e, t = `hide`) {
            this.e.ex.qvp_mask_from(this.h, e, {
                hide: 0,
                block: 1,
                blur: 2
            } [t] ?? 0)
        }
        maskOptions({
            blockColor: e = s.MASK_BLOCK,
            padX: t = s.MASK_PAD,
            padY: n = s.MASK_PAD,
            radius: r = s.MASK_RADIUS,
            reverse: i = !1
        } = {}) {
            this.e.ex.qvp_mask_options(this.h, y(e), t, n, r, +!!i)
        }
        unmaskNext(e = 1) {
            return this.e.ex.qvp_unmask_next(this.h, e)
        }
        maskBack(e = 1) {
            return this.e.ex.qvp_mask_back(this.h, e)
        }
        unmaskWord(e) {
            return !!this.e.ex.qvp_unmask_word(this.h, e)
        }
        maskWord(e) {
            return !!this.e.ex.qvp_mask_word(this.h, e)
        }
        unmaskAll() {
            this.e.ex.qvp_unmask_all(this.h)
        }
        maskAll() {
            this.e.ex.qvp_mask_all(this.h)
        }
        unmask() {
            this.e.ex.qvp_unmask(this.h)
        }
        maskHidden() {
            return this._u32s((e, t) => this.e.ex.qvp_mask_hidden(this.h, e, t))
        }
        maskWords() {
            return this._u32s((e, t) => this.e.ex.qvp_mask_words(this.h, e, t))
        }
        wordBandsView(e, {
            height: t = `lineSpacing`,
            padX: n = s.HIGHLIGHT_PAD_X,
            padY: r = s.HIGHLIGHT_PAD_Y
        } = {}) {
            let [i, a] = this.e._withInputs(() => {
                let i = this.e.putU32(Uint32Array.from(e));
                return this.e.collect(32, (a, o) => this.e.ex.qvp_word_bands_view(this.h, i, e.length, +(t === `ink`), n, r, a, o))
            });
            return ie(this.e, i, a)
        }
        maskBoxesView() {
            let [e, t] = this.e.collect(32, (e, t) => this.e.ex.qvp_mask_boxes_view(this.h, e, t));
            return ie(this.e, e, t)
        }
        revealStart({
            lit: e = s.REVEAL_LIT,
            byAyah: t = !1,
            grey: n = s.REVEAL_GREY,
            ink: r = s.INK,
            ayahMarks: i = !0,
            ms: a = 0
        } = {}) {
            return this.e.ex.qvp_reveal_start(this.h, e, +!!t, y(n), y(r), +!!i, a)
        }
        revealGoto(e) {
            return !!this.e.ex.qvp_reveal_goto(this.h, BigInt(e))
        }
        revealPosition() {
            let e = Number(this.e.ex.qvp_reveal_position(this.h));
            return e === -2 ? null : e
        }
        revealStepCount() {
            return this.e.ex.qvp_reveal_step_count(this.h)
        }
        revealStepOf(e) {
            return Number(this.e.ex.qvp_reveal_step_of(this.h, e))
        }
        revealStop() {
            this.e.ex.qvp_reveal_stop(this.h)
        }
        cropBounds(e, {
            pad: t = s.CROP_PAD,
            keepAyahMarks: n = !0
        } = {}) {
            if (!this.e._withInputs(() => this.e.ex.qvp_crop_bounds(this.h, this._target(e), t, +!!n, this.e.scratch))) return null;
            let r = this.e.dv(),
                i = this.e.scratch;
            return {
                x0: r.getFloat32(i, !0),
                y0: r.getFloat32(i + 4, !0),
                x1: r.getFloat32(i + 8, !0),
                y1: r.getFloat32(i + 12, !0),
                nWords: r.getUint32(i + 16, !0),
                ayahMarkDecoration: r.getUint32(i + 20, !0)
            }
        }
        cropSvg(e, {
            pad: t = s.CROP_PAD,
            keepAyahMarks: n = !0,
            background: r = null
        } = {}) {
            return this.e._withInputs(() => this.e.ex.qvp_crop_svg(this.h, this._target(e), t, +!!n, r ? y(r) : 0, this.e.scratch)) ? this.e.qstr(this.e.scratch) : null
        }
    }
    class oe {
        constructor(e, t) {
            this.e = e, this._h = t, e._live.add(this)
        }
        get h() {
            if (!this._h) throw Error(`QvpAtlas was freed`);
            return this._h
        }
        free() {
            this._h && (this.e.ex.qvp_atlas_free(this._h), this._h = 0, this.e._live.delete(this))
        }
        pageOf(e, t) {
            let n = this.e.ex.qvp_atlas_page_of(this.h, e, t);
            return n < 0 ? null : n
        }
        pageRange(e) {
            if (!this.e.ex.qvp_atlas_page_range(this.h, e, this.e.scratch)) return null;
            let t = new Uint16Array(this.e.mem.buffer, this.e.scratch, 4);
            return {
                first: [t[0], t[1]],
                last: [t[2], t[3]]
            }
        }
        _surah(e) {
            let t = this.e.dv();
            return {
                number: t.getUint16(e, !0),
                page: t.getUint16(e + 2, !0),
                ayahCount: t.getUint16(e + 4, !0),
                place: g(`place`)[t.getUint8(e + 6)] || ``,
                arabic: this.e.qstr(e + 8),
                latin: this.e.qstr(e + 16),
                english: this.e.qstr(e + 24)
            }
        }
        surah(e) {
            return this.e.ex.qvp_atlas_surah(this.h, e, this.e.scratch) ? this._surah(this.e.scratch) : null
        }
        surahs() {
            let e = this.e.ex.qvp_atlas_surah_count(this.h),
                t = [];
            for (let n = 0; n < e; n++) this.e.ex.qvp_atlas_surah_at(this.h, n, this.e.scratch), t.push(this._surah(this.e.scratch));
            return t
        }
        pageOfSurah(e) {
            let t = this.surah(e);
            return t ? t.page : null
        }
        pageCount() {
            return this.e.ex.qvp_atlas_page_count(this.h)
        }
        json() {
            return this.e.ex.qvp_atlas_json(this.h, this.e.scratch), this.e.qstr(this.e.scratch)
        }
        division(e, t) {
            if (!this.e.ex.qvp_atlas_division(this.h, {
                    juz: 0,
                    hizb: 1,
                    nisf: 2,
                    rubu_al_hizb: 3
                } [e], t, this.e.scratch)) return null;
            let n = new Uint16Array(this.e.mem.buffer, this.e.scratch, 4);
            return {
                rubuAlHizb: n[0],
                surah: n[1],
                ayah: n[2],
                page: n[3],
                ayahKey: `${n[1]}:${n[2]}`
            }
        }
        juz(e) {
            return this.division(`juz`, e)
        }
        hizb(e) {
            return this.division(`hizb`, e)
        }
        rubuAlHizb(e) {
            return this.division(`rubu_al_hizb`, e)
        }
        divisionOf(e, t, n) {
            let r = this.e.ex.qvp_atlas_division_of(this.h, {
                juz: 0,
                hizb: 1,
                nisf: 2,
                rubu_al_hizb: 3
            } [e], t, n);
            return r < 0 ? null : r
        }
        juzOf(e, t) {
            return this.divisionOf(`juz`, e, t)
        }
        pagesOfJuz(e) {
            if (!this.e.ex.qvp_atlas_pages_of_juz(this.h, e, this.e.scratch)) return null;
            let t = new Uint16Array(this.e.mem.buffer, this.e.scratch, 2);
            return [t[0], t[1]]
        }
        searchSurahs(e) {
            let [t, n] = this.e._withInputs(() => {
                let [t, n] = this.e.putStr(e);
                return this.e.collect(2, (e, r) => this.e.ex.qvp_atlas_search_surahs(this.h, t, n, e, r))
            });
            return Array.from(new Uint16Array(this.e.mem.buffer, t, n)).map(e => this.surah(e))
        }
    }
    let se = {
        right: 0,
        center: 1,
        centre: 1,
        justified: 2
    };
    class ce {
        constructor(e, t, n, r) {
            this.e = e, this._h = t;
            let i = e.ex,
                a = e.scratch;
            this.ayahs = Array.from({
                length: i.qvp_passage_ayah_count(t)
            }, (o, s) => (i.qvp_passage_ayah_text(t, s, a), {
                surah: n,
                ayah: r + s,
                text: e.qstr(a)
            })), this.lineSpacing = i.qvp_passage_line_spacing(t), this.currentLayout = null, e._live.add(this)
        }
        get h() {
            if (!this._h) throw Error(`QvpPassage was freed`);
            return this._h
        }
        free() {
            this._h && (this.e.ex.qvp_passage_free(this._h), this._h = 0, this.e._live.delete(this))
        }
        _writeSpec(e, t) {
            let n = e.align == null ? 0 : se[e.align];
            if (n === void 0) throw Error(`bad align ` + e.align);
            let r = this.e.dv();
            return r.setFloat32(t, e.width ?? 0, !0), r.setFloat32(t + 4, e.scale ?? 1, !0), r.setFloat32(t + 8, e.lineSpacing ?? 1, !0), r.setFloat32(t + 12, e.padding ?? 2, !0), r.setUint8(t + 16, n), r.setUint8(t + 17, +!!e.keepAyahMark), r.setUint16(t + 18, 0, !0), r.setUint32(t + 20, e.maxRows || 0, !0), r.setFloat32(t + 24, e.ellipsisWidth || 0, !0), r.setFloat32(t + 28, e.maxStretch ?? 0, !0), t
        }
        _collect(e, t, n, r) {
            let i = this.e.buf(Math.max(1, t) * n),
                a = Math.min(e(this.h, i, t), t),
                o = this.e.dv();
            return Array.from({
                length: a
            }, (e, t) => r(o, i + t * n))
        }
        layout(e = {}) {
            if (e.maxRows < 0) return null;
            let t = this.e.ex,
                n = this.e.scratch,
                r = this._writeSpec(e, this.e.scratch2 + 43008);
            if (!t.qvp_passage_layout(this.h, r, n)) return null;
            let i = this.e.dv(),
                a = i.getUint32(n + 16, !0),
                o = i.getUint32(n + 20, !0),
                s = i.getUint32(n + 24, !0),
                c = i.getUint32(n + 28, !0),
                l = !!i.getUint8(n + 32),
                u = {
                    width: i.getFloat32(n, !0),
                    height: i.getFloat32(n + 4, !0),
                    scale: i.getFloat32(n + 8, !0),
                    lineSpacing: i.getFloat32(n + 12, !0),
                    isTruncated: l,
                    ellipsis: l ? {
                        x0: i.getFloat32(n + 36, !0),
                        y0: i.getFloat32(n + 40, !0),
                        x1: i.getFloat32(n + 44, !0),
                        y1: i.getFloat32(n + 48, !0)
                    } : null
                };
            u.rows = this._collect(t.qvp_passage_rows, a, 20, (e, t) => ({
                x0: e.getFloat32(t, !0),
                y0: e.getFloat32(t + 4, !0),
                x1: e.getFloat32(t + 8, !0),
                y1: e.getFloat32(t + 12, !0),
                baseline: e.getFloat32(t + 16, !0)
            })), u.words = this._collect(t.qvp_passage_words, o, 44, (e, t) => ({
                surah: e.getUint16(t, !0),
                ayah: e.getUint16(t + 2, !0),
                word: e.getUint16(t + 4, !0),
                page: e.getUint16(t + 6, !0),
                row: e.getUint32(t + 8, !0),
                x0: e.getFloat32(t + 12, !0),
                y0: e.getFloat32(t + 16, !0),
                x1: e.getFloat32(t + 20, !0),
                y1: e.getFloat32(t + 24, !0),
                wordX0: e.getFloat32(t + 28, !0),
                wordY0: e.getFloat32(t + 32, !0),
                wordX1: e.getFloat32(t + 36, !0),
                wordY1: e.getFloat32(t + 40, !0)
            })), u.ayahs = this._collect(t.qvp_passage_ayahs, s, 20, (e, t) => ({
                surah: e.getUint16(t, !0),
                ayah: e.getUint16(t + 2, !0),
                x0: e.getFloat32(t + 4, !0),
                y0: e.getFloat32(t + 8, !0),
                x1: e.getFloat32(t + 12, !0),
                y1: e.getFloat32(t + 16, !0)
            })), u.draws = this._collect(t.qvp_passage_draw_list, c, 12, (e, t) => ({
                page: e.getUint32(t, !0),
                path: e.getUint32(t + 4, !0),
                placement: e.getUint32(t + 8, !0)
            }));
            let d = t.qvp_passage_placements(this.h, 0, 0);
            return u.placements = this._collect(t.qvp_passage_placements, d, 16, (e, t) => ({
                dx: e.getFloat32(t, !0),
                dy: e.getFloat32(t + 4, !0),
                kx: e.getFloat32(t + 8, !0),
                ky: e.getFloat32(t + 12, !0)
            })), this.currentLayout = u
        }
    }
    class le {
        constructor(e, t) {
            this.e = e, this._h = t, this.count = e.ex.qvp_ornament_count(t), this.list = Array.from({
                length: this.count
            }, (e, t) => this._ornament(t)), e._live.add(this)
        }
        get h() {
            if (!this._h) throw Error(`QvpOrnaments was freed`);
            return this._h
        }
        free() {
            this._h && (this.e.ex.qvp_ornaments_free(this._h), this._h = 0, this.e._live.delete(this))
        }
        _ornament(e) {
            let t = this.e.scratch;
            if (!this.e.ex.qvp_ornament_info(this.h, e, t)) throw E(`qvp_ornament_info`, e, `the ornament set`);
            let i = this.e.dv(),
                a = e => i.getUint32(t + e * 4, !0);
            return {
                index: e,
                kind: n[a(0)],
                lineage: r[a(1)],
                style: this.e.qstr(t + 24),
                riwayah: this.e.qstr(t + 32),
                hasSlices: !!a(3),
                licence: {
                    id: this.e.qstr(t + 40),
                    status: this.e.qstr(t + 48),
                    redistributable: !!a(4),
                    attribution: this.e.qstr(t + 56)
                },
                parts: Array.from({
                    length: a(2)
                }, (t, n) => this._part(e, n))
            }
        }
        _part(e, t) {
            let n = this.e.scratch2 + 4096;
            if (!this.e.ex.qvp_ornament_part(this.h, e, t, n)) throw E(`qvp_ornament_part`, `${e}, ${t}`, `the ornament set`);
            let r = this.e.dv();
            return {
                index: t,
                color: r.getUint32(n, !0),
                stroke: !!r.getUint32(n + 4, !0),
                name: this.e.qstr(n + 8)
            }
        }
        find(e, t) {
            let r = this.e._withInputs(() => this.e.ex.qvp_ornament_find(this.h, n.indexOf(e), ...this.e.putStr(t)));
            return r < 0 ? null : this.list[r]
        }
        ofKind(e) {
            return this.list.filter(t => t.kind === e)
        }
        styles() {
            let e = [];
            for (let t of this.list) {
                let n = e.find(e => e.style === t.style);
                n || (n = {
                    style: t.style,
                    riwayah: t.riwayah,
                    lineage: t.lineage,
                    ayahMark: null,
                    surahHeader: null,
                    pageFrame: null
                }, e.push(n)), n[{
                    ayah_mark: `ayahMark`,
                    surah_header: `surahHeader`,
                    page_frame: `pageFrame`
                } [t.kind]] = t
            }
            return e
        }
    }
    class ue {
        constructor(e) {
            this.canvas = e, this.ctx = e.getContext(`2d`), this.base = document.createElement(`canvas`), this.baseKey = ``, this.list = null, this.places = null, this.listKey = ``, this.inkBudget = 64 << 20, this.ornamentLayer = null, this.ornamentKey = ``, this.ornamentFor = null, this.stats = {
                baseMs: 0,
                overlayMs: 0,
                basePaths: 0,
                overlayPaths: 0,
                bands: 0
            }
        }
        drawOrnaments(e, t, n, r, a, o, s) {
            let c = t.dressInfo();
            if (!c) {
                this.ornamentLayer = null, this.ornamentKey = ``, this.ornamentFor = null;
                return
            }
            let l = n.scale || 1,
                u = Math.ceil(c.overflow[1] * l),
                d = Math.ceil(c.overflow[3] * l),
                f = a - u,
                p = this.canvas.width,
                m = Math.min(i, Math.ceil((o + u + d) * r)),
                h = t.currentLayout,
                g = `${t.h}|${n.scale.toFixed(4)}|${n.offsetX.toFixed(1)}|${f.toFixed(1)}|${r}|${c.revision}|${p}x${m}`;
            if (!this.ornamentLayer || g !== this.ornamentKey || this.ornamentFor !== h) {
                this.ornamentLayer ||= document.createElement(`canvas`), this.ornamentLayer.width = p, this.ornamentLayer.height = m;
                let e = this.ornamentLayer.getContext(`2d`),
                    n = {
                        ...s,
                        offsetY: s.offsetY + u
                    },
                    i = -2;
                for (let a of t.dressGeometry()) {
                    if (a.placement !== i) {
                        let [o, s, c, l] = a.placement === null ? this.placementTransform(t, n, {
                            dx: 0,
                            dy: 0,
                            kx: 1,
                            ky: 1
                        }, r) : this.groupTransform(t, n, a.placement, r);
                        e.setTransform(o, 0, 0, s, c, l), i = a.placement
                    }
                    a.stroke ? (e.strokeStyle = b(a.color), e.lineWidth = a.strokeWidth, e.lineCap = `round`, e.lineJoin = `round`, e.stroke(a.path)) : (e.fillStyle = b(a.color), e.fill(a.path, a.evenOdd ? `evenodd` : `nonzero`))
                }
                this.ornamentKey = g, this.ornamentFor = h
            }
            e.setTransform(1, 0, 0, 1, 0, 0), e.drawImage(this.ornamentLayer, 0, Math.round(r * (n.offsetY + f)))
        }
        groupTransform(e, t, n, r) {
            let i = e.currentLayout || {
                    scale: 1,
                    offsetX: 0,
                    offsetY: 0,
                    lineDy: null,
                    groups: null
                },
                a = 0,
                o = 0,
                s = 1,
                c = 1;
            return i.groups && i.groups.length > n * 4 ? (a = i.groups[n * 4], o = i.groups[n * 4 + 1], s = i.groups[n * 4 + 2], c = i.groups[n * 4 + 3]) : i.lineDy && (o = i.lineDy[n] || 0), this.placementTransform(e, t, {
                dx: a,
                dy: o,
                kx: s,
                ky: c
            }, r)
        }
        placementTransform(e, t, n, r) {
            let i = e.currentLayout || {
                    scale: 1,
                    offsetX: 0,
                    offsetY: 0
                },
                a = r * t.scale * i.scale;
            return [a * n.kx, a * n.ky, r * (t.offsetX + t.scale * (i.offsetX + n.dx * i.scale)), r * (t.offsetY + t.scale * (i.offsetY + n.dy * i.scale))]
        }
        lineTransform(e, t, n, r) {
            let [i, , a, o] = this.groupTransform(e, t, n, r);
            return [i, a, o]
        }
        static drawPassage(e, t, n, {
            x: r = 0,
            y: i = 0,
            dpr: a = 1,
            ink: o = s.INK
        } = {}) {
            let c = e => {
                    let t = n instanceof Map ? n.get(e) : n[e];
                    if (!t) throw Error(`the passage draws page ` + e + `, which was not given`);
                    return t
                },
                l = a * t.scale,
                u = typeof o == `function`;
            u || (e.fillStyle = b(y(o)));
            let d = null,
                f = null,
                p = -1;
            for (let n of t.draws) {
                if ((!d || d.page !== n.page) && (d = c(n.page), f = d.buildPaths()), n.placement !== p) {
                    let o = t.placements[n.placement];
                    e.setTransform(l * o.kx, 0, 0, l * o.ky, a * (r + t.scale * o.dx), a * (i + t.scale * o.dy)), p = n.placement
                }
                u && (e.fillStyle = b(y(o(d, n.path)))), e.fill(f[n.path], d.pathEvenOdd(n.path) ? `evenodd` : `nonzero`)
            }
        }
        setGroupTransform(e, t, n, r, i) {
            let [a, o, s, c] = this.groupTransform(t, n, r, i);
            e.setTransform(a, 0, 0, o, s, c)
        }
        pathGroup(e, t) {
            let n = e.currentLayout;
            return n && n.pathGroup ? n.pathGroup[t] : e.pathLine(t)
        }
        drawBoxes(e, t, n, r) {
            e.setTransform(r * n.scale, 0, 0, r * n.scale, r * n.offsetX, r * n.offsetY);
            let i = null,
                a = 0,
                o = () => {
                    i &&= (e.fillStyle = b(a), e.fill(i, `nonzero`), null)
                };
            for (let e of t)(!i || e.id !== i.id || e.color !== a) && (o(), i = new Path2D, i.id = e.id, a = e.color), e.radius > 0 ? i.roundRect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0, e.radius) : i.rect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0);
            o()
        }
        draw(e, t, n) {
            let r = e.buildPaths(),
                a = e.styledPaths(),
                o = new Set(a.map(e => e[0])),
                s = e.currentLayout || {
                    scale: 1,
                    offsetX: 0,
                    offsetY: 0,
                    lineDy: null,
                    lineSpacing: 0
                },
                c = e.defaultInk,
                l = this.canvas.width,
                u = this.canvas.height,
                d = u / n,
                f = d / 2,
                p = d / 2,
                m = t.scale || 1,
                h = (s.contentH || 0) * m,
                g = h > 0 && l * h * n * 4 <= this.inkBudget && h * n <= i,
                _ = g ? 0 : Math.floor((-t.offsetY - f) / p) * p,
                v = g ? h : d + 2 * f,
                y = _ / m,
                x = (_ + v) / m,
                S = {
                    ...t,
                    offsetY: -_
                },
                C = `${t.scale.toFixed(4)}|${t.offsetX.toFixed(1)}|${_.toFixed(1)}|${n}|${c}|${s.scale}|${s.lineSpacing}|${s.lineDy?s.lineDy[0]:``}|${s.groups?s.groups.length+`:`+s.groups[1]:``}|${(s.repeats||[]).length}|${s.omitted?s.omitted.size:0}|${[...o].sort((e,t)=>e-t).join(`,`)}`,
                w = `${e.page}|${y.toFixed(1)}|${x.toFixed(1)}|${s.scale}|${s.rows}|${s.contentH}`;
            w !== this.listKey && (this.list = e.layoutDrawList(y, x), this.places = e.layoutPlacements(), this.listKey = w);
            let T = this.list,
                E = this.places,
                ee = (r, i, a = t) => {
                    let [o, s, c, l] = this.placementTransform(e, a, {
                        dx: E[i * 4],
                        dy: E[i * 4 + 1],
                        kx: E[i * 4 + 2],
                        ky: E[i * 4 + 3]
                    }, n);
                    r.setTransform(o, 0, 0, s, c, l)
                },
                te = Math.ceil(v * n);
            if (C !== this.baseKey || this.base.width !== l || this.base.height !== te) {
                let t = performance.now();
                this.base.width = l, this.base.height = te;
                let n = this.base.getContext(`2d`);
                n.fillStyle = b(c);
                let i = 0,
                    a = -1;
                for (let t = 0; t < T.length; t += 2) {
                    let s = T[t],
                        c = T[t + 1];
                    o.has(s) || (c !== a && (ee(n, c, S), a = c), n.fill(r[s], e.pathEvenOdd(s) ? `evenodd` : `nonzero`), i++)
                }
                this.baseKey = C, this.stats.baseMs = performance.now() - t, this.stats.basePaths = i
            }
            let D = performance.now(),
                O = this.ctx;
            O.setTransform(1, 0, 0, 1, 0, 0), O.clearRect(0, 0, l, u), this.drawOrnaments(O, e, t, n, _, v, S);
            let ne = e.highlightBoxesView();
            this.drawBoxes(O, ne, t, n), O.setTransform(1, 0, 0, 1, 0, 0), O.drawImage(this.base, 0, Math.round(n * (t.offsetY + _)));
            let re = new Map(a),
                ie = -1;
            for (let t = 0; t < T.length; t += 2) {
                let n = T[t],
                    i = T[t + 1],
                    a = re.get(n);
                a !== void 0 && a & 255 && (i !== ie && (ee(O, i), ie = i), O.fillStyle = b(a), O.fill(r[n], e.pathEvenOdd(n) ? `evenodd` : `nonzero`))
            }
            this.drawBoxes(O, e.maskBoxesView(), t, n), this.stats.overlayMs = performance.now() - D, this.stats.overlayPaths = a.length, this.stats.bands = ne.length
        }
    }
    return {
        QvpEngine: ee,
        QvpPage: ae,
        QvpAtlas: oe,
        QvpOrnaments: le,
        QvpPassage: ce,
        CanvasRenderer: ue,
        Sel: x,
        T: C,
        KIND: c,
        FAMILY: l,
        CATEGORY: u,
        DECORATION: d,
        FORM: f,
        LAYER: p,
        NAMES_TABLE: m,
        DEFAULTS: s,
        NONE: t,
        css: b,
        rgba: y,
        parseTarget: D
    }
})();

var {
    QvpEngine: r,
    QvpPage: i,
    QvpAtlas: a,
    QvpOrnaments: o,
    QvpPassage: s,
    CanvasRenderer: c,
    Sel: l,
    T: u,
    KIND: d,
    FAMILY: f,
    CATEGORY: p,
    DECORATION: m,
    FORM: h,
    LAYER: g,
    NAMES_TABLE: _,
    DEFAULTS: v,
    NONE: y,
    css: b,
    rgba: x,
    parseTarget: S
} = n;

export { g as Layer, l as Sel, r as QvpEngine, c as CanvasRenderer };
