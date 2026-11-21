// Vendored TajweedFormer 3.1.3 browser client. See the root LICENSE for provenance.
const sdkAssets = {
    glue: "/assets/tajweedformer-2YZDQmxP.js",
    worker: "/assets/worker-DN3ZN5z2.js",
    sharing: "/assets/sharing-DOCgUXqb.js",
    outbox: "/assets/outbox-DondoSrq.js"
};
const __vite__mapDeps = indexes => indexes.map(index => [sdkAssets.sharing, sdkAssets.outbox][index].slice(1));

var e = Object.defineProperty;

var t = (t, n) => {
        let r = {};
        for (var i in t) e(r, i, {
            get: t[i],
            enumerable: !0
        });
        return n || e(r, Symbol.toStringTag, {
            value: `Module`
        }), r
    };

var jn = {
        latency_ms: [
            [`le_5`, 5],
            [`le_10`, 10],
            [`le_20`, 20],
            [`le_40`, 40],
            [`le_80`, 80],
            [`le_160`, 160],
            [`le_320`, 320],
            [`gt_320`, 1 / 0]
        ],
        rtf: [
            [`le_0_1`, .1],
            [`le_0_25`, .25],
            [`le_0_5`, .5],
            [`le_1`, 1],
            [`gt_1`, 1 / 0]
        ],
        ms: [
            [`le_250`, 250],
            [`le_500`, 500],
            [`le_1000`, 1e3],
            [`le_2000`, 2e3],
            [`le_4000`, 4e3],
            [`gt_4000`, 1 / 0]
        ],
        pct: [
            [`le_1`, 1],
            [`le_2`, 2],
            [`le_5`, 5],
            [`le_10`, 10],
            [`le_20`, 20],
            [`gt_20`, 1 / 0]
        ],
        margin: [
            [`le_0_5`, .5],
            [`le_1`, 1],
            [`le_2`, 2],
            [`le_4`, 4],
            [`le_8`, 8],
            [`gt_8`, 1 / 0]
        ],
        confidence: [
            [`le_0_5`, .5],
            [`le_0_7`, .7],
            [`le_0_8`, .8],
            [`le_0_9`, .9],
            [`le_0_95`, .95],
            [`gt_0_95`, 1 / 0]
        ],
        word: [
            [`le_3`, 3],
            [`le_4`, 4],
            [`le_5`, 5],
            [`le_6`, 6],
            [`le_7`, 7],
            [`gt_7`, 1 / 0]
        ]
    };

function Mn(e, t) {
    for (let [n, r] of jn[e])
        if (t <= r) return n;
    return jn[e][jn[e].length - 1][0]
}

var Nn = (e, t, n, r = 1) => {
        let i = Mn(t, n);
        e[i] = (e[i] || 0) + r
    };

var Pn = (e = Date.now()) => new Date(e).toISOString().slice(0, 10);

var Fn = [`non_finite`, `deadline`, `ane_unavailable`, `npu_unavailable`, `model_load`, `thermal`, `memory`, `other`];

var In = 1e7;

var Ln = 864e5;

var Rn = Object.freeze([`ayahs`, `surah_ayahs`, `coverage`, `words`, `rule_checks`, `rule_flags`]);

var zn = Object.freeze([`launches`, `ayahs`, `words`, `share_asked`, `share_yes`, `share_no`]);

function Bn() {
    let e = new Uint8Array(16);
    return globalThis.crypto.getRandomValues(e), [...e].map(e => e.toString(16).padStart(2, `0`)).join(``)
}

var Vn = Object.freeze({
        web: `web`,
        windows: `native`,
        linux: `native`,
        macos: `apple`,
        ios: `apple`,
        android: `android`
    });

var Hn = e => Vn[e] || `web`;

var Un = class e {
        constructor({
            state: e,
            platform: t = `web`,
            product: n = Hn(t),
            sdkVersion: r = `3.1.3`,
            appVersion: i = `0`,
            device: a,
            clock: o = Date.now,
            enabled: s = !0
        }) {
            Object.assign(this, {
                state: e,
                product: n,
                platform: t,
                sdkVersion: r,
                appVersion: i,
                device: a,
                clock: o
            }), this.enabled = s, this.coldStartDone = !1
        }
        _days() {
            return this.state.get(`telemetry.days`) || {}
        }
        _save(e) {
            this.state.set(`telemetry.days`, e)
        }
        _today() {
            let e = this._days(),
                t = Pn(this.clock());
            return e[t] || (e[t] = {
                v: 2,
                day: t,
                product: this.product,
                platform: this.platform,
                sdk_version: this.sdkVersion,
                app_version: this.appVersion,
                device: this.device,
                cohorts: [],
                coverage: {},
                downloads: []
            }), {
                days: e,
                d: e[t]
            }
        }
        _edit(e) {
            if (!this.enabled) return;
            let {
                days: t,
                d: n
            } = this._today();
            e(n);
            let r = Object.keys(t).sort();
            for (; r.length > 7;) delete t[r.shift()];
            this._save(t)
        }
        _cohort(e, t) {
            let n = e.cohorts.find(e => [`revision`, `build`, `context`, `backend`].every(n => e[n] === t[n]));
            return n || (n = {
                revision: t.revision,
                build: t.build,
                context: t.context,
                backend: t.backend,
                sessions: 0,
                minutes: 0,
                chunks: 0,
                aborted: 0,
                fallbacks: {},
                self_test: {
                    pass: 0,
                    fail: 0
                },
                latency_ms: {},
                rtf: {},
                cold_start_ms: {},
                model_load_ms: {},
                thermal: {
                    transitions: 0,
                    throttled_sessions: 0
                },
                margin: {},
                confidence: {},
                takes: 0,
                audio_ms: 0,
                speech_ms: 0,
                silence_ms: 0,
                tokens: {},
                compute_us: 0
            }, e.cohorts.push(n)), n
        }
        modelLoaded(e, t) {
            this._edit(n => Nn(this._cohort(n, e).model_load_ms, `ms`, t))
        }
        take(e, {
            samples: t = 0,
            sampleRate: n = 16e3,
            chunkUs: r = [],
            chunkLenMs: i = 320,
            aborted: a = !1,
            firstMs: o = null,
            margins: s = [],
            confidences: c = [],
            tokens: l = {},
            speechFrames: u = 0,
            silenceFrames: d = 0
        }) {
            this._edit(f => {
                let p = this._cohort(f, e);
                p.sessions++, a && p.aborted++, p.minutes = Math.round((p.minutes + t / n / 60) * 1e3) / 1e3, p.chunks = Math.min(In, p.chunks + r.length);
                for (let e of r) Nn(p.latency_ms, `latency_ms`, e / 1e3), Nn(p.rtf, `rtf`, e / 1e3 / i);
                !this.coldStartDone && o !== null && (Nn(p.cold_start_ms, `ms`, o), this.coldStartDone = !0);
                for (let e of s) Nn(p.margin, `margin`, e);
                for (let e of c) Nn(p.confidence, `confidence`, e);
                if (!a) {
                    p.takes++, p.audio_ms += Math.floor(1e3 * t / n), p.speech_ms += 40 * u, p.silence_ms += 40 * d;
                    for (let e of r) p.compute_us += e;
                    for (let [e, t] of Object.entries(l)) t > 0 && (p.tokens[e] = Math.min(In, (p.tokens[e] || 0) + t))
                }
            })
        }
        recited(e, t) {
            this._edit(n => {
                let r = String(e);
                n.ayahs = Math.max(0, Math.min(In, (n.ayahs || 0) + t));
                for (let e of [`surah_ayahs`, `coverage`]) n[e] = n[e] || {}, n[e][r] = Math.max(0, (n[e][r] || 0) + t), n[e][r] || delete n[e][r]
            })
        }
        checks(e, t, n) {
            if (!t) return !0;
            let r = this.enabled;
            return this._edit(i => {
                i.rule_checks = i.rule_checks || {}, i.rule_flags = i.rule_flags || {};
                let a = Pn(this.clock()),
                    o = this.state.get(`telemetry.rules`);
                if ((!o || o.day !== a) && (o = {
                        day: a,
                        names: []
                    }), !o.names.includes(e)) {
                    if (o.names.length >= 32) {
                        r = !1;
                        return
                    }
                    o.names.push(e), this.state.set(`telemetry.rules`, o)
                }
                i.rule_checks[e] = Math.min(In, (i.rule_checks[e] || 0) + t), n && (i.rule_flags[e] = Math.min(i.rule_checks[e], (i.rule_flags[e] || 0) + n)), e === `word` && (i.words = Math.min(In, (i.words || 0) + t))
            }), r
        }
        fallback(e, t) {
            let n = Fn.includes(t) ? t : `other`;
            this._edit(t => {
                let r = this._cohort(t, e);
                r.fallbacks[n] = (r.fallbacks[n] || 0) + 1
            })
        }
        download({
            revision: e,
            build: t = null,
            profile: n,
            bytes: r,
            success: i,
            resumed: a
        }) {
            this._edit(o => {
                let s = o.downloads.find(r => r.revision === e && (r.build || null) === t && r.profile === n);
                s || (s = {
                    revision: e,
                    ...t ? {
                        build: t
                    } : {},
                    profile: n,
                    bytes: 0,
                    success: 0,
                    failed: 0,
                    resumed: 0
                }, o.downloads.push(s)), s.bytes += r, i ? s.success++ : s.failed++, a && s.resumed++
            })
        }
        count(e, t = 1) {
            if (!zn.includes(e)) throw RangeError(`telemetry counter ${e}`);
            this._edit(n => {
                n[e] = Math.min(In, (n[e] || 0) + t)
            })
        }
        seal() {
            let t = this._days(),
                n = this._sealed(),
                r = 0;
            for (let i of Object.keys(t).sort()) {
                let a = e.wire(t[i]);
                if (delete t[i], !e.hasContent(a)) continue;
                let o = Bn();
                n.push({
                    report_id: o,
                    day: i,
                    body: JSON.stringify({
                        ...a,
                        report_id: o
                    }),
                    attempts: 0,
                    next: 0
                }), r++
            }
            return this._putSealed(this._fresh(n)), this._save(t), r
        }
        _sealed() {
            return this.state.get(`telemetry.sealed`) || []
        }
        _putSealed(e) {
            this.state.set(`telemetry.sealed`, e.length ? e : null)
        }
        _fresh(e) {
            let t = Pn(this.clock() - 7 * Ln);
            return e.filter(e => e.day >= t).sort((e, t) => e.day < t.day ? -1 : +(e.day > t.day))
        }
        reports() {
            return this._fresh(this._sealed())
        }
        pending() {
            return this.reports().map(e => JSON.parse(e.body))
        }
        dropReport(e) {
            this._putSealed(this._sealed().filter(t => t.report_id !== e))
        }
        deferReport(e) {
            let t = this._sealed(),
                n = t.find(t => t.report_id === e);
            n && (n.attempts += 1, n.next = n.attempts === 1 ? this.clock() + 6e4 : n.attempts === 2 ? this.clock() + 6e5 : -1, this._putSealed(t))
        }
        launched() {
            let e = this._sealed();
            for (let t of e) t.next === -1 && (t.next = 0);
            this._putSealed(e)
        }
        due() {
            let e = this.clock();
            return this.reports().filter(t => t.next !== -1 && t.next <= e)
        }
        drop(e) {
            let t = this._days();
            delete t[e], this._save(t)
        }
        clear() {
            this.state.set(`telemetry.days`, null), this.state.set(`telemetry.sealed`, null), this.state.set(`telemetry.rules`, null)
        }
        static hasContent(e) {
            return e.cohorts.length > 0 || !!e.coverage || !!e.downloads || zn.some(t => e[t] > 0) || !!e.surah_ayahs || !!e.rule_checks
        }
        static wire(e) {
            let t = e => {
                    let {
                        takes: t,
                        audio_ms: n,
                        speech_ms: r,
                        silence_ms: i,
                        compute_us: a,
                        tokens: o,
                        ...s
                    } = e;
                    t > 0 && (s.takes = t), n > 0 && (s.audio_s = n / 1e3), r > 0 && (s.speech_s = r / 1e3), i > 0 && (s.silence_s = i / 1e3), o && Object.keys(o).length && (s.tokens = o);
                    let c = Math.floor(((a || 0) + 500) / 1e3);
                    return c > 0 && (s.compute_s = c / 1e3), s
                },
                n = e.cohorts.slice().sort((e, t) => t.sessions - e.sessions);
            if (n.length > 16) {
                let e = n.slice(0, 16),
                    t = n.slice(16);
                for (let n of t) e[0].sessions += n.sessions, e[0].minutes += n.minutes, e[0].chunks += n.chunks, e[0].aborted += n.aborted;
                n = e
            }
            let r = {
                v: 2,
                day: e.day,
                product: e.product,
                platform: e.platform,
                sdk_version: e.sdk_version,
                app_version: e.app_version,
                device: e.device,
                cohorts: n.map(t)
            };
            Object.keys(e.coverage || {}).length && (r.coverage = e.coverage), (e.downloads || []).length && (r.downloads = e.downloads);
            for (let t of zn) e[t] > 0 && (r[t] = e[t]);
            if (e.surah_ayahs && Object.keys(e.surah_ayahs).length && (r.surah_ayahs = e.surah_ayahs), e.rule_checks && Object.keys(e.rule_checks).length) {
                r.rule_checks = e.rule_checks;
                let t = Object.fromEntries(Object.entries(e.rule_flags || {}).filter(([t, n]) => n > 0 && t in e.rule_checks));
                Object.keys(t).length && (r.rule_flags = t)
            }
            let i = Rn.filter(e => r[e] !== void 0);
            return i.length && (r.reported = i), r
        }
    };

function Wn() {
    let e = globalThis.navigator,
        t = typeof process < `u` && process.versions && process.versions.node && !globalThis.window,
        n = e && typeof e.deviceMemory == `number` ? e.deviceMemory : null,
        r = e => e === null ? void 0 : e < 2 ? `lt2` : e < 4 ? `2_4` : e < 8 ? `4_8` : e < 16 ? `8_16` : `ge16`;
    if (t) {
        let e = Number(process.versions.node.split(`.`)[0]) || 1;
        return {
            class: `node`,
            soc: `wasm`,
            os_major: Math.max(1, Math.min(99, e))
        }
    }
    let i = e && e.userAgent || ``,
        a = /(?:Chrome|Firefox|Version)\/(\d+)/.exec(i),
        o = {
            class: `browser`,
            soc: `wasm`,
            os_major: Math.max(1, Math.min(99, Math.floor((a ? Number(a[1]) : 10) / 10)))
        };
    return n !== null && (o.ram_tier = r(n)), o
}

var Gn = () => globalThis.document === void 0 && !!(globalThis.process && globalThis.process.versions && globalThis.process.versions.node);

function Kn() {
    throw Error(`the Node parts of @quran-lab/tajweedformer are not loaded: import the package by its name, or web/index.node.js, not web/index.js`)
}

async function qn(e) {
    if (!Gn()) return {};
    let t = await Kn().wasm(e);
    return {
        instantiateWasm(e, n) {
            return WebAssembly.instantiate(t, e).then(e => n(e.instance, e.module)), {}
        }
    }
}

function Jn() {
    let e = new Map;
    return {
        kind: `memory`,
        get(t) {
            return e.has(t) ? JSON.parse(e.get(t)) : null
        },
        set(t, n) {
            n == null ? e.delete(t) : e.set(t, JSON.stringify(n))
        }
    }
}

function Yn(e = `quranlab.`) {
    let t = Jn(),
        n = (() => {
            try {
                return globalThis.localStorage || null
            } catch {
                return null
            }
        })();
    return {
        kind: n ? `localStorage` : `memory`,
        get(r) {
            try {
                let i = n ? n.getItem(e + r) : null;
                return i === null ? t.get(r) : JSON.parse(i)
            } catch {
                return t.get(r)
            }
        },
        set(r, i) {
            t.set(r, i);
            try {
                n && (i == null ? n.removeItem(e + r) : n.setItem(e + r, JSON.stringify(i)))
            } catch {}
        }
    }
}

async function Xn(e) {
    let {
        fs: t,
        path: n
    } = Kn();
    t.mkdirSync(e, {
        recursive: !0
    });
    let r = t => n.join(e, encodeURIComponent(t) + `.json`);
    return {
        kind: `directory`,
        get(e) {
            try {
                return JSON.parse(t.readFileSync(r(e), `utf8`))
            } catch {
                return null
            }
        },
        set(e, n) {
            let i = r(e);
            if (n == null) {
                t.rmSync(i, {
                    force: !0
                });
                return
            }
            let a = `${i}.${process.pid}.tmp`;
            t.writeFileSync(a, JSON.stringify(n), {
                mode: 384
            }), t.renameSync(a, i)
        }
    }
}

var Zn = Object.freeze([1, 2, 3]);

var Qn = Object.freeze([1, 2, 3]);

Object.freeze([2, 3]);

var $n = Object.freeze([`android`, `apple`, `web`, `native`]);

var er = [`model_id`, `family`, `revision`, `min_sdk_version`, `engine_format`, `coreml_format`, `tokens`, `tokens_sha256`, `default_context`, `contexts`];

var tr = Object.freeze([`token_diffs`, `site_flag_diffs`, `word_flag_diffs`]);

var nr = `fc02fbd906608ebc206a371d8e61c1062ea555778b44b1ac834061043aee4a33`;

var rr = /^(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,5})$/;

var ir = /^[\x21-\x7e]{1,64}$/;

var ar = /^[a-z][a-z0-9_]{0,31}$/;

var or = [`model_id`, `family`, `revision`, `min_sdk_version`, `engine_format`, `coreml_format`, `tokens_sha256`, `coreml`, `sidecar`, `keeps`, `tokens`];

var sr = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

var cr = /^\d+\.\d+\.\d+$/;

var lr = /^[0-9a-fA-F]{64}$/;

var A = class extends Error {
        constructor(e, t, n) {
            super(t), this.name = `ModelFolderError`, this.code = e, n !== void 0 && (this.file = n)
        }
    };

var ur = new TextEncoder;

var j = e => ur.encode(e);

var M = e => typeof e == `object` && !!e && !Array.isArray(e);

var dr = e => typeof e == `number` && Number.isInteger(e);

function fr(e, t) {
    let n = Math.min(e.length, t.length);
    for (let r = 0; r < n; r++)
        if (e[r] !== t[r]) return e[r] - t[r];
    return e.length - t.length
}

function pr(e) {
    if (typeof e != `string` || e.length % 2 || /[^0-9a-fA-F]/.test(e)) throw TypeError(`not hex`);
    let t = new Uint8Array(e.length / 2);
    for (let n = 0; n < t.length; n++) t[n] = parseInt(e.substr(2 * n, 2), 16);
    return t
}

function mr(e) {
    let t = ``;
    for (let n of e) t += n.toString(16).padStart(2, `0`);
    return t
}

function hr(e) {
    if (typeof e != `string` || !/^[A-Za-z0-9+/]*={0,2}$/.test(e) || e.length % 4) return null;
    let t = atob(e),
        n = new Uint8Array(t.length);
    for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
    return n
}

var gr = e => e instanceof Uint8Array ? e : ArrayBuffer.isView(e) ? new Uint8Array(e.buffer, e.byteOffset, e.byteLength) : new Uint8Array(e);

function _r() {
    let e = globalThis.crypto && globalThis.crypto.subtle;
    if (!e) throw new A(`signature_unsupported`, `WebCrypto (crypto.subtle) is not available here; it needs a secure context in browsers`);
    return e
}

async function vr(e) {
    return mr(new Uint8Array(await _r().digest(`SHA-256`, gr(e))))
}

function yr(e, {
    tolerance: t = !0,
    raw: n = !0
} = {}) {
    let r = [...e.files].sort((e, t) => fr(j(e.path), j(t.path))),
        i;
    if (e.format === 1) i = `quranlab-model-manifest 1\nmodel ${e.model}\nrevision ${e.revision}\ncoreml ${e.coreml}\n`, i += `sidecar ${e.sidecar}\nkeeps ${e.keeps}\ntokens ${e.tokens}\n`;
    else if (e.format === 2) {
        i = `quranlab-model-manifest 2
`;
        for (let t of or) i += `${t} ${e[t]}\n`
    } else if (e.format === 3) {
        i = `quranlab-model-manifest 3
`;
        for (let t of er) i += `${t} ${Array.isArray(e[t])?e[t].join(`,`):e[t]}\n`, t === `revision` && e.version !== void 0 && (i += `version ${e.version}\n`);
        t && (i += Sr(e.golden_tolerance)), n && (i += Dr(e.golden_raw_tolerance));
        let a = e => e === `*` ? `*` : $n.filter(t => [].concat(e).includes(t)).join(`,`);
        for (let e of r) {
            let t = e.decoded || null;
            i += `file ${String(e.sha256).toLowerCase()} ${e.size} ${e.path} ${a(e.platforms)} ${e.soc} ${e.context} ${e.role} ${e.need} ${e.encoding} ${t?String(t.sha256).toLowerCase():`-`} ${t?t.size:`-`} ${t?t.path:`-`}\n`
        }
        return i
    } else throw new A(`format_unsupported`, `manifest format ${e.format} is not supported`);
    for (let e of r) i += `file ${String(e.sha256).toLowerCase()} ${e.size} ${e.path}\n`;
    return i
}

var br = e => typeof e == `number` && Number.isInteger(e) && e >= 0 && e <= 1e6;

var xr = (e, t) => ir.test(e) && M(t) && tr.every(e => br(t[e]));

function Sr(e) {
    return M(e) ? Object.keys(e).filter(t => xr(t, e[t])).sort((e, t) => fr(j(e), j(t))).map(t => `golden_tolerance ${t} ${tr.map(n=>String(e[t][n])).join(` `)}\n`).join(``) : ``
}

var Cr = (e, t) => typeof e == `number` && Number.isFinite(e) && e >= 0 && e <= t && Number(e.toFixed(6)) === e;

var wr = (e, t) => {
        let n = Object.keys(e);
        return n.length === t.length && t.every(e => n.includes(e))
    };

function Tr(e, t) {
    if (!ir.test(e) || !M(t)) return !1;
    for (let [e, n] of Object.entries(t)) {
        if (!M(n)) return !1;
        if (e === `attr`) {
            if (!(wr(n, [`p_mean`]) && Cr(n.p_mean, 1))) return !1;
            continue
        }
        if (!ar.test(e) || !(wr(n, [`token_edits`, `lp_mean`, `lp_p99`]) && br(n.token_edits) && Cr(n.lp_mean, 30) && Cr(n.lp_p99, 30))) return !1
    }
    return !0
}

var Er = e => e.toFixed(6).replace(/0+$/, ``).replace(/\.$/, `.0`);

function Dr(e) {
    if (!M(e)) return ``;
    let t = [];
    for (let n of Object.keys(e))
        if (Tr(n, e[n]))
            for (let [r, i] of Object.entries(e[n])) {
                let e = r === `attr` ? `golden_raw ${n} attr p_mean=${Er(i.p_mean)}\n` : `golden_raw ${n} ${r} token_edits=${String(i.token_edits)} lp_mean=${Er(i.lp_mean)} lp_p99=${Er(i.lp_p99)}\n`;
                t.push([j(`${n} ${r}`), e])
            }
    return t.sort((e, t) => fr(e[0], t[0])).map(e => e[1]).join(``)
}

function Or(e) {
    if (!M(e)) return null;
    let t = {},
        n = [];
    for (let [r, i] of Object.entries(e)) Tr(r, i) ? t[r] = i : n.push(r);
    return {
        tolerance: t,
        tokensOnly: n
    }
}

function kr(e) {
    if (!M(e)) return null;
    let t = {};
    for (let [n, r] of Object.entries(e)) xr(n, r) && (t[n] = {
        token_diffs: r.token_diffs,
        site_flag_diffs: r.site_flag_diffs,
        word_flag_diffs: r.word_flag_diffs
    });
    return t
}

function Ar(e, t) {
    let n = e => {
            if (typeof e != `string`) return null;
            let t = e.split(`-`)[0].split(`.`).map(e => /^\d+$/.test(e) ? Number(e) : NaN);
            return !t.length || t.some(Number.isNaN) ? null : t
        },
        r = n(e),
        i = n(t);
    if (!r || !i) return !1;
    for (let e = 0; e < Math.max(r.length, i.length); e++) {
        let t = r[e] || 0,
            n = i[e] || 0;
        if (t !== n) return t > n
    }
    return !0
}

function jr(e) {
    return typeof e != `string` || !e || e.startsWith(`/`) || e.includes(`\\`) || e.includes(`\0`) || /^[A-Za-z]:/.test(e) ? !1 : e.split(`/`).every(e => e && e !== `.` && e !== `..`)
}

function Mr(e) {
    let t = e => {
        throw new A(`manifest_invalid`, `manifest.json: ${e}`)
    };
    if (M(e) || t(`not an object`), !Zn.includes(e.format)) throw new A(`format_unsupported`, `manifest format ${JSON.stringify(e.format)} is not supported by this SDK`);
    let n = e.format === 1 ? [`model`, `revision`, `coreml`, `sidecar`, `keeps`, `tokens`] : e.format === 2 ? [`model_id`, `family`, `revision`, `min_sdk_version`, `tokens_sha256`, `coreml`, `sidecar`, `keeps`, `tokens`] : [`model_id`, `family`, `revision`, `min_sdk_version`, `tokens_sha256`, `tokens`, `default_context`];
    for (let r of n)(typeof e[r] != `string` || !e[r]) && t(`${r} missing`);
    e.format === 3 && ((!Array.isArray(e.contexts) || !e.contexts.length || e.contexts.some(e => typeof e != `string` || !/^c\d+_l\d+$/.test(e))) && t(`contexts`), e.contexts.includes(e.default_context) || t(`default_context is not one of contexts`), e.version !== void 0 && (typeof e.version != `string` || !rr.test(e.version)) && t(`version is not a model version (x.y.z)`), rr.test(e.min_sdk_version) || t(`min_sdk_version is not x.y.z`)), e.format >= 2 && (sr.test(e.model_id) || t(`model_id is not a model id`), sr.test(e.family) || t(`family is not an id`), cr.test(e.min_sdk_version) || t(`min_sdk_version is not x.y.z`), dr(e.engine_format) || t(`engine_format is not an integer`), dr(e.coreml_format) || t(`coreml_format is not an integer`), lr.test(e.tokens_sha256) || t(`tokens_sha256 is not a SHA-256`)), (!Array.isArray(e.files) || !e.files.length) && t(`files missing`);
    let r = new Set;
    for (let n of e.files) {
        if (!M(n) || !jr(n.path)) throw new A(`manifest_invalid`, `manifest.json: bad path ${JSON.stringify(n&&n.path)}`);
        if ((!dr(n.size) || n.size < 0) && t(`size of ${n.path}`), (typeof n.sha256 != `string` || !lr.test(n.sha256)) && t(`sha256 of ${n.path}`), r.has(n.path) && t(`${n.path} is listed twice`), r.add(n.path), e.format === 3) {
            let e = n.platforms === `*` ? [] : n.platforms;
            n.platforms === `*` || Array.isArray(e) && e.length && e.every(e => $n.includes(e)) || t(`platforms of ${n.path}`);
            for (let e of [`soc`, `context`, `role`])(typeof n[e] != `string` || !n[e]) && t(`${e} of ${n.path}`);
            if ([`required`, `optional`].includes(n.need) || t(`need of ${n.path}`), n.encoding === `gzip`) {
                let e = n.decoded;
                (!M(e) || !jr(e.path) || !dr(e.size) || e.size < 0 || !lr.test(String(e.sha256))) && t(`decoded of ${n.path}`), r.has(`\0` + e.path) && t(`${e.path} is decoded twice`), r.add(`\0` + e.path)
            } else n.encoding === `identity` ? (r.has(`\0` + n.path) && t(`${n.path} is listed twice`), r.add(`\0` + n.path)) : t(`encoding of ${n.path}`)
        }
    }
    return e.signature !== void 0 && typeof e.signature != `string` && t(`signature is not a string`), e
}

async function Nr(e, t = [nr]) {
    let n = {
            valid: !1,
            toleranceSigned: !1,
            rawToleranceSigned: !1,
            text: null
        },
        r = hr(e.signature);
    if (!r || r.length !== 64) return n;
    let i = _r(),
        a = [];
    for (let e of t) try {
        a.push(await i.importKey(`raw`, typeof e == `string` ? pr(e) : gr(e), {
            name: `Ed25519`
        }, !1, [`verify`]))
    } catch (e) {
        if (e && (e.name === `NotSupportedError` || /not supported|unrecognized/i.test(String(e.message)))) throw new A(`signature_unsupported`, `this runtime has no Ed25519 in WebCrypto, so the manifest signature cannot be checked`)
    }
    let o = async e => {
        let t = j(e);
        for (let e of a)
            if (await i.verify({
                    name: `Ed25519`
                }, e, r, t)) return !0;
        return !1
    };
    if (e.format !== 3) {
        let t = yr(e);
        return await o(t) ? {
            valid: !0,
            toleranceSigned: !1,
            rawToleranceSigned: !1,
            text: t
        } : n
    }
    let s = new Set;
    for (let [t, n] of [
            [!0, !0],
            [!0, !1],
            [!1, !0],
            [!1, !1]
        ]) {
        let r = yr(e, {
            tolerance: t,
            raw: n
        });
        if (!s.has(r) && (s.add(r), await o(r))) return {
            valid: !0,
            toleranceSigned: t && Sr(e.golden_tolerance) !== ``,
            rawToleranceSigned: n && M(e.golden_raw_tolerance),
            text: r
        }
    }
    return n
}

async function Pr(e, t = {}) {
    let n = t.expect || {},
        r = (await vr(e)).slice(0, 40);
    if (n.build && !(await vr(e)).startsWith(String(n.build).toLowerCase())) throw new A(`build_mismatch`, `manifest.json is not the build the config named (${n.build})`, `manifest.json`);
    let i;
    try {
        i = JSON.parse(new TextDecoder(`utf-8`, {
            fatal: !0
        }).decode(e))
    } catch (e) {
        throw new A(`manifest_invalid`, `manifest.json is not JSON: ${e.message}`, `manifest.json`)
    }
    Mr(i);
    let a = !1,
        o = !1,
        s = null;
    if (typeof i.signature == `string`) {
        let e = await Nr(i, t.trustedKeys || [`fc02fbd906608ebc206a371d8e61c1062ea555778b44b1ac834061043aee4a33`]);
        if (!e.valid) throw new A(`signature_invalid`, `the manifest signature does not verify with a trusted key`, `manifest.json`);
        ({
            toleranceSigned: a,
            rawToleranceSigned: o,
            text: s
        } = e)
    } else if (t.requireSignature) throw new A(`signature_required`, `the manifest is not signed and a signature is required`, `manifest.json`);
    if (t.requireVersion && i.version === void 0) throw new A(`version_missing`, `the manifest names no model version; this SDK needs a model build made for SDK 3.0.0 or later`, `manifest.json`);
    if (i.format >= 2) {
        let e = t.sdkVersion || `3.1.3`;
        if (!Ar(e, i.min_sdk_version)) throw new A(`sdk_too_old`, `${i.model_id} ${i.revision} needs SDK ${i.min_sdk_version} or newer (this is ${e})`)
    }
    if (n.version && n.version !== i.version) throw new A(`version_mismatch`, `the manifest is model version ${i.version}, the config named ${n.version}`, `manifest.json`);
    return {
        manifest: i,
        build: r,
        toleranceSigned: a,
        rawToleranceSigned: o,
        signedText: s
    }
}

var Fr = class e {
    static async open(t, n = {}) {
        let r = await t.read(`manifest.json`);
        if (!r) throw new A(`manifest_missing`, `no manifest.json in the model folder`, `manifest.json`);
        let {
            manifest: i,
            toleranceSigned: a,
            rawToleranceSigned: o,
            build: s
        } = await Pr(r, n), c = new Map(i.files.map(e => [Ir(e), Lr(e)]));
        for (let e of i.format === 3 ? [`tokens`] : [`tokens`, `sidecar`, `keeps`]) {
            let t = i[e];
            if ((t !== `-` || e === `tokens`) && !c.has(t)) throw new A(`not_listed`, `${e} ${t} is not listed in the manifest`, t)
        }
        if (i.format >= 2) {
            if (!(n.engineFormats || Qn).includes(i.engine_format)) throw new A(`engine_format_unsupported`, `engine format ${i.engine_format} is not supported by this SDK`);
            if (c.get(i.tokens).sha256.toLowerCase() !== i.tokens_sha256.toLowerCase()) throw new A(`manifest_invalid`, `tokens_sha256 does not match ${i.tokens}`, i.tokens)
        }
        let l = new e;
        return l.manifest = i, l._reader = t, l._listed = c, l._verified = new Set, l._cache = new Map, l._keep = !!n.cache, l.goldenTolerance = a ? kr(i.golden_tolerance) : null, l.goldenRawTolerance = o ? Or(i.golden_raw_tolerance) : null, l.build = s, (n.verify || `all`) === `all` && await l.verifyAll(), l
    }
    get modelId() {
        return this.manifest.format === 1 ? this.manifest.model : this.manifest.model_id
    }
    get engineFormat() {
        return this.manifest.format === 1 ? 1 : this.manifest.engine_format
    }
    toleranceFor(e) {
        return this.goldenTolerance && this.goldenTolerance[e] || {
            token_diffs: 0,
            site_flag_diffs: 0,
            word_flag_diffs: 0
        }
    }
    entry(e) {
        return this._listed.get(e) || null
    }
    withRole(e) {
        return this.paths.filter(t => this._listed.get(t).role === e)
    }
    get paths() {
        return [...this._listed.keys()].sort((e, t) => fr(j(e), j(t)))
    }
    has(e) {
        return this._listed.has(e)
    }
    under(e) {
        let t = e.endsWith(`/`) ? e : e + `/`;
        return this.paths.filter(e => e.startsWith(t))
    }
    async read(e) {
        let t = this._listed.get(e);
        if (!t) throw new A(`not_listed`, `${e} is not listed in the manifest`, e);
        if (this._cache.has(e)) return this._cache.get(e);
        let n = await this._reader.read(e);
        if (!n && t.stored) {
            let e = await this._reader.read(t.stored.path);
            if (!e) throw new A(`file_missing`, `${t.stored.path} is listed but missing`, t.stored.path);
            if (e.length !== t.stored.size || await vr(e) !== t.stored.sha256) throw new A(`checksum_mismatch`, `${t.stored.path} does not match its size and SHA-256 in the manifest`, t.stored.path);
            n = await Rr(e)
        }
        if (!n) throw new A(`file_missing`, `${e} is listed but missing`, e);
        if (n.length !== t.size || await vr(n) !== t.sha256.toLowerCase()) throw new A(`checksum_mismatch`, `${e} does not match its size and SHA-256 in the manifest`, e);
        return this._verified.add(e), this._keep && this._cache.set(e, n), n
    }
    async readText(e) {
        return new TextDecoder(`utf-8`, {
            fatal: !0
        }).decode(await this.read(e))
    }
    async verifyAll() {
        for (let e of this.paths) this._verified.has(e) || await this.read(e)
    }
};

function Ir(e) {
    return e.encoding === `gzip` && e.decoded ? e.decoded.path : e.path
}

function Lr(e) {
    return e.encoding === `gzip` && e.decoded ? {
        path: e.decoded.path,
        size: e.decoded.size,
        sha256: String(e.decoded.sha256).toLowerCase(),
        stored: {
            path: e.path,
            size: e.size,
            sha256: String(e.sha256).toLowerCase()
        },
        platforms: e.platforms,
        soc: e.soc,
        context: e.context,
        role: e.role,
        need: e.need
    } : {
        path: e.path,
        size: e.size,
        sha256: String(e.sha256).toLowerCase(),
        stored: null,
        platforms: e.platforms,
        soc: e.soc,
        context: e.context,
        role: e.role,
        need: e.need
    }
}

async function Rr(e) {
    if (typeof globalThis.DecompressionStream != `function`) throw new A(`format_unsupported`, `this runtime has no DecompressionStream for gzip files`);
    let t = new Blob([e]).stream().pipeThrough(new globalThis.DecompressionStream(`gzip`));
    return new Uint8Array(await new Response(t).arrayBuffer())
}

function zr(e) {
    let t = [];
    return e.split(/\r?\n/).filter(e => e.length).forEach((e, n) => {
        let r = /^(.*\S)\s+(\d+)$/.exec(e);
        r ? t[Number(r[2])] = r[1] : t[n] = e.trim()
    }), t
}

async function Br(e, t = {}) {
    let n = await Fr.open(e, {
            ...t,
            engineFormats: [3],
            requireVersion: !0
        }),
        r = n.manifest;
    if (r.format !== 3 || r.engine_format !== 3) throw new A(`format_unsupported`, `a TajweedFormer folder needs manifest format 3 (engine_format 3)`);
    let i = zr(await n.readText(r.tokens));
    if (i.length !== 38 || i.some(e => e === void 0)) throw new A(`tokens_invalid`, `${r.tokens} has ${i.length} entries, a TajweedFormer has 38`, r.tokens);
    return {
        folder: n,
        tokens: i,
        contexts: [...r.contexts],
        version: r.version,
        build: n.build
    }
}

function Vr(e, t) {
    let n = rr.exec(String(e)),
        r = rr.exec(String(t));
    if (!n || !r || typeof e != `string` || typeof t != `string`) return null;
    for (let e = 1; e <= 3; e++) {
        let t = Number(n[e]),
            i = Number(r[e]);
        if (t !== i) return t < i ? -1 : 1
    }
    return 0
}

var Hr = /^\d+(\.\d+)*$/;

var Ur = !1;

function Wr(e, t) {
    if (typeof e != `string` || typeof t != `string` || !Hr.test(e) || !Hr.test(t)) return null;
    let n = e.split(`.`).map(Number),
        r = t.split(`.`).map(Number);
    for (let e = 0; e < Math.max(n.length, r.length); e++) {
        let t = (n[e] || 0) - (r[e] || 0);
        if (t) return t < 0 ? -1 : 1
    }
    return 0
}

function Gr(e) {
    let t = e && typeof e == `object` ? e.sdk_latest : null;
    if (!t || typeof t != `object` || Array.isArray(t) || typeof t.version != `string` || !Hr.test(t.version) || typeof t.severity != `string` || !t.severity.length || typeof t.url != `string`) return null;
    try {
        if (new URL(t.url).protocol !== `https:`) return null
    } catch {
        return null
    }
    return {
        version: t.version,
        severity: t.severity,
        url: t.url
    }
}

function Kr(e) {
    if (e === !0 || e === !1) return e;
    try {
        return !1
    } catch {
        return !1
    }
}

function qr(e, t, {
    debug: n,
    warn: r = e => console.warn(e)
} = {}) {
    try {
        if (Ur) return !1;
        let i = Gr(e);
        return !i || Wr(t, i.version) !== -1 || !Kr(n) ? !1 : (Ur = !0, r(`Quran Lab SDK ${i.version} is available (${i.severity}), you have ${t}: ${i.url}`), !0)
    } catch {
        return !1
    }
}

var Jr = JSON.parse(`{
  "format": "quranlab.sdk-errors/1",
  "sdk": "3.0.0",
  "docs_base": "https://sdk.quranlab.ai/docs/errors#",
  "note": "One catalogue for the four SDKs (NAMING.md section 7). Every SDK embeds this file and a test fails when its copy differs. \`message\` may contain {placeholders} the SDK fills; \`fix\` is one sentence a developer can act on; the docs link is docs_base + code. \`server_rejected\` has \`reasons\`: when the server's 403 carries one of those codes, the error's message and fix are that reason's (the code stays \`server_rejected\`).",
  "errors": [
    {"code": "invalid_argument", "message": "Invalid argument: {detail}.", "fix": "Pass a value the API accepts: a context or head name the model lists, a sample rate the SDK can resample, a surah from 1 to 114 with ayahs inside it, a rule name of lower-case letters, digits and underscores."},
    {"code": "invalid_key", "message": "Quran Lab does not accept this key.", "fix": "Copy the key for this app and platform again from sdk.quranlab.ai; a revoked key has to be replaced by a new one there."},
    {"code": "sdk_too_old", "message": "This key needs SDK {version} or later; this is {sdk}.", "fix": "Upgrade the TajweedFormer SDK to {version} or later (the min_sdk of the server's answer), with the install line of the README."},
    {"code": "server_rejected", "message": "Quran Lab refused this app: {detail}.", "fix": "Check in sdk.quranlab.ai that the key belongs to this app id and platform and that the app is not blocked.", "reasons": {
      "developer_not_approved": {"message": "The account behind this key has no access to Quran Lab yet (developer_not_approved).", "fix": "Open https://sdk.quranlab.ai/start with the account that owns the key and finish the access request; the key works as soon as access is given."},
      "not_a_member": {"message": "The account that made this key is not a member of the workspace that owns the app (not_a_member).", "fix": "Ask an owner of that workspace on sdk.quranlab.ai to add the account, or make a new key from an account that is a member."},
      "key_type_mismatch": {"message": "This key is of the wrong type for this platform (key_type_mismatch).", "fix": "Use an apps key on Android and iOS, a desktop key on macOS, Windows and Linux, and a web key in a browser page; sdk.quranlab.ai makes each of them under the same app."},
      "origin_not_allowed": {"message": "This page's origin, {origin}, is not on the key (origin_not_allowed).", "fix": "Add this page's origin (scheme, host and port, for example https://app.example.org) to the key on its page at https://sdk.quranlab.ai/keys."},
      "app_not_allowed": {"message": "This key belongs to another app (app_not_allowed).", "fix": "A key works for the first app that used it. Make a key for this app at https://sdk.quranlab.ai/keys, or allow this app's identifier on the key's page."},
      "app_blocked": {"message": "Quran Lab does not serve this app at the moment: it is blocked by Quran Lab or paused by its developer (app_blocked).", "fix": "Open the app's page on sdk.quranlab.ai: unpause the app there, or read the reason for the block and write to Quran Lab from the account that owns the app."},
      "environment_mismatch": {"message": "This key's environment (development or production) does not match this app (environment_mismatch).", "fix": "Use the development key in the builds you run yourself and the production key in the build you publish; both are on the app's page on sdk.quranlab.ai."},
      "local_needs_development_key": {"message": "This page runs on {origin}, and a production key does not work on a local address (local_needs_development_key).", "fix": "Use this app's development key for local work, with http://localhost:* among its origins (https://sdk.quranlab.ai/keys); keep the production key for the deployed site."},
      "model_attestation_required": {"message": "Quran Lab could not confirm that this is the app as its store delivers it, running on a real device, and does not send it the model (model_attestation_required).", "fix": "Run the app as the store or TestFlight installs it, on a real device: a simulator, an emulator and a changed app or device cannot be confirmed. While you develop, use this app's development key, which is not asked for this."},
      "model_not_allowed": {"message": "Quran Lab does not send model files to this platform at the moment (model_not_allowed).", "fix": "Nothing in the app is wrong. See sdk.quranlab.ai for the state of this platform, or write to Quran Lab from the account that owns the app."}
    }},
    {"code": "client_exists", "message": "This process already has a TajweedClient.", "fix": "Keep the first client and reuse it, or close it before making another."},
    {"code": "model_unavailable", "message": "Quran Lab has no model build for SDK {sdk} yet.", "fix": "Nothing to change in the app: call model() again later, and check client.diagnose() and sdk.quranlab.ai for the model builds of this SDK version."},
    {"code": "needs_connection", "message": "The model is not on this device yet.", "fix": "Connect once so the model can be downloaded; call prefetch() at app start so later starts work offline."},
    {"code": "network_not_permitted", "message": "This app is not allowed to use the network.", "fix": "Android: keep the INTERNET permission that the SDK's manifest declares (take out a tools:node=\\"remove\\" for android.permission.INTERNET). A sandboxed Mac app: turn on Outgoing Connections (Client) under App Sandbox."},
    {"code": "download_failed", "message": "The model download stopped: {detail}.", "fix": "Call model() or prefetch() again when the network is back; the download resumes where it stopped."},
    {"code": "storage_full", "message": "Not enough free space for the model: {needed} bytes needed, {available} free.", "fix": "Free that much space on the device, or call removeModels() to drop model versions that are no longer used."},
    {"code": "storage_failed", "message": "The SDK's folder cannot be read or written: {detail}.", "fix": "Give the client a storage folder the app can write to, and make sure only one process uses it."},
    {"code": "model_missing", "message": "No model here: {detail}.", "fix": "Let client.model() download the model: a model comes from Quran Lab's server through the Client, and a model folder that the Client did not download itself is not opened."},
    {"code": "model_invalid", "message": "The model folder is damaged: {detail}.", "fix": "Call removeModels() and then model() to download the model again."},
    {"code": "signature_invalid", "message": "The model's manifest is not signed by Quran Lab.", "fix": "Use only model files from cdn.quranlab.ai; call removeModels() and then model() to download them again."},
    {"code": "checksum_mismatch", "message": "A model file differs from the manifest: {file}.", "fix": "Call removeModels() and then model() to download the model again; if it repeats, the storage is failing."},
    {"code": "model_incompatible", "message": "This model build does not run on this SDK: {detail}.", "fix": "Upgrade the SDK to the version the message names, or let client.model() pick the build for this SDK instead of opening a folder."},
    {"code": "runtime_unsupported", "message": "The SDK cannot run here: {detail}.", "fix": "Run the app where the SDK is supported: {minimum}."},
    {"code": "reference_missing", "message": "The reference data is not on this device.", "fix": "Call model.reference.fetch() once, with a connection, before asking for units."},
    {"code": "session_open", "message": "This model already has an open session.", "fix": "Finish or cancel the open session before starting the next take."},
    {"code": "session_closed", "message": "The session has ended.", "fix": "Start a new session with model.listen() or model.session() for the next take."},
    {"code": "cancelled", "message": "The take was cancelled.", "fix": "Nothing to fix: cancel() was called, or the app's task was cancelled; start a new session for the next take."},
    {"code": "engine_failed", "message": "The engine failed: {detail}.", "fix": "Call client.diagnose() and send the report to Quran Lab; a new session on the same model can be tried."},
    {"code": "microphone_denied", "message": "The microphone permission was refused.", "fix": "Explain why the app listens and send the learner to the system settings; listen() asks again only where the platform allows it."},
    {"code": "microphone_unavailable", "message": "No microphone can be opened: {detail}.", "fix": "Check that the device has an input and no other app holds it, then call listen() again."},
    {"code": "interrupted", "message": "The take ended on an interruption: {detail}.", "fix": "Start a new session when the app has the audio again; what was heard so far is in the last chunk."},
    {"code": "sharing_unavailable", "message": "Sharing is not available for this app.", "fix": "Nothing to call: Quran Lab switches sharing on per app; check client.sharing.isAvailable before showing sharing settings."}
  ]
}
`);

var Yr = new Map(Jr.errors.map(e => [e.code, e]));

Object.freeze(Jr.errors.map(e => e.code));

var Xr = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] === void 0 || t[n] === null ? `` : String(t[n]));

var Zr = e => e.replace(/: \.$/, `.`).replace(/\s+\./g, `.`);

var N = class extends Error {
        constructor(e, t = {}, n = {}) {
            let r = Yr.get(e);
            if (!r) throw RangeError(`TajweedError: ${e} is not a catalogue code`);
            super(Zr(Xr(r.message, t)), n.cause === void 0 ? void 0 : {
                cause: n.cause
            }), this.name = `TajweedError`, this.code = e, this.fix = Zr(Xr(r.fix, t)), this.docs = Jr.docs_base + e
        }
    };

var Qr = `a browser with WebAssembly SIMD, AudioWorklet and Ed25519 in WebCrypto (Chrome 137, Firefox 129, Safari 17, or later), or Node 20 or later`;

var $r = Yr.get(`server_rejected`).reasons || {};

Object.freeze(Object.keys($r));

function ei(e, t = {}, n = {}) {
    let r = new N(`server_rejected`, {
            detail: e,
            ...t
        }, n),
        i = Object.prototype.hasOwnProperty.call($r, e) ? $r[e] : null;
    return i && (r.message = Zr(Xr(i.message, t)), r.fix = Zr(Xr(i.fix, t))), r
}

var ti = Object.freeze([`key_revoked`, `key_unknown`, `app_not_allowed`, `origin_not_allowed`, `key_type_mismatch`, `app_blocked`, `developer_not_approved`]);

var ni = Object.freeze([`key_revoked`, `key_unknown`]);

var ri = e => typeof e == `string` && ti.includes(e) ? e : null;

var ii = `Quran Lab's daily limit for model downloads is reached; try again later`;

var P = e => new N(`invalid_argument`, {
        detail: e
    });

var ai = {
        manifest_missing: `model_missing`,
        file_missing: `model_missing`,
        manifest_invalid: `model_invalid`,
        not_listed: `model_invalid`,
        tokens_invalid: `model_invalid`,
        signature_invalid: `signature_invalid`,
        signature_required: `signature_invalid`,
        checksum_mismatch: `checksum_mismatch`,
        sdk_too_old: `model_incompatible`,
        format_unsupported: `model_incompatible`,
        engine_format_unsupported: `model_incompatible`,
        signature_unsupported: `runtime_unsupported`,
        version_missing: `model_incompatible`,
        version_mismatch: `model_invalid`,
        build_mismatch: `checksum_mismatch`
    };

var oi = /\b(\d+\.\d+\.\d+)\b/;

function F(e, {
    fallback: t = `engine_failed`,
    sdk: n = ``,
    origin: r = ``
} = {}) {
    if (e instanceof N) return e;
    let i = e && e.name,
        a = e && e.code,
        o = e && e.message || String(e),
        s = (t, n = {}) => new N(t, {
            detail: o,
            ...n
        }, {
            cause: e
        });
    if (i === `ModelFolderError` && a === `signature_unsupported`) return s(`runtime_unsupported`, {
        detail: `this runtime has no Ed25519 in WebCrypto`,
        minimum: Qr
    });
    if (i === `ModelFolderError` && ai[a]) return s(ai[a], {
        file: e.file || o
    });
    if (i === `DeliveryError`) {
        if (a === `checksum_mismatch`) return s(`checksum_mismatch`, {
            file: e.path || o
        });
        if (a === `aborted`) return s(`cancelled`);
        if (a === `http` && (e.status === 401 || e.status === 403)) {
            if (ni.includes(e.reason)) return s(`invalid_key`);
            let t = [e.reason, e.error].find(e => typeof e == `string` && Object.prototype.hasOwnProperty.call($r, e));
            return t ? ei(t, {
                origin: r
            }, {
                cause: e
            }) : e.status === 401 && e.error === `invalid_token` ? s(`download_failed`) : e.status === 401 ? s(`invalid_key`) : ei(e.error || e.reason || `http_403`, {
                origin: r
            }, {
                cause: e
            })
        }
        return a === `http` && e.status === 429 && e.error === `model_limit` ? s(`download_failed`, {
            detail: ii
        }) : a === `offline` && e.nothingCached ? s(`needs_connection`) : s(`download_failed`)
    }
    return i === `PlatformError` ? ni.includes(e.reason) ? s(`invalid_key`) : typeof e.reason == `string` && Object.prototype.hasOwnProperty.call($r, e.reason) ? ei(e.reason, {
        origin: e.origin || r
    }, {
        cause: e
    }) : a === `invalid_key` || a === `unauthorized` ? s(`invalid_key`) : a === `sdk_too_old` ? s(`sdk_too_old`, {
        version: e.minSdk || (oi.exec(o) || [])[1] || `the newest release`,
        sdk: n
    }) : a === `model_unavailable` ? s(`model_unavailable`, {
        sdk: n
    }) : e.status === 403 || $r[a] ? ei(a, {
        origin: e.origin || r
    }, {
        cause: e
    }) : e.status === 0 || a === `offline` ? s(`needs_connection`) : s(`download_failed`) : i === `QuotaExceededError` ? s(`storage_full`, {
        needed: `more`,
        available: `too few`
    }) : i === `AbortError` ? s(`cancelled`) : i === `NotAllowedError` || i === `SecurityError` ? s(`microphone_denied`) : i === `NotFoundError` || i === `NotReadableError` || i === `OverconstrainedError` ? s(`microphone_unavailable`) : e instanceof TypeError || e instanceof RangeError ? s(`invalid_argument`) : s(t)
}

var I = `3.1.3`;

var si = /^(https:\/\/[A-Za-z0-9.-]+(:\d+)?|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)(\/[A-Za-z0-9._~\/-]*)?$/;

var ci = /^https:\/\/((weur|eeur|enam|wnam|apac|oc)\.)?cdn\.quranlab\.ai$/;

var li = [`engine_failed`, `model_load`, `checksum_mismatch`, `signature_invalid`, `update_failed`, `fallback`, `self_test_failed`, `audio_input`, `other`];

var ui = new Set([`invalid_key`, `unauthorized`, `developer_not_approved`, `not_a_member`, `key_type_mismatch`, `origin_not_allowed`, `app_not_allowed`, `app_blocked`, `environment_mismatch`, `sdk_too_old`]);

var di = `model.refused`;

var fi = Object.freeze({
        not_listed: {
            status: 403,
            code: `origin_not_allowed`,
            reason: `origin_not_allowed`
        },
        local_needs_development_key: {
            status: 403,
            code: `local_needs_development_key`
        },
        key_unknown: {
            status: 401,
            code: `invalid_key`,
            reason: `key_unknown`
        },
        key_revoked: {
            status: 401,
            code: `invalid_key`,
            reason: `key_revoked`
        },
        key_not_approved: {
            status: 403,
            code: `developer_not_approved`,
            reason: `developer_not_approved`
        },
        not_a_web_key: {
            status: 403,
            code: `key_type_mismatch`,
            reason: `key_type_mismatch`
        }
    });

var pi = 6e4;

var L = class extends Error {
        constructor(e, t, n) {
            super(`${e} ${t}${n?`: `+n:``}`), this.name = `PlatformError`, this.status = e, this.code = t
        }
    };

var mi = () => globalThis.crypto.subtle;

var hi = e => {
        let t = e.replace(/-/g, `+`).replace(/_/g, `/`),
            n = atob(t + `=`.repeat((4 - t.length % 4) % 4));
        return Uint8Array.from(n, e => e.charCodeAt(0))
    };

async function gi(e) {
    let t = typeof e == `string` ? pr(e) : e;
    return mr(new Uint8Array(await mi().digest(`SHA-256`, t)).subarray(0, 8))
}

async function _i(e, t, n, r, i = Date.now()) {
    if (!t || !t.startsWith(`ed25519=`) || !n) throw new L(0, `signature_invalid`, `no signature`);
    let a;
    try {
        a = hi(t.slice(8))
    } catch {
        throw new L(0, `signature_invalid`, `bad signature encoding`)
    }
    let o = !1;
    for (let t of r) {
        if (await gi(t) !== n) continue;
        let r = await mi().importKey(`raw`, typeof t == `string` ? pr(t) : t, {
            name: `Ed25519`
        }, !1, [`verify`]);
        if (await mi().verify({
                name: `Ed25519`
            }, r, a, e)) {
            o = !0;
            break
        }
    }
    if (!o) throw new L(0, `signature_invalid`, `the config does not verify with a pinned key (kid ${n})`);
    let s = JSON.parse(new TextDecoder().decode(e));
    if (s.v !== 1) throw new L(0, `signature_invalid`, `config v ${s.v}`);
    if (!(typeof s.expires_at == `number` && s.expires_at * 1e3 > i)) throw new L(0, `config_expired`, `the config has expired`);
    return s
}

var vi = class e {
        constructor(e) {
            if (!e || typeof e.key != `string` || !/^qlk_v1_/.test(e.key)) throw TypeError(`QuranLab: a developer key qlk_v1_... is needed`);
            let t = globalThis.window !== void 0 && !!globalThis.location;
            if (this.key = e.key, this.apiUrl = (e.apiUrl || `https://api.quranlab.ai`).replace(/\/$/, ``), this.cdnUrl = (e.cdnUrl || `https://cdn.quranlab.ai`).replace(/\/$/, ``), this.modelsUrl = e.modelsUrl ? e.modelsUrl.replace(/\/+$/, ``) : null, this.legacyCdn = !!e.cdnUrl && !e.modelsUrl, this.platform = e.platform || `web`, this.bundleId = e.bundleId || (t ? globalThis.location.origin : null), !this.bundleId) throw TypeError(`QuranLab: bundleId is needed outside a browser (the origin for a web key, the app id for a desktop key)`);
            this.origin = e.origin || null, this.appVersion = e.appVersion || `0`, this.appName = e.appName || null, this.fetch = e.fetch || globalThis.fetch.bind(globalThis), this.clock = e.clock || Date.now, this.state = e.state || Yn(), this.trustedKeys = e.trustedKeys || [`fc02fbd906608ebc206a371d8e61c1062ea555778b44b1ac834061043aee4a33`], this.analyticsOn = e.analytics !== `off`, this.issuesOn = e.issues !== !1, this.contributions = !!e.contributions, this.audience = e.audience || `general`, this.sharingBitrate = e.sharingBitrate || null, this.autoSend = e.autoSend !== !1, this.debug = typeof e.debug == `boolean` ? e.debug : void 0, this.lifecycle = e.lifecycle || {
                document: globalThis.document,
                window: globalThis.window === void 0 ? null : globalThis.window
            }, this._lastSend = null, this._hidden = !1, this.stopped = null, this.refusedError = null, this.modelRefusal = null, this._cdnRecheck = !1;
            let n = null;
            try {
                n = this.state.get(di)
            } catch {
                n = null
            }
            if (n && typeof n.code == `string` && ri(n.reason)) {
                let e = new L(n.status === 401 ? 401 : 403, n.code, `the answer of an earlier launch`);
                e.reason = n.reason, e.from = n.from === `cdn` ? `cdn` : `api`, typeof n.origin == `string` && (e.origin = n.origin), this.modelRefusal = e
            }
            this.config = null, this._token = null, this._timer = null, this.telemetry = new Un({
                state: this.state,
                product: Hn(this.platform),
                platform: this.platform,
                sdkVersion: I,
                appVersion: this.appVersion,
                device: Wn(),
                clock: this.clock,
                enabled: this.analyticsOn
            });
            let r = this.state.get(`config`);
            r && r.cfg && r.cfg.expires_at * 1e3 > this.clock() && (this.config = r.cfg), this.state.get(`bucket`) === null && this.state.set(`bucket`, Math.floor(Math.random() * 100))
        }
        static async configure(t) {
            let n = new e(t);
            return await n.launch(), n
        }
        get flags() {
            return this.config && this.config.flags || {
                analytics: !0,
                issues: !0,
                contributions: !1
            }
        }
        _refusal(e, t = `api`) {
            if (e && ri(e.reason)) {
                e.from = t, this.modelRefusal = e, this._cdnRecheck = !1;
                try {
                    this.state.set(di, {
                        status: e.status,
                        code: e.code,
                        reason: e.reason,
                        origin: e.origin || null,
                        from: t
                    })
                } catch {}
                if (typeof this.onModelStop == `function`) try {
                    this.onModelStop(e)
                } catch {}
            }
        }
        syncRefusal() {
            if (this.modelRefusal) return;
            let e = null;
            try {
                e = this.state.get(di)
            } catch {
                e = null
            }
            if (!e || typeof e.code != `string` || !ri(e.reason)) return;
            let t = new L(e.status === 401 ? 401 : 403, e.code, `the answer to another page`);
            t.reason = e.reason, t.from = e.from === `cdn` ? `cdn` : `api`, typeof e.origin == `string` && (t.origin = e.origin), this.modelRefusal = t
        }
        _clearRefusal() {
            this.modelRefusal = null, this._cdnRecheck = !1;
            try {
                this.state.set(di, null)
            } catch {}
        }
        _accepted() {
            if (this.modelRefusal) {
                if (this.modelRefusal.from === `cdn`) {
                    this._cdnRecheck = !0;
                    return
                }
                this._clearRefusal()
            }
        }
        get modelStopped() {
            return !!this.modelRefusal && !(this.modelRefusal.from === `cdn` && this._cdnRecheck)
        }
        noteModelRefusal({
            status: e,
            error: t,
            reason: n
        }) {
            let r = new L(e, t || `http_` + e, `a model request`);
            n && (r.reason = n), this._refusal(r, `cdn`)
        }
        noteModelServed() {
            this.modelRefusal && this.modelRefusal.from === `cdn` && this._clearRefusal()
        }
        async modelHeaders() {
            let e;
            try {
                e = await this.token()
            } catch (e) {
                throw this.stopped && this.stoppedError || e
            }
            let t = {
                authorization: `Bearer ${e}`,
                "x-qlab-key": this.key
            };
            return this.origin && (t.origin = this.origin), t
        }
        async renewToken() {
            return this._token = null, this.state.set(`token`, null), this.token()
        }
        async _call(e, t, {
            body: n = null,
            auth: r = `token`,
            headers: i = {},
            raw: a = !1,
            keepalive: o = !1
        } = {}) {
            if (this.stopped) throw new L(0, this.stopped, `stopped for this launch`);
            let s = {
                ...i
            };
            this.origin && (s.origin = this.origin), r === `key` ? s[`x-qlab-key`] = this.key : r === `token` && (s.authorization = `Bearer ${await this.token()}`), n !== null && (s[`content-type`] = `application/json`);
            let c = {
                method: e,
                headers: s,
                body: n === null ? void 0 : typeof n == `string` ? n : JSON.stringify(n),
                redirect: `error`
            };
            o && (c.keepalive = !0);
            let l;
            try {
                l = await this.fetch(this.apiUrl + t, c)
            } catch (e) {
                throw await this.originCheck() || e
            }
            if (l.status < 400 && r !== `none` && (this.keyAccepted = !0, this.refusedError = null), l.status < 400 && !a && (t === `/v1/register` || t === `/v1/attest`) && this._accepted(), a) return l;
            if (l.status >= 400) {
                let a = {};
                try {
                    a = await l.json()
                } catch {}
                let s = new L(l.status, a.error || `http_` + l.status, a.message || ``);
                typeof a.min_sdk == `string` && (s.minSdk = a.min_sdk), typeof a.reason == `string` && (s.reason = a.reason);
                let c = ri(s.reason);
                if ((l.status === 401 || l.status === 403) && (s.code !== `invalid_token` || c) && (this.refusedError = s), (ui.has(s.code) || c) && (this.stopped = s.code, this.stoppedError = s), this._refusal(s), s.code === `invalid_token` && !c && r === `token` && !i[`x-retried`]) return this._token = null, this.state.set(`token`, null), this._call(e, t, {
                    body: n,
                    auth: r,
                    headers: {
                        ...i,
                        "x-retried": `1`
                    },
                    keepalive: o
                }).catch(e => {
                    throw e
                });
                throw s
            }
            return l.status === 204 || l.status === 304 ? null : l.json()
        }
        async token() {
            let e = this.clock() / 1e3,
                t = this._token || this.state.get(`token`);
            if (t && t.exp - e > 3600) return this._token = t, t.token;
            let n = await this._call(`POST`, `/v1/attest`, {
                auth: `key`,
                body: {
                    platform: this.platform,
                    bundle_id: this.bundleId
                }
            });
            return this._token = {
                token: n.token,
                exp: e + (n.expires_in || 86400),
                attested: !!n.attested
            }, this.state.set(`token`, this._token), n.token
        }
        async originCheck() {
            if (this.platform !== `web`) return null;
            if (this._originAsked) return this._originError;
            this._originAsked = !0, this._originError = null;
            try {
                let e = await this.fetch(`${this.apiUrl}/v1/origin-check?key=${encodeURIComponent(this.key)}`, {
                    redirect: `error`
                });
                if (e.status !== 200) return null;
                let t = await e.json();
                if (!t || t.allowed !== !1) return null;
                let n = typeof t.why == `string` ? t.why : `refused`,
                    r = fi[n],
                    i = r ? new L(r.status, r.code, `the origin check: ${n}`) : new L(403, n, `the origin check`);
                r && r.reason && (i.reason = r.reason), typeof t.origin == `string` && (i.origin = t.origin), ui.has(i.code) && (this.stopped = i.code, this.stoppedError = i), this._refusal(i), this._originError = i
            } catch {}
            return this._originError
        }
        async launch() {
            this.telemetry.count(`launches`), this.telemetry.launched();
            let e = [() => this.register(), () => this.refreshConfig(), () => this.sendTelemetry(`launch`)];
            for (let t of e) try {
                await t()
            } catch (e) {
                if (this.lastError = e, this.stopped) break
            }
            this.autoSend && this._startSchedule()
        }
        async register() {
            let e = Pn(this.clock());
            return this.state.get(`register.day`) === e ? null : (this._registering ||= this._register(e).finally(() => {
                this._registering = null
            }), this._registering)
        }
        async _register(e) {
            let t = this.state.get(`installed`) === null;
            t && this.state.set(`installed`, !0);
            let n = this.state.get(`register.pending_new`) === !0,
                r = t || n;
            this.state.set(`register.pending_new`, r);
            let i = {
                platform: this.platform,
                bundle_id: this.bundleId,
                app_version: this.appVersion,
                sdk_version: I,
                new_install: r
            };
            this.appName && (i.app_name = this.appName), this.modelRevision && (i.model_revision = this.modelRevision);
            let a = await this._call(`POST`, `/v1/register`, {
                body: i
            });
            return this.state.set(`register.pending_new`, null), this.state.set(`register.day`, e), a
        }
        foreground() {
            this._hidden = !1, this.telemetry.count(`launches`), this._sharingLife(`foreground`), this.stopped || this.register().catch(e => {
                this.lastError = e
            })
        }
        background() {
            return this._hidden = !0, this._sharingLife(`background`), this.sendTelemetry(`background`, {
                keepalive: !0
            })
        }
        _sharingLife(e) {
            try {
                let t = this.sharing && this.sharing[e];
                typeof t == `function` && Promise.resolve(t.call(this.sharing)).catch(() => {})
            } catch {}
        }
        async sendTelemetry(e = `manual`, {
            keepalive: t = !1
        } = {}) {
            return this._lastSend = this.clock(), this.telemetry.enabled && this.flags.analytics !== !1 && this.telemetry.seal(), this.flush({
                keepalive: t
            })
        }
        _tick() {
            let e = this.lifecycle.document;
            return e && e.visibilityState === `hidden` || this.stopped || this._lastSend !== null && this.clock() - this._lastSend < 9e5 ? !1 : (this.sendTelemetry(`interval`).catch(() => {}), !0)
        }
        _startSchedule() {
            if (this._schedule) return;
            let e = this.lifecycle.document,
                t = this.lifecycle.window,
                n = () => {
                    e.visibilityState === `hidden` ? this.background().catch(() => {}) : this._hidden && this.foreground()
                },
                r = () => {
                    this._hidden || this.background().catch(() => {})
                };
            e && typeof e.addEventListener == `function` && e.addEventListener(`visibilitychange`, n), t && typeof t.addEventListener == `function` && t.addEventListener(`pagehide`, r);
            let i = setInterval(() => this._tick(), pi);
            i && typeof i.unref == `function` && i.unref(), this._schedule = {
                timer: i,
                onVisibility: n,
                onPageHide: r
            }
        }
        stopSchedule() {
            let e = this._schedule;
            if (!e) return;
            clearInterval(e.timer);
            let t = this.lifecycle.document,
                n = this.lifecycle.window;
            t && typeof t.removeEventListener == `function` && t.removeEventListener(`visibilitychange`, e.onVisibility), n && typeof n.removeEventListener == `function` && n.removeEventListener(`pagehide`, e.onPageHide), this._schedule = null
        }
        async refreshConfig() {
            let e = this.state.get(`config`),
                t = e && e.cfg && e.cfg.expires_at * 1e3 - this.clock() < 36e5,
                n = new URLSearchParams({
                    bucket: String(this.state.get(`bucket`)),
                    sdk: I
                }),
                r = this.modelVersionPin || null;
            r && n.set(`model_version`, r);
            let i = e && (e.pin || null) === r,
                a = {};
            e && e.etag && !t && i && (a[`if-none-match`] = e.etag);
            let o = await this._call(`GET`, `/v1/config?${n}`, {
                headers: a,
                raw: !0
            });
            if (this.configCheckedAt = this.clock(), o.status === 304 && e) return this.config = e.cfg, this.configFresh = !0, this._accepted(), this._noticeSdkLatest(), this.config;
            if (o.status >= 400) {
                let e = {};
                try {
                    e = await o.json()
                } catch {}
                let t = new L(o.status, e.error || `http_` + o.status, e.message);
                typeof e.min_sdk == `string` && (t.minSdk = e.min_sdk), typeof e.reason == `string` && (t.reason = e.reason);
                let n = ri(t.reason);
                throw (o.status === 401 || o.status === 403) && (t.code !== `invalid_token` || n) && (this.refusedError = t), (ui.has(t.code) || n) && (this.stopped = t.code, this.stoppedError = t), this._refusal(t), t
            }
            let s = new Uint8Array(await o.arrayBuffer()),
                c;
            try {
                c = await _i(s, o.headers.get(`x-qlab-signature`), o.headers.get(`x-qlab-key-id`), this.trustedKeys, this.clock())
            } catch (e) {
                throw this.reportIssue(`signature_invalid`, `config:` + e.code), e
            }
            return this.config = c, this.configFresh = !0, this._accepted(), this.state.set(`config`, {
                cfg: c,
                pin: r,
                etag: o.headers.get(`etag`),
                sig: o.headers.get(`x-qlab-signature`),
                kid: o.headers.get(`x-qlab-key-id`)
            }), c.flags && c.flags.analytics === !1 && this.telemetry.clear(), this.telemetry.enabled = this.analyticsOn && !(c.flags && c.flags.analytics === !1), this._noticeSdkLatest(), c
        }
        _noticeSdkLatest() {
            qr(this.config, I, {
                debug: this.debug
            })
        }
        startRefresh(e = 6e4) {
            this.stopRefresh(), this._timer = setInterval(() => {
                this.refreshConfig().catch(() => {})
            }, e), this._timer && typeof this._timer.unref == `function` && this._timer.unref()
        }
        stopRefresh() {
            this._timer && clearInterval(this._timer), this._timer = null
        }
        async modelSource() {
            let e = this.modelVersionPin || null,
                t = this.state.get(`config`),
                n = this.config && (!t || (t.pin || null) === e) ? this.config : await this.refreshConfig().catch(e => (this.lastError = e, null)),
                r = n && n.recommended;
            if (!n) throw this.stoppedError ? this.stoppedError : this.lastError instanceof L && this.lastError.status ? this.lastError : new L(0, `offline`, `no signed config could be fetched`);
            if (!r || !r.revision) throw new L(0, `model_unavailable`, `the config offers no model build to this SDK`);
            let i = e => e.split(`/`).map(encodeURIComponent).join(`/`);
            this.modelRevision = typeof r.version == `string` ? r.version : null, this.modelBuild = String(r.revision);
            let a = typeof n.base == `string` && si.test(n.base) ? n.base.replace(/\/+$/, ``) : null,
                o = this.modelsUrl || a || (this.legacyCdn ? this.cdnUrl + `/hf` : `https://cdn.quranlab.ai/models`);
            ci.test(o) && (o += `/hf`);
            let s = n.pin && typeof n.pin == `object` && typeof n.pin.version == `string` ? {
                version: n.pin.version,
                status: String(n.pin.status || ``)
            } : null;
            return {
                url: `${o}/${i(r.model)}/${i(r.revision)}/${i(r.folder||`sdk/`+r.model_id)}/`,
                version: this.modelRevision,
                build: this.modelBuild,
                modelId: r.model_id || null,
                pin: s
            }
        }
        modelOpened(e, {
            loadMs: t = 0,
            delivery: n = null
        } = {}) {
            this.modelRevision = e.revision, this.modelBuild = e.build, this.telemetry.modelLoaded(e, t), n && n.bytesDownloaded > 0 && this.telemetry.download({
                revision: e.revision,
                build: e.build,
                profile: `web-cpu`,
                bytes: n.bytesDownloaded,
                success: !0,
                resumed: n.rangesResumed > 0
            })
        }
        wireSharing() {
            return Promise.resolve(this.sharing)
        }
        takeStarted({
            sampleRate: e
        }) {
            let t = {
                pushAudio() {
                    return 0
                },
                finish() {
                    return 0
                },
                free() {}
            };
            try {
                this.sharing && typeof this.sharing.streamStarted == `function` && this.sharing.streamStarted({
                    sampleRate: e
                }, t)
            } catch {}
            return t
        }
        takeFinished() {
            try {
                this.sharing && typeof this.sharing.sessionCompleted == `function` && this.sharing.sessionCompleted({
                    feedback: !0
                }).catch(() => {})
            } catch {}
        }
        async flush({
            keepalive: e = !1
        } = {}) {
            let t = 0;
            if (this.stopped) return 0;
            if (this.telemetry.enabled && this.flags.analytics !== !1)
                for (let n of this.telemetry.due()) try {
                    await this._call(`POST`, `/v1/events`, {
                        body: n.body,
                        keepalive: e
                    }), this.telemetry.dropReport(n.report_id), t++
                } catch (e) {
                    if (e.status === 400 || e.status === 413) this.telemetry.dropReport(n.report_id), e.status === 400 && this.reportIssue(`other`, `telemetry:${e.code||`bad_request`}`);
                    else {
                        this.telemetry.deferReport(n.report_id);
                        break
                    }
                } else this.flags.analytics === !1 && this.telemetry.clear();
            let n = this.state.get(`issues.queue`) || [],
                r = [];
            for (let e of n) {
                if (!this.issuesOn || this.flags.issues === !1) break;
                try {
                    await this._call(`POST`, `/v1/issues`, {
                        body: e
                    })
                } catch (t) {
                    t.status !== 400 && r.push(e)
                }
            }
            return this.state.set(`issues.queue`, this.flags.issues === !1 ? [] : r), t
        }
        reportIssue(e, t, n = []) {
            if (!this.issuesOn) return !1;
            let r = li.includes(e) ? e : `other`,
                i = String(t).replace(/[^A-Za-z0-9_.:-]/g, `_`).slice(0, 64) || `unknown`,
                a = Pn(this.clock()),
                o = this.state.get(`issues.seen`) || {},
                s = `${a}|${r}|${i}`;
            if (o[s]) return !1;
            for (let e of Object.keys(o)) e.startsWith(a) || delete o[e];
            o[s] = 1, this.state.set(`issues.seen`, o), globalThis.navigator && globalThis.navigator.userAgent;
            let c = this.state.get(`issues.queue`) || [];
            return c.push({
                day: a,
                platform: this.platform,
                sdk_version: I,
                app_version: this.appVersion,
                os_version: String(this.telemetry.device.os_major),
                device_class: this.telemetry.device.class,
                backend: `exact`,
                ...this.modelRevision ? {
                    revision: this.modelRevision
                } : {},
                kind: r,
                code: i,
                ...n.length ? {
                    frames: n.slice(0, 16).map(e => String(e).slice(0, 80))
                } : {}
            }), this.state.set(`issues.queue`, c.slice(-20)), !0
        }
        contributor() {
            let e = this.state.get(`contributor`);
            if (!e) {
                let t = new Uint8Array(16);
                globalThis.crypto.getRandomValues(t), e = mr(t), this.state.set(`contributor`, e)
            }
            return e
        }
        resetContributor() {
            this.state.set(`contributor`, null)
        }
        async contributionSummary() {
            try {
                return await this._call(`GET`, `/v1/contributions/summary`, {
                    headers: {
                        "x-qlab-contributor": this.contributor()
                    }
                })
            } catch {
                return null
            }
        }
        sharingAllowed() {
            let e = this.config && this.config.flags;
            return !e || e.contributions !== !0 ? !1 : (e.upload_trust && e.upload_trust[this.platform] || `capped`) === `capped`
        }
    };

var yi = `quranlab-tajweedformer-v1`;

var bi = e => Array.from(new Uint8Array(e), e => e.toString(16).padStart(2, `0`)).join(``);

async function xi(e) {
    return bi(await globalThis.crypto.subtle.digest(`SHA-256`, e))
}

var R = class extends Error {
    constructor(e, t, n = {}) {
        super(t), this.name = `DeliveryError`, this.code = e, Object.assign(this, n)
    }
};

function Si() {
    let e = new Map;
    return {
        kind: `memory`,
        async get(t) {
            return e.has(t) ? e.get(t) : null
        },
        async put(t, n, r = {}) {
            return r.exclusive && e.has(t) ? !1 : (e.set(t, n), !0)
        },
        async delete(t) {
            e.delete(t)
        },
        async keys(t = ``) {
            return [...e.keys()].filter(e => e.startsWith(t))
        }
    }
}

function Ci(e = yi) {
    let t = `https://cache.quranlab.invalid/`,
        n = () => globalThis.caches.open(e);
    return {
        kind: `cache-api`,
        async get(e) {
            let r = await (await n()).match(t + e);
            return r ? new Uint8Array(await r.arrayBuffer()) : null
        },
        async put(e, r) {
            await (await n()).put(t + e, new Response(r, {
                headers: {
                    "content-type": `application/octet-stream`,
                    "content-length": String(r.length)
                }
            }))
        },
        async delete(e) {
            await (await n()).delete(t + e)
        },
        async keys(e = ``) {
            return (await (await n()).keys()).map(e => e.url.slice(31)).filter(t => t.startsWith(e))
        }
    }
}

function wi(e = yi) {
    let t = null,
        n = () => t ||= new Promise((t, n) => {
            let r = globalThis.indexedDB.open(e, 1);
            r.onupgradeneeded = () => r.result.createObjectStore(`files`), r.onsuccess = () => t(r.result), r.onerror = () => n(r.error)
        }),
        r = async (e, t) => {
            let r = await n();
            return new Promise((n, i) => {
                let a = r.transaction(`files`, e),
                    o = t(a.objectStore(`files`));
                a.oncomplete = () => n(o && `result` in o ? o.result : void 0), a.onerror = () => i(a.error), a.onabort = () => i(a.error)
            })
        };
    return {
        kind: `indexeddb`,
        async get(e) {
            let t = await r(`readonly`, t => t.get(e));
            return t ? new Uint8Array(t) : null
        },
        async put(e, t) {
            await r(`readwrite`, n => n.put(t, e))
        },
        async delete(e) {
            await r(`readwrite`, t => t.delete(e))
        },
        async keys(e = ``) {
            return (await r(`readonly`, e => e.getAllKeys())).filter(t => String(t).startsWith(e))
        }
    }
}

function Ti() {
    return globalThis.caches && typeof globalThis.caches.open == `function` ? Ci() : globalThis.indexedDB ? wi() : Si()
}

var Ei = e => !!e && e.name === `SecurityError`;

async function Di(e = () => globalThis.caches) {
    let t;
    try {
        t = e()
    } catch (e) {
        return Ei(e) ? `blocked` : `failed`
    }
    if (!t || typeof t.open != `function`) return `none`;
    try {
        return await t.has(yi), `works`
    } catch (e) {
        return Ei(e) ? `blocked` : `failed`
    }
}

async function Oi(e = {}) {
    let t = await Di(e.cacheStorage || (() => globalThis.caches));
    if (t === `blocked`) return Object.assign(Si(), {
        blocked: !0
    });
    if (t !== `none`) return Ci();
    let n = null;
    try {
        n = (e.indexedDB || (() => globalThis.indexedDB))()
    } catch {
        n = null
    }
    return n ? wi() : Si()
}

var ki = /^c\d+_l\d+$/;

function Ai(e, {
    context: t,
    platform: n = `web`,
    optional: r = !1
} = {}) {
    if (!t) throw TypeError(`profilePaths: a context is needed`);
    let i = [];
    if (e.format === 3) {
        for (let a of e.files || []) {
            let e = a.platforms === `*` || [].concat(a.platforms).includes(n),
                o = a.context === `*` || a.context === t;
            e && o && (a.need === `required` || r) && a.soc === `*` && i.push(Ir(a))
        }
        return i
    }
    for (let r of e.files || []) {
        let e = r.path;
        if (e === `manifest.json`) continue;
        let a = r.tags || (r.platform || r.context || r.role ? {
            platform: r.platform,
            context: r.context,
            role: r.role
        } : null);
        if (a) {
            let r = [].concat(a.platform || []),
                o = [].concat(a.context || []),
                s = !r.length || r.some(e => [`all`, `cpu`, `engine`, n].includes(e)),
                c = !o.length || o.includes(`*`) || o.includes(t);
            s && c && i.push(e);
            continue
        }
        let o = e.split(`/`)[0];
        if (!e.includes(`/`)) {
            i.push(e);
            continue
        }
        if (o === t) {
            i.push(e);
            continue
        }
        ki.test(o)
    }
    return i
}

function ji(e) {
    let t = e.baseUrl.endsWith(`/`) ? e.baseUrl : e.baseUrl + `/`,
        n = e.fetch || globalThis.fetch.bind(globalThis),
        r = e.store === !1 ? null : e.store || Ti(),
        i = e.rangeSize || 4194304,
        a = Math.max(1, e.parallel || 4),
        o = {
            requests: 0,
            bytesDownloaded: 0,
            filesFromCache: 0,
            filesDownloaded: 0,
            rangesResumed: 0
        },
        s = null,
        c = new Map,
        l = new Map,
        u = new WeakMap,
        d = async (r, i, a = !1) => {
            let s;
            try {
                s = typeof e.headers == `function` ? {
                    ...await e.headers()
                } : {
                    ...e.headers || {}
                }
            } catch (e) {
                let t = new R(`offline`, `${r}: ${e&&e.message||e}`);
                throw e && e.name === `PlatformError` && (t.auth = e), t
            }
            i && (s.range = `bytes=${i[0]}-${i[1]}`);
            let c;
            o.requests++;
            try {
                c = await n(t + r.split(`/`).map(encodeURIComponent).join(`/`), {
                    headers: s,
                    signal: e.signal,
                    cache: `no-store`,
                    redirect: `error`
                })
            } catch (t) {
                throw e.signal && e.signal.aborted ? new R(`aborted`, `download aborted`) : new R(`offline`, `${r}: ${t.message||t}`)
            }
            if (c.status >= 200 && c.status < 300 && typeof e.onServed == `function`) try {
                e.onServed()
            } catch {}
            if (c.status === 401 || c.status === 403 || c.status === 429) {
                let t = null;
                try {
                    t = await c.clone().json()
                } catch {
                    t = null
                }
                let n = t && typeof t.error == `string` ? t.error : null,
                    o = t && typeof t.reason == `string` ? t.reason : null,
                    s = typeof e.stops == `function` && e.stops(o);
                if (c.status === 401 && n === `invalid_token` && !s && typeof e.renew == `function` && !a) {
                    let t = !0;
                    try {
                        await e.renew()
                    } catch {
                        t = !1
                    }
                    if (t) return d(r, i, !0)
                }
                u.set(c, {
                    error: n,
                    reason: o
                })
            }
            return c
        }, f = (t, n) => {
            let r = u.get(n) || {
                    error: null,
                    reason: null
                },
                i = new R(`http`, `${t}: HTTP ${n.status}${r.error?` `+r.error:``}`, {
                    status: n.status,
                    error: r.error,
                    reason: r.reason
                });
            if ((n.status === 401 || n.status === 403) && typeof e.onRefusal == `function`) try {
                e.onRefusal(i)
            } catch {}
            return i
        };
    async function p(e) {
        let t = await d(e, null);
        if (t.status === 404) return null;
        if (!t.ok) throw f(e, t);
        let n = new Uint8Array(await t.arrayBuffer());
        return o.bytesDownloaded += n.length, n
    }
    let m = (e, t, n) => new R(`http`, `${e}: HTTP ${t.status}, ${n}`, {
        status: t.status,
        error: null,
        reason: null
    });
    async function h(e, t, n) {
        let r = t.body && typeof t.body.getReader == `function` ? t.body.getReader() : null;
        if (!r) {
            let r = new Uint8Array(await t.arrayBuffer());
            if (r.length > n) throw m(e, t, `a body of ${r.length} bytes where ${n} were asked for`);
            if (r.length < n) throw new R(`offline`, `${e}: the body ended after ${r.length} of ${n} bytes`);
            return r
        }
        let i = new Uint8Array(n),
            a = 0;
        for (;;) {
            let {
                done: o,
                value: s
            } = await r.read();
            if (o) break;
            if (a + s.length > n) throw await r.cancel().catch(() => {}), m(e, t, `a body longer than the ${n} bytes that were asked for`);
            i.set(s, a), a += s.length
        }
        if (a < n) throw new R(`offline`, `${e}: the body ended after ${a} of ${n} bytes`);
        return i
    }
    async function g(t, n, s, {
        keep: c = !0,
        label: l = t
    } = {}) {
        let u = `sha256/${s}`;
        if (r && c) {
            let i = await r.get(u);
            if (i && i.length === n) return o.filesFromCache++, e.onProgress?.({
                path: t,
                loaded: n,
                total: n,
                cached: !0
            }), i
        }
        let p = Math.max(1, Math.ceil(n / i)),
            g = Array(p),
            _ = 0;
        if (r)
            for (let e = 0; e < p; e++) {
                let t = await r.get(`part/${s}/${e}`),
                    a = Math.min(n, (e + 1) * i) - e * i;
                t && t.length === a && (g[e] = t, _ += t.length, o.rangesResumed++)
            }
        e.onProgress?.({
            path: l,
            loaded: _,
            total: n,
            cached: !1
        });
        let v = 0,
            y = null,
            b = null,
            x = async () => {
                for (; y === null && !b;) {
                    let a = v++;
                    for (; a < p && g[a];) a = v++;
                    if (a >= p) return;
                    let c = a * i,
                        u = Math.min(n, c + i) - 1,
                        b = await d(t, p === 1 && n === 0 ? null : [c, u]);
                    if (b.status === 200) {
                        let e = b.headers.get(`content-length`),
                            r = b.headers.get(`content-encoding`);
                        if (e !== null && (!r || r === `identity`) && Number(e) !== n) throw b.body && typeof b.body.cancel == `function` && await b.body.cancel().catch(() => {}), m(t, b, `${e} bytes where the manifest says ${n}`);
                        let i = await h(t, b, n);
                        o.bytesDownloaded += i.length, y = i;
                        return
                    }
                    if (b.status !== 206) throw f(t, b);
                    let x = b.headers.get(`content-range`);
                    if (x !== null && x.trim() !== `bytes ${c}-${u}/${n}`) throw m(t, b, `the range ${JSON.stringify(x)} where bytes ${c}-${u}/${n} was asked for`);
                    let S = await h(t, b, u - c + 1);
                    o.bytesDownloaded += S.length, g[a] = S, _ += S.length, r && await r.put(`part/${s}/${a}`, S), e.onProgress?.({
                        path: l,
                        loaded: _,
                        total: n,
                        cached: !1
                    })
                }
            };
        if (n === 0) y = new Uint8Array;
        else if (await Promise.all(Array.from({
                length: Math.min(a, p)
            }, () => x().catch(e => {
                b ||= e
            }))), b) throw b;
        let S = y,
            C = !S;
        if (C) {
            S = new Uint8Array(n);
            let e = 0;
            for (let t of g) S.set(t, e), e += t.length
        }
        if (S.length !== n || await xi(S) !== s) {
            if (r && C)
                for (let e = 0; e < p; e++) await r.delete(`part/${s}/${e}`);
            throw new R(`checksum_mismatch`, `${t} does not match its size and SHA-256 in the manifest`, {
                path: t
            })
        }
        if (o.filesDownloaded++, r) {
            c && await r.put(u, S);
            for (let e = 0; e < p; e++) await r.delete(`part/${s}/${e}`)
        }
        return S
    }
    async function _(t, n) {
        if (r) {
            let i = await r.get(`sha256/${n.sha256}`);
            if (i && i.length === n.size) return o.filesFromCache++, e.onProgress?.({
                path: t,
                loaded: n.size,
                total: n.size,
                cached: !0
            }), i
        }
        let i = await Rr(await g(n.stored.path, n.stored.size, n.stored.sha256, {
            keep: !1,
            label: t
        }));
        if (i.length !== n.size || await xi(i) !== n.sha256) throw new R(`checksum_mismatch`, `${t} (inflated from ${n.stored.path}) does not match its decoded size and SHA-256`, {
            path: t
        });
        return o.bytesInflated = (o.bytesInflated || 0) + i.length, r && await r.put(`sha256/${n.sha256}`, i), i
    }
    let v = {
        store: r,
        stats: o,
        fresh: !0,
        async cached(e) {
            let t = s && s.get(e);
            return !t || !r ? !1 : typeof r.has == `function` ? r.has(`sha256/${t.sha256}`) : (await r.keys(`sha256/${t.sha256}`)).length > 0
        },
        async read(n) {
            if (n === `manifest.json`) {
                let n = null;
                try {
                    n = await p(`manifest.json`)
                } catch (i) {
                    if (!(i instanceof R) || i.code === `aborted` || i.code === `checksum_mismatch`) throw i;
                    let a = r && !(typeof e.stopped == `function` && e.stopped()) ? await r.get(`manifest/${t}`) : null;
                    if (!a) throw i.auth ? i.auth : (i.code === `offline` && (i.nothingCached = !0), i);
                    n = a
                }
                n && r && await r.put(`manifest/${t}`, n);
                try {
                    let e = JSON.parse(new TextDecoder().decode(n));
                    s = new Map((e.files || []).map(e => [Ir(e), e.encoding === `gzip` && e.decoded ? {
                        size: e.decoded.size,
                        sha256: String(e.decoded.sha256).toLowerCase(),
                        stored: {
                            path: e.path,
                            size: e.size,
                            sha256: String(e.sha256).toLowerCase()
                        }
                    } : {
                        size: e.size,
                        sha256: String(e.sha256).toLowerCase(),
                        stored: null
                    }]))
                } catch {
                    s = null
                }
                return n
            }
            if (l.has(n)) {
                let e = l.get(n);
                return l.delete(n), e
            }
            let i = s && s.get(n);
            return i ? (c.has(n) || c.set(n, (i.stored ? _(n, i) : g(n, i.size, i.sha256)).finally(() => c.delete(n))), c.get(n)) : p(n)
        },
        async prefetch(e) {
            await Promise.all(e.map(async e => {
                let t = await v.read(e);
                t && l.set(e, t)
            }))
        }
    };
    return v
}

var Mi = `install/`;

var Ni = Object.freeze([`sha256/`, `part/`, `manifest/`, Mi]);

async function Pi(e) {
    let t = 0;
    for (let n of Ni)
        for (let r of await e.keys(n)) await e.delete(r), t++;
    return t
}

async function Fi(e) {
    let t = await Pi(e);
    if (e.blocked) return t;
    let n = globalThis;
    return e.kind !== `cache-api` && n.caches && typeof n.caches.has == `function` && await n.caches.has(`quranlab-tajweedformer-v1`) && (t += await Pi(Ci())), e.kind !== `indexeddb` && n.indexedDB && typeof n.indexedDB.databases == `function` && (await n.indexedDB.databases()).some(e => e && e.name === `quranlab-tajweedformer-v1`) && (t += await Pi(wi())), t
}

var Ii = Object.freeze([`downloading`, `installed`]);

var Li = /^[0-9a-f]{40}$/;

var Ri = new TextEncoder;

var zi = e => Array.from(new Uint8Array(e), e => e.toString(16).padStart(2, `0`)).join(``);

var Bi = () => globalThis.crypto.subtle;

var Vi = {
        name: `HMAC`,
        hash: `SHA-256`
    };

var Hi = (e, t) => `quranlab-model-install 1\n${e}\n${t}\n`;

var Ui = class extends Error {
        constructor(e, t) {
            super(e, t), this.name = `InstallKeyError`, this.code = `key_store_failed`
        }
    };

var Wi = e => ({
        async mac(t) {
            return zi(await Bi().sign(`HMAC`, e, Ri.encode(t)))
        }
    });

async function Gi(e, t) {
    return Ei(e) ? !0 : !e || e.name !== `UnknownError` ? !1 : await Di(t) === `blocked`
}

var Ki = Symbol(`indexedDB.open failed`);

function qi(e = globalThis.indexedDB, t = `quranlab-install`, n = {}) {
    let r = n.cacheStorage || (() => globalThis.caches),
        i = null,
        a = null,
        o = () => i ||= new Promise((n, r) => {
            let i = e => r({
                    [Ki]: !0,
                    error: e
                }),
                a;
            try {
                a = e.open(t, 1)
            } catch (e) {
                i(e);
                return
            }
            a.onupgradeneeded = () => a.result.createObjectStore(`keys`), a.onsuccess = () => n(a.result), a.onerror = () => i(a.error), a.onblocked = () => r(Error(`the database is blocked`))
        }).catch(e => {
            throw i = null, e
        }),
        s = async (e, t) => {
            let n = await o();
            return new Promise((r, i) => {
                let a = n.transaction(`keys`, e),
                    o = t(a.objectStore(`keys`));
                a.oncomplete = () => r(o && `result` in o ? o.result : void 0), a.onerror = () => i(a.error), a.onabort = () => i(a.error)
            })
        }, c = {
            kind: `indexeddb`,
            blocked: !1,
            async key({
                create: e = !1
            } = {}) {
                if (a) return a.key({
                    create: e
                });
                try {
                    let t = await s(`readonly`, e => e.get(`device`));
                    if (!t && e) {
                        let e = await Bi().generateKey({
                            ...Vi,
                            length: 256
                        }, !1, [`sign`, `verify`]);
                        await s(`readwrite`, t => t.add(e, `device`)).catch(() => {}), t = await s(`readonly`, e => e.get(`device`))
                    }
                    return t ? Wi(t) : null
                } catch (t) {
                    let n = !!(t && t[Ki]),
                        i = n ? t.error : t;
                    if (n && await Gi(i, r)) return a ||= Ji(), c.blocked = !0, a.key({
                        create: e
                    });
                    throw new Ui(`the device key store cannot be used: ${i&&i.message||i}`, {
                        cause: i
                    })
                }
            }
        };
    return c
}

function Ji() {
    let e = null;
    return {
        kind: `memory`,
        async key({
            create: t = !1
        } = {}) {
            return !e && t && (e = Wi(await Bi().generateKey({
                ...Vi,
                length: 256
            }, !1, [`sign`, `verify`]))), e
        }
    }
}

var Yi = `device/key`;

var Xi = `device/machine`;

var Zi = e => `quranlab-model-install-machine 1\n${e}\n`;

function Qi({
    fs: e,
    execFileSync: t
}, n) {
    for (let t of [`/etc/machine-id`, `/var/lib/dbus/machine-id`]) try {
        let n = e.readFileSync(t, `utf8`).trim();
        if (n) return {
            id: n,
            byCommand: !1
        }
    } catch {}
    if (n !== `win32` && n !== `darwin`) return {
        id: null,
        commandFailed: !1
    };
    try {
        if (n === `win32` && t) {
            let e = String(t(`reg`, [`query`, `HKLM\\SOFTWARE\\Microsoft\\Cryptography`, `/v`, `MachineGuid`], {
                    windowsHide: !0,
                    timeout: 5e3,
                    stdio: [`ignore`, `pipe`, `ignore`]
                })),
                n = /MachineGuid\s+REG_SZ\s+(\S+)/.exec(e);
            if (n) return {
                id: n[1],
                byCommand: !0
            }
        }
        if (n === `darwin` && t) {
            let e = String(t(`ioreg`, [`-rd1`, `-c`, `IOPlatformExpertDevice`], {
                    timeout: 5e3,
                    stdio: [`ignore`, `pipe`, `ignore`]
                })),
                n = /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(e);
            if (n) return {
                id: n[1],
                byCommand: !0
            }
        }
    } catch {}
    return {
        id: null,
        commandFailed: !0
    }
}

var $i = e => Bi().importKey(`raw`, e, Vi, !1, [`sign`]);

function ea(e = Kn(), t = {}) {
    let n = t.store || Si(),
        r = globalThis.process,
        i = t.platform || r && r.platform,
        a = t.getuid === void 0 ? r && typeof r.getuid == `function` ? () => r.getuid() : null : t.getuid,
        o = null,
        s = () => {
            try {
                let t = e.os.userInfo();
                return typeof t.uid == `number` && t.uid >= 0 ? String(t.uid) : String(t.username)
            } catch (e) {
                if (typeof a == `function`) return String(a());
                throw e
            }
        },
        c = async e => {
            let t = await n.get(Yi);
            if (t && t.length === 32) return t;
            if (!e) return null;
            if (t && await n.delete(Yi), await n.put(Yi, globalThis.crypto.getRandomValues(new Uint8Array(32)), {
                    mode: 384,
                    exclusive: !0
                }), t = await n.get(Yi), !t || t.length !== 32) throw Error(`the key file of the store could not be written`);
            return t
        }, l = async (e, t) => zi(await Bi().sign(`HMAC`, await $i(e), Ri.encode(Zi(t)))), u = async e => {
            let t = await n.get(Xi);
            if (!t || !e) return null;
            let r = null;
            try {
                r = JSON.parse(new TextDecoder().decode(t))
            } catch {
                r = null
            }
            return !r || typeof r.id != `string` || !r.id || typeof r.mac != `string` ? null : await l(e, r.id) === r.mac ? r.id : null
        }, d = async e => {
            let t = await c(!0);
            await u(t) !== e && await n.put(Xi, Ri.encode(JSON.stringify({
                v: 1,
                id: e,
                mac: await l(t, e)
            })))
        }, f = Promise.resolve(), p = e => {
            let t = f.then(e, e);
            return f = t.catch(() => {}), t
        };
    return {
        kind: `derived`,
        key: ({
            create: t = !1
        } = {}) => p(async () => {
            if (o) return o;
            try {
                let n = Qi(e, i),
                    r = n.id;
                if (r && n.byCommand && await d(r).catch(() => {}), !r && n.commandFailed && (r = await u(await c(!1))), r) return o = Wi(await $i(await Bi().digest(`SHA-256`, Ri.encode(`quranlab-model-install-key 1\n${r}\n${s()}\n`)))), o;
                let a = await c(t);
                return a ? (o = Wi(await $i(a)), o) : null
            } catch (e) {
                throw new Ui(`the device key cannot be made: ${e&&e.message||e}`, {
                    cause: e
                })
            }
        })
    }
}

function ta(e) {
    return Gn() ? ea(Kn(), {
        store: e
    }) : globalThis.indexedDB ? qi() : Ji()
}

var na = class {
        constructor({
            store: e,
            deviceKey: t
        }) {
            this.store = e, this.deviceKey = t
        }
        async state(e) {
            if (!Li.test(String(e))) return null;
            let t = await this.store.get(Mi + e);
            if (!t) return null;
            let n = null;
            try {
                n = JSON.parse(new TextDecoder().decode(t))
            } catch {
                n = null
            }
            if (!n || n.build !== e || !Ii.includes(n.state) || typeof n.mac != `string`) return null;
            let r = await this.deviceKey.key({
                create: !1
            });
            return r && await r.mac(Hi(e, n.state)) === n.mac ? n.state : null
        }
        async write(e, t) {
            let n = {
                v: 1,
                build: e,
                state: t,
                mac: await (await this.deviceKey.key({
                    create: !0
                })).mac(Hi(e, t))
            };
            await this.store.put(Mi + e, Ri.encode(JSON.stringify(n)))
        }
        async sweep() {
            let e = this.store,
                t = new Set,
                n = [];
            for (let r of await e.keys(Mi)) {
                let e = r.slice(8);
                await this.state(e) ? t.add(e) : n.push(r)
            }
            let r = new Set,
                i = [...n];
            for (let n of await e.keys(`manifest/`)) {
                let a = await e.get(n),
                    o = null,
                    s = a ? zi(await Bi().digest(`SHA-256`, a)).slice(0, 40) : null;
                if (s && t.has(s)) try {
                    o = JSON.parse(new TextDecoder().decode(a))
                } catch {
                    o = null
                }
                if (!o || !Array.isArray(o.files)) {
                    i.push(n);
                    continue
                }
                for (let e of o.files) e && typeof e.sha256 == `string` && r.add(e.sha256.toLowerCase()), e && e.decoded && typeof e.decoded.sha256 == `string` && r.add(e.decoded.sha256.toLowerCase())
            }
            for (let t of await e.keys(`sha256/`)) r.has(t.slice(7)) || i.push(t);
            for (let t of await e.keys(`part/`)) r.has(t.split(`/`)[1]) || i.push(t);
            for (let t of i) await e.delete(t);
            return i.length
        }
        async clear() {
            for (let e of await this.store.keys(Mi)) await this.store.delete(e)
        }
    };

var ra = `sharing.v1`;

var ia = e => e && Number.isInteger(e.changes) ? e.changes : e && e.consent === `final` ? 1 : 0;

var aa = {
        v: 1,
        consent: `unknown`,
        asks: 0,
        lastAskSession: 0,
        sessions: 0,
        thanked: !1,
        decidedAt: null,
        consentVersion: null,
        consentTextSha256: null,
        guardian: !1
    };

var oa = `share-2026-11-07`;

var sa = class {
        constructor(e, t = {}) {
            this.state = e, this.enabledFn = t.enabled || (() => !1), this.consentVersion = t.consentVersion || null, this.consentTextSha256 = t.consentTextSha256 || null, this.audience = t.audience || `general`, this.clock = t.clock || Date.now, this.listeners = new Set
        }
        get s() {
            let e = {
                ...aa,
                ...(this._held ? this._held.seen : this._raw()) || {}
            };
            return (!Number.isFinite(e.asks) || e.asks < 0) && (e.asks = 0), e.consent === `granted` && !e.consentVersion && (e.consentVersion = oa, e.consentTextSha256 = null), e
        }
        _put(e) {
            this._held ? (this._held.seen = e, this._storeOff()) : this._store(e);
            for (let t of this.listeners) t(e)
        }
        _write(e) {
            try {
                this.state.set(ra, e)
            } catch {
                return !1
            }
            try {
                return JSON.stringify(this.state.get(`sharing.v1`) ?? null) === JSON.stringify(e ?? null)
            } catch {
                return !1
            }
        }
        _store(e) {
            if (this._write(e)) return this._unsaved = null, !0;
            let t = null;
            try {
                t = JSON.stringify(this.state.get(`sharing.v1`) ?? null)
            } catch {
                t = null
            }
            return this._unsaved = {
                v: e,
                over: t
            }, !1
        }
        _raw() {
            let e = this._unsaved;
            if (e) {
                let t = e.over;
                try {
                    t = JSON.stringify(this.state.get(`sharing.v1`) ?? null)
                } catch {
                    t = e.over
                }
                if (t === e.over) return e.v;
                if (e.v && e.v.consent !== `granted`) return e.over = t, e.v;
                this._unsaved = null
            }
            try {
                return this.state.get(`sharing.v1`) || null
            } catch {
                return null
            }
        }
        flush() {
            this._unsaved && (this._raw(), this._unsaved && this._store(this._unsaved.v))
        }
        _storeOff() {
            let e = this._held;
            e.stored = this._write({
                ...aa,
                ...e.seen || {},
                consent: `final`,
                changes: Math.max(e.count, ia(e.seen) + 1)
            })
        }
        onChange(e) {
            return this.listeners.add(e), () => this.listeners.delete(e)
        }
        _today() {
            return new Date(this.clock()).toISOString().slice(0, 10)
        }
        get sharing() {
            return this.enabledFn() && this.s.consent === `granted`
        }
        get guardianVariant() {
            return this.audience === `children`
        }
        get asking() {
            let e = this.s;
            return (e.consent === `unknown` || e.consent === `declined`) && e.asks < 3
        }
        setConsent(e, t = null) {
            this.consentVersion = e || null, this.consentTextSha256 = t || null;
            for (let e of this.listeners) e(this.s)
        }
        get grantVersion() {
            let e = this.s;
            return e.consent === `granted` ? e.consentVersion : null
        }
        get grantTextSha256() {
            if (!this.sharing) return null;
            let e = this.s;
            return e.consentVersion && e.consentVersion.startsWith(`custom-`) && e.consentTextSha256 || null
        }
        _ask(e) {
            return e.consent !== `unknown` && e.consent !== `declined` || e.asks >= 3 || e.asks > 0 && e.sessions - e.lastAskSession < 7 ? null : e.consent === `declined` ? `reask` : `first`
        }
        sessionCompleted({
            feedback: e = !1
        } = {}) {
            let t = this.s;
            t.sessions += 1;
            let n = this.enabledFn() && e ? this._ask(t) : null;
            return n && (t.asks += 1, t.lastAskSession = t.sessions), this._put(t), n ? {
                variant: n,
                guardian: this.guardianVariant
            } : null
        }
        askNow() {
            let e = this.s;
            if (e.consent !== `unknown` && e.consent !== `declined` || e.asks >= 3) return null;
            let t = e.consent === `declined` ? `reask` : `first`;
            return e.asks += 1, e.lastAskSession = e.sessions, this._put(e), {
                variant: t,
                guardian: this.guardianVariant
            }
        }
        answer(e, {
            guardianConfirmed: t = !1
        } = {}) {
            let n = this.s;
            if (n.consent === `granted` || n.consent === `final`) return n.consent;
            if (e) {
                if (this.guardianVariant && !t) throw Error(`the guardian variant needs the parent or guardian confirmation`);
                Object.assign(n, {
                    consent: `granted`,
                    decidedAt: this._today(),
                    consentVersion: this.consentVersion,
                    consentTextSha256: this.consentTextSha256,
                    guardian: !!t
                }), n.changes = this.changes + 1
            } else n.consent = n.asks >= 3 ? `final` : `declined`, n.decidedAt = this._today();
            return this._put(n), n.consent
        }
        offUntilAnswered() {
            if (this._held) return this._held.done;
            let e = {
                seen: this._raw(),
                count: this.changes + 1,
                done: null,
                stored: !1
            };
            return e.done = {
                accepted: () => {
                    if (this._held !== e) {
                        this.s.consent === `granted` && this.setSharing(!1);
                        return
                    }
                    let t = this.s,
                        n = Math.max(e.count, this.changes + 1);
                    this._held = null, Object.assign(t, {
                        consent: `final`,
                        changes: n
                    }), this._put(t)
                },
                refused: () => {
                    this._held === e && (this._held = null, this._store(e.seen))
                }
            }, this._held = e, this._storeOff(), e.done
        }
        get changes() {
            return ia(this.s)
        }
        setSharing(e, {
            guardianConfirmed: t = !1
        } = {}) {
            let n = this.s;
            if (e) {
                if (n.consent === `granted`) return;
                if (this.guardianVariant && !t) throw Error(`the guardian variant needs the parent or guardian confirmation`);
                Object.assign(n, {
                    consent: `granted`,
                    consentVersion: this.consentVersion,
                    consentTextSha256: this.consentTextSha256,
                    guardian: !!t,
                    decidedAt: this._today()
                })
            } else n.consent = `final`;
            n.changes = this.changes + 1, this._put(n)
        }
        takeThanks() {
            let e = this.s;
            return e.consent !== `granted` || e.thanked ? !1 : (e.thanked = !0, this._put(e), !0)
        }
    };

var ca = {
        ar: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `ar`,
            dir: `rtl`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `اجعل تلاوتك خيراً مستمراً`,
                "sheet.body": `عندما تشارك تلاواتك، فإنها تساعد في تدريب نموذج التجويد المجاني في هذا التطبيق على الاستماع بشكل أفضل. وكل متعلم يعينه بعدك هو عمل صالح قد يستمر طويلاً بعد فراغك من التلاوة إن شاء الله: صدقة جارية.`,
                "sheet.hadith": `قال النبي صلى الله عليه وسلم: «إِذَا مَاتَ الإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلاَّ مِنْ ثَلاَثَةٍ إِلاَّ مِنْ صَدَقَةٍ جَارِيَةٍ أَوْ عِلْمٍ يُنْتَفَعُ بِهِ أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ»`,
                "sheet.hadith_ref": `صحيح مسلم 1631`,
                "sheet.mistakes": `أخطاؤك هي الجزء الأثمن، فهي تُعلّم النموذج كيف يصوّب للمتعلم التالي برفق.`,
                "sheet.what": `التسجيل الصوتي لجلسات تلاوتك في هذا التطبيق أثناء استماعه، وتفاصيل تقنية أساسية مثل إصدار النموذج ونوع الجهاز. دون اسم، أو جهات اتصال، أو موقع جغرافي.`,
                "sheet.who": `Quran Lab، وهو وقف. النماذج التي يدرّبها مجانية للجميع دائماً، ولا تُباع أبداً.`,
                "sheet.control": `يمكنك التوقف في أي وقت وحذف ما شاركته من الإعدادات.`,
                "sheet.share": `مشاركة تلاواتي`,
                "sheet.not_now": `ليس الآن`,
                "sheet.guardian.title": `سؤال للوالدين أو ولي الأمر`,
                "sheet.guardian.body": `هذا التطبيق مخصص للأطفال. يُرجى قراءة هذا مع طفلك: تفعيل المشاركة يرسل التسجيل الصوتي لتلاواته إلى Quran Lab لمساعدة متعلمين آخرين. لا يمكن تفعيل هذا الخيار إلا من قِبل أحد الوالدين أو ولي الأمر.`,
                "sheet.guardian.confirm": `أنا والد هذا الطفل أو ولي أمره، وأوافق على مشاركة تلاواته.`,
                "sheet.guardian.share": `المشاركة كولي أمر`,
                thanks: `جزاك الله خيراً. تلاوتك تساعد الآن متعلمين آخرين. تقبل الله منك.`,
                "settings.toggle": `مشاركة تلاواتي`,
                "settings.what": `ما الذي تتم مشاركته`,
                "settings.delete": `حذف ما شاركته`,
                "what.detail": `عند تفعيل المشاركة، يُرسل التسجيل الصوتي لجلسات تلاوتك في هذا التطبيق إلى Quran Lab، مع تفاصيل تقنية عامة (إصدار النموذج، نوع الجهاز، إصدار النظام، واليوم)، ورمز عشوائي خاص بهذا التثبيت. ولا نجمع أبداً اسمك أو حسابك أو جهات اتصالك أو موقعك أو معرّفات جهازك. تُحفظ التسجيلات في الاتحاد الأوروبي وتُستخدم فقط لتحسين نماذج تلاوة القرآن الكريم المجانية. إيقاف المشاركة يوقف الإرسال فوراً، ويمكنك حذف كل ما شاركته من الإعدادات في أي وقت: حيث يُحذف من خوادم Quran Lab في الحال.`,
                "delete.confirm": `ستُحذف تلاواتك التي شاركتها من خوادم Quran Lab فوراً. لا يمكن التراجع عن هذا الإجراء.`,
                "delete.action": `حذف`,
                "delete.cancel": `إلغاء`,
                "delete.done": `تم. حُذف ما شاركته من خوادم Quran Lab. أما النسخ التي استُخدمت بالفعل في تدريب النموذج، فلن تُدرج في أي تدريب مستقبلي.`,
                "delete.failed.title": `تعذّر الحذف`,
                "delete.failed.network": `تعذّر الاتصال بـ Quran Lab، ولم يُحذف أي شيء. يُرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.`,
                "delete.retry": `إعادة المحاولة`,
                "recovery.hint": `احتفظ بهذا الرمز، الذي يُستخدم لمرة واحدة، لحذف ما شاركته في حال فقدت هذا الجهاز: portal.quranlab.ai/delete`,
                "recovery.reveal": `إظهار رمز الاسترداد`,
                "recovery.copy": `نسخ`,
                "recovery.copied": `تم النسخ`,
                "recovery.keep": `احتفظ بهذا الرمز في مكان آمن. فهو وسيلتك الوحيدة لحذف ما شاركته من جهاز آخر، ويُستخدم لمرة واحدة فقط.`,
                "recovery.used": `تم استخدام رمز الاسترداد هذا من قبل.`,
                "recovery.invalid": `هذا الرمز غير صالح. يُرجى التحقق من صحة الكلمات والمحاولة مجدداً.`,
                reask: `قد تساعد تلاوتك اليوم متعلماً آخر غداً. هل ترغب في مشاركتها؟`,
                "impact.minutes": {
                    zero: `شاركت {minutes} دقيقة من التلاوة. جزاك الله خيراً.`,
                    one: `شاركت {minutes} دقيقة من التلاوة. جزاك الله خيراً.`,
                    two: `شاركت {minutes} دقيقة من التلاوة. جزاك الله خيراً.`,
                    few: `شاركت {minutes} دقائق من التلاوة. جزاك الله خيراً.`,
                    many: `شاركت {minutes} دقيقة من التلاوة. جزاك الله خيراً.`,
                    other: `شاركت {minutes} دقيقة من التلاوة. جزاك الله خيراً.`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: `https://sunnah.com/muslim:1631`,
                translated: !1,
                verified_at: `2026-11-07`,
                note: `matn as printed on sunnah.com; word for word the same as HadeethEnc ar (diacritics aside)`
            }
        },
        bn: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `bn`,
            dir: `ltr`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `আপনার তিলাওয়াতের কল্যাণ অব্যাহত থাকুক`,
                "sheet.body": `আপনি যখন আপনার তিলাওয়াত শেয়ার করেন, তা এই অ্যাপের ফ্রি তাজবিদ মডেলকে আরও ভালোভাবে শুনতে শেখায়। আপনার পরে এর মাধ্যমে উপকৃত হওয়া প্রতিটি শিক্ষার্থী আপনার জন্য এমন এক নেক আমল হতে পারে, যা তিলাওয়াত শেষ করার পরও অব্যাহত থাকতে পারে, ইনশাআল্লাহ: সাদাকায়ে জারিয়া।`,
                "sheet.hadith": `রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বলেছেন: “যখন মানুষ মৃত্যুবরণ করে তখন তার সমস্ত আমল বন্ধ হয়ে যায় তিন প্রকার আমল ছাড়া। সাদাকা জারিয়াহ্(চালু থাকে এমন) অথবা এমন ইলম যার দ্বারা উপকার হয় অথবা পুণ্যবান সন্তান যে তার জন্যে দু’আ করতে থাকে”`,
                "sheet.hadith_ref": `সহিহ মুসলিম 1631`,
                "sheet.mistakes": `আপনার ভুলগুলোই এখানে সবচেয়ে মূল্যবান অংশ। এগুলো পরবর্তী শিক্ষার্থীকে নম্রভাবে ভুল শুধরে দিতে মডেলটিকে শেখায়।`,
                "sheet.what": `অ্যাপটি শোনার সময় এতে আপনার তিলাওয়াতের অডিও এবং মডেল ভার্সন ও ডিভাইসের ধরনের মতো সাধারণ কিছু কারিগরি তথ্য। কোনো নাম, যোগাযোগের তথ্য বা লোকেশন নয়।`,
                "sheet.who": `Quran Lab, একটি ওয়াকফ। এর তৈরি মডেলগুলো সবার জন্য চিরকাল সম্পূর্ণ বিনামূল্যে এবং এগুলো কখনোই বিক্রি করা হয় না।`,
                "sheet.control": `আপনি যেকোনো সময় এটি বন্ধ করতে পারেন এবং যা শেয়ার করেছেন তা সেটিংস থেকে মুছে ফেলতে পারেন।`,
                "sheet.share": `আমার তিলাওয়াত শেয়ার করুন`,
                "sheet.not_now": `এখন নয়`,
                "sheet.guardian.title": `পিতামাতা বা অভিভাবকের জন্য একটি প্রশ্ন`,
                "sheet.guardian.body": `এই অ্যাপটি শিশুদের জন্য তৈরি। অনুগ্রহ করে আপনার সন্তানের সাথে এটি পড়ুন: শেয়ার চালু করলে তার তিলাওয়াতের অডিও Quran Lab-এ পাঠানো হবে, যা অন্যান্য শিক্ষার্থীদের সাহায্য করবে। কেবল পিতামাতা বা অভিভাবকই এটি চালু করতে পারবেন।`,
                "sheet.guardian.confirm": `আমি এই শিশুর পিতামাতা বা অভিভাবক, এবং তার তিলাওয়াত শেয়ার করতে সম্মত।`,
                "sheet.guardian.share": `অভিভাবক হিসেবে শেয়ার করুন`,
                thanks: `জাযাকাল্লাহু খাইরান। আপনার তিলাওয়াত এখন অন্যান্য শিক্ষার্থীদের সাহায্য করছে। আল্লাহ আপনার পক্ষ থেকে এটি কবুল করুন।`,
                "settings.toggle": `আমার তিলাওয়াত শেয়ার করুন`,
                "settings.what": `যা শেয়ার করা হয়`,
                "settings.delete": `শেয়ার করা তিলাওয়াত মুছুন`,
                "what.detail": `শেয়ারিং চালু থাকলে, এই অ্যাপে আপনার তিলাওয়াত সেশনের অডিও Quran Lab-এ পাঠানো হয়। এর সাথে থাকে সাধারণ কিছু কারিগরি তথ্য (মডেল সংস্করণ, ডিভাইসের ধরন, সিস্টেম সংস্করণ, দিন) এবং এই ইনস্টলেশনের জন্য একটি র‍্যান্ডম কোড। আপনার নাম, অ্যাকাউন্ট, কনট্যাক্ট, লোকেশন বা ডিভাইস শনাক্তকারী তথ্য কখনোই নেওয়া হয় না। এটি ইইউ (EU)-তে সংরক্ষিত থাকে এবং কেবল বিনামূল্যে ব্যবহারযোগ্য কুরআন তিলাওয়াত মডেলগুলোর মানোন্নয়নে ব্যবহৃত হয়। শেয়ারিং বন্ধ করলে সাথে সাথেই আপলোড বন্ধ হয়ে যায়, আর সেটিংস থেকে যেকোনো সময় আপনি শেয়ার করা সবকিছু মুছে ফেলতে পারেন: Quran Lab-এর সার্ভার থেকে এটি সাথে সাথেই মুছে ফেলা হয়।`,
                "delete.confirm": `আপনার শেয়ার করা তিলাওয়াতগুলো সাথে সাথেই Quran Lab-এর সার্ভার থেকে মুছে ফেলা হবে। এটি আর ফিরিয়ে আনা সম্ভব নয়।`,
                "delete.action": `মুছে ফেলুন`,
                "delete.cancel": `বাতিল করুন`,
                "delete.done": `সম্পন্ন হয়েছে। আপনি যা শেয়ার করেছিলেন, তা Quran Lab-এর সার্ভার থেকে মুছে ফেলা হয়েছে। মডেল প্রশিক্ষণে ইতিমধ্যে ব্যবহৃত অনুলিপিগুলো ভবিষ্যতের প্রশিক্ষণ থেকে বাদ রাখা হবে।`,
                "delete.failed.title": `মুছে ফেলা যায়নি`,
                "delete.failed.network": `Quran Lab-এর সাথে সংযোগ করা যায়নি। কোনো কিছুই মুছে ফেলা হয়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।`,
                "delete.retry": `আবার চেষ্টা করুন`,
                "recovery.hint": `ডিভাইসটি হারিয়ে গেলে আপনার শেয়ার করা তথ্য মুছে ফেলার জন্য এই ওয়ান-টাইম কোডটি সংরক্ষণ করে রাখুন: portal.quranlab.ai/delete`,
                "recovery.reveal": `আমার রিকভারি কোড দেখুন`,
                "recovery.copy": `কপি করুন`,
                "recovery.copied": `কপি করা হয়েছে`,
                "recovery.keep": `এই কোডটি নিরাপদে সংরক্ষণ করুন। অন্য কোনো ডিভাইস থেকে আপনি যা শেয়ার করেছেন তা মুছে ফেলার এটিই একমাত্র উপায়, এবং এটি কেবল একবারই ব্যবহার করা যাবে।`,
                "recovery.used": `এই রিকভারি কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে।`,
                "recovery.invalid": `এই কোডটি সঠিক নয়। শব্দগুলো মিলিয়ে দেখে আবার চেষ্টা করুন।`,
                reask: `আজকের আপনার তিলাওয়াত হয়তো আগামী দিনে অন্য কোনো শিক্ষার্থীকে সাহায্য করতে পারে। আপনি কি এটি শেয়ার করতে চান?`,
                "impact.minutes": {
                    one: `আপনি {minutes} মিনিট তিলাওয়াত শেয়ার করেছেন। আল্লাহ আপনাকে উত্তম প্রতিদান দিন।`,
                    other: `আপনি {minutes} মিনিট তিলাওয়াত শেয়ার করেছেন। আল্লাহ আপনাকে উত্তম প্রতিদান দিন।`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: `https://hadeethenc.com/bn/browse/hadith/65566`,
                translated: !1,
                verified_at: `2026-11-07`,
                note: `established translation published by HadeethEnc`
            }
        },
        en: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `en`,
            dir: `ltr`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `Let your recitation keep doing good`,
                "sheet.body": `When you share your recitations, they help teach this app's free tajweed model to listen better. Every learner it helps after you is a good deed that may continue long after you finish reciting, in sha Allah: a sadaqah jariyah.`,
                "sheet.hadith": `The Prophet, peace be upon him, said: "When a person dies, his deeds come to an end except for three things: ongoing charity, beneficial knowledge, or a pious child who supplicates for him."`,
                "sheet.hadith_ref": `Sahih Muslim 1631`,
                "sheet.mistakes": `Your mistakes are the most valuable part. They teach the model to correct the next learner gently.`,
                "sheet.what": `The audio of your recitation sessions in this app, while it listens, and basic technical details such as the model version and device type. No name, no contacts, no location.`,
                "sheet.who": `Quran Lab, a waqf. The models it trains are free for everyone, forever, and are never sold.`,
                "sheet.control": `You can stop at any time and delete what you shared from the settings.`,
                "sheet.share": `Share my recitations`,
                "sheet.not_now": `Not now`,
                "sheet.guardian.title": `A question for a parent or guardian`,
                "sheet.guardian.body": `This app is made for children. Please read this with your child: sharing sends the audio of their recitations to Quran Lab to help other learners. Only a parent or guardian can turn it on.`,
                "sheet.guardian.confirm": `I am this child's parent or guardian, and I agree to share their recitations.`,
                "sheet.guardian.share": `Share as parent or guardian`,
                thanks: `Jazak Allahu khayran. Your recitation is now helping other learners. May Allah accept it from you.`,
                "settings.toggle": `Share my recitations`,
                "settings.what": `What is shared`,
                "settings.delete": `Delete what I shared`,
                "what.detail": `When sharing is on, the audio of your recitation sessions in this app is sent to Quran Lab, with coarse technical details (model version, device type, system version, the day) and a random code for this install. Never your name, account, contacts, location or device identifiers. It is stored in the EU and used only to improve free Quran recitation models. Turning sharing off stops uploads at once, and you can delete everything you shared from the settings at any time: it is removed from Quran Lab's servers right away.`,
                "delete.confirm": `Your shared recitations will be deleted from Quran Lab's servers right away. This cannot be undone.`,
                "delete.action": `Delete`,
                "delete.cancel": `Cancel`,
                "delete.done": `Done. What you shared has been deleted from Quran Lab's servers. Copies already used to train a model are left out of future training.`,
                "delete.failed.title": `Could not delete`,
                "delete.failed.network": `We could not reach Quran Lab. Nothing was deleted. Check your connection and try again.`,
                "delete.retry": `Try again`,
                "recovery.hint": `Keep this one-time code to delete what you shared if you lose this device: portal.quranlab.ai/delete`,
                "recovery.reveal": `Show my recovery code`,
                "recovery.copy": `Copy`,
                "recovery.copied": `Copied`,
                "recovery.keep": `Keep this code safe. It is the only way to delete what you shared from another device, and it works once.`,
                "recovery.used": `This recovery code was already used.`,
                "recovery.invalid": `This code is not valid. Check the words and try again.`,
                reask: `Your recitation today could help another learner tomorrow. Would you like to share it?`,
                "impact.minutes": {
                    one: `You have shared {minutes} minute of recitation. May Allah reward you.`,
                    other: `You have shared {minutes} minutes of recitation. May Allah reward you.`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: `https://hadeethenc.com/en/browse/hadith/65566`,
                translated: !1,
                verified_at: `2026-11-07`,
                note: `English of HadeethEnc (Encyclopedia of Translated Prophetic Hadiths), checked against sunnah.com (Abdul Hamid Siddiqui translation, same meaning)`
            }
        },
        fr: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `fr`,
            dir: `ltr`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `Que votre récitation continue de faire le bien`,
                "sheet.body": `Lorsque vous partagez vos récitations, elles permettent d'entraîner le modèle de tajwid gratuit de l'application à mieux écouter. Chaque apprenant qu'il aide après vous est une bonne action qui peut perdurer bien après votre récitation, inchâAllah : une sadaqa jâriya (aumône continue).`,
                "sheet.hadith": `Le Prophète, que la paix soit sur lui, a dit : « Quand une personne meurt, ses actions prennent fin sauf trois choses : une aumône continue (sadaqa jâriya), une science utile, ou un enfant pieux qui fait des invocations (du'â) pour elle. »`,
                "sheet.hadith_ref": `Sahih Muslim 1631`,
                "sheet.mistakes": `Vos erreurs sont ce qu'il y a de plus précieux. Elles apprennent au modèle à corriger le prochain apprenant avec douceur.`,
                "sheet.what": `L'enregistrement audio de vos séances de récitation dans cette application lorsqu'elle est à l'écoute, et des détails techniques simples comme la version du modèle et le type d'appareil. Aucun nom, aucun contact, aucune localisation.`,
                "sheet.who": `Quran Lab, un waqf. Les modèles entraînés sont gratuits pour tous, pour toujours, et ne sont jamais vendus.`,
                "sheet.control": `Vous pouvez arrêter à tout moment et supprimer ce que vous avez partagé depuis les paramètres.`,
                "sheet.share": `Partager mes récitations`,
                "sheet.not_now": `Pas maintenant`,
                "sheet.guardian.title": `Une question pour un parent ou tuteur`,
                "sheet.guardian.body": `Cette application est conçue pour les enfants. Merci de lire ceci avec votre enfant : le partage transmet l'audio de ses récitations à Quran Lab afin d'aider d'autres apprenants. Seul un parent ou un tuteur peut l'activer.`,
                "sheet.guardian.confirm": `Je suis le parent ou le tuteur de cet enfant, et j'accepte de partager ses récitations.`,
                "sheet.guardian.share": `Partager (parent ou tuteur)`,
                thanks: `Jazâk Allâhu khayran. Votre récitation aide désormais d'autres apprenants. Qu'Allah l'accepte de votre part.`,
                "settings.toggle": `Partager mes récitations`,
                "settings.what": `Ce qui est partagé`,
                "settings.delete": `Supprimer mes partages`,
                "what.detail": `Lorsque le partage est activé, l'audio de vos séances de récitation dans cette application est envoyé à Quran Lab, avec quelques informations techniques générales (version du modèle, type d'appareil, version du système, date) et un code aléatoire propre à cette installation. Jamais votre nom, votre compte, vos contacts, votre localisation ou les identifiants de votre appareil. Ces données sont stockées dans l'Union européenne et servent uniquement à améliorer des modèles gratuits de récitation du Coran. Désactiver le partage interrompt immédiatement les envois, et vous pouvez supprimer tout ce que vous avez partagé à tout moment depuis les paramètres : vos données sont immédiatement effacées des serveurs de Quran Lab.`,
                "delete.confirm": `Vos récitations partagées seront immédiatement supprimées des serveurs de Quran Lab. Cette action est irréversible.`,
                "delete.action": `Supprimer`,
                "delete.cancel": `Annuler`,
                "delete.done": `C'est fait. Ce que vous avez partagé a été supprimé des serveurs de Quran Lab. Les copies déjà utilisées pour entraîner un modèle seront exclues des futurs entraînements.`,
                "delete.failed.title": `Impossible de supprimer`,
                "delete.failed.network": `Impossible de joindre Quran Lab. Rien n'a été supprimé. Vérifiez votre connexion et réessayez.`,
                "delete.retry": `Réessayer`,
                "recovery.hint": `Conservez ce code à usage unique pour supprimer vos partages si vous perdez cet appareil : portal.quranlab.ai/delete`,
                "recovery.reveal": `Afficher mon code de récupération`,
                "recovery.copy": `Copier`,
                "recovery.copied": `Copié`,
                "recovery.keep": `Conservez ce code en lieu sûr. C'est le seul moyen de supprimer ce que vous avez partagé depuis un autre appareil, et il ne fonctionne qu'une seule fois.`,
                "recovery.used": `Ce code de récupération a déjà été utilisé.`,
                "recovery.invalid": `Ce code n'est pas valide. Vérifiez les mots et réessayez.`,
                reask: `Votre récitation d'aujourd'hui pourrait aider un autre apprenant demain. Souhaitez-vous la partager ?`,
                "impact.minutes": {
                    one: `Vous avez partagé {minutes} minute de récitation. Qu'Allah vous récompense.`,
                    many: `Vous avez partagé {minutes} de minutes de récitation. Qu'Allah vous récompense.`,
                    other: `Vous avez partagé {minutes} minutes de récitation. Qu'Allah vous récompense.`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: null,
                translated: !0,
                verified_at: `2026-11-07`,
                note: `no established translation of this hadith found online in this language (HadeethEnc has none for 65566); translated by the router from the verified English and back-translated: When a person dies, their actions come to an end except three things: a continuous charity (sadaqa jâriya), useful knowledge, or a pious child who makes invocations (du'â) for them.`
            }
        },
        id: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `id`,
            dir: `ltr`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `Biarkan bacaan Anda terus mengalirkan kebaikan`,
                "sheet.body": `Saat Anda membagikan bacaan Anda, rekaman tersebut membantu melatih model tajwid gratis di aplikasi ini agar dapat menyimak dengan lebih baik. Setiap pembelajar yang terbantu setelahnya bisa menjadi kebaikan yang terus mengalir walau Anda telah selesai membaca, insya Allah: sebuah sedekah jariyah.`,
                "sheet.hadith": `Rasulullah shallallahu 'alaihi wa sallam bersabda: "Apabila manusia meninggal, maka terputuslah amalnya kecuali tiga perkara: sedekah yang mengalir, ilmu yang dimanfaatkan, dan anak saleh yang mendoakannya."`,
                "sheet.hadith_ref": `Shahih Muslim 1631`,
                "sheet.mistakes": `Kekeliruan bacaan Anda justru bagian yang paling berharga. Dari situ, model ini belajar cara mengoreksi pembelajar berikutnya dengan lembut.`,
                "sheet.what": `Audio dari sesi bacaan Anda di aplikasi ini saat aplikasi menyimak, serta informasi teknis dasar seperti versi model dan jenis perangkat. Tanpa nama, tanpa kontak, tanpa lokasi.`,
                "sheet.who": `Quran Lab, sebuah inisiatif wakaf. Model yang dilatih di sini gratis untuk siapa saja, selamanya, dan tidak pernah diperjualbelikan.`,
                "sheet.control": `Anda bisa berhenti kapan saja dan menghapus apa yang telah Anda bagikan melalui menu pengaturan.`,
                "sheet.share": `Bagikan bacaan saya`,
                "sheet.not_now": `Nanti saja`,
                "sheet.guardian.title": `Pertanyaan untuk orang tua atau wali`,
                "sheet.guardian.body": `Aplikasi ini ditujukan untuk anak-anak. Mohon baca ini bersama anak Anda: mengaktifkan fitur berbagi akan mengirimkan audio bacaan mereka ke Quran Lab untuk membantu pembelajar lain. Hanya orang tua atau wali yang dapat mengaktifkannya.`,
                "sheet.guardian.confirm": `Saya adalah orang tua atau wali anak ini, dan saya menyetujui untuk membagikan rekaman bacaannya.`,
                "sheet.guardian.share": `Bagikan sebagai orang tua/wali`,
                thanks: `Jazakallahu khairan. Bacaan Anda kini turut membantu pembelajar lain. Semoga Allah menerimanya dari Anda.`,
                "settings.toggle": `Bagikan bacaan saya`,
                "settings.what": `Data yang dibagikan`,
                "settings.delete": `Hapus rekaman yang dibagikan`,
                "what.detail": `Ketika fitur berbagi aktif, rekaman audio tilawah Anda di aplikasi ini akan dikirim ke Quran Lab, bersama rincian teknis umum (versi model, tipe perangkat, versi sistem, hari), dan kode acak untuk instalasi ini. Sama sekali tanpa nama, akun, kontak, lokasi, ataupun tanda pengenal perangkat Anda. Data disimpan di Uni Eropa dan hanya digunakan untuk menyempurnakan model tilawah Al-Qur'an gratis. Mematikan fitur berbagi akan langsung menghentikan pengiriman, dan Anda dapat menghapus semua yang telah dibagikan kapan saja melalui pengaturan: data akan langsung dihapus dari server Quran Lab saat itu juga.`,
                "delete.confirm": `Rekaman tilawah yang Anda bagikan akan langsung dihapus dari server Quran Lab saat itu juga. Tindakan ini tidak dapat dibatalkan.`,
                "delete.action": `Hapus rekaman`,
                "delete.cancel": `Batal hapus`,
                "delete.done": `Selesai. Apa yang Anda bagikan sudah dihapus dari server Quran Lab. Salinan yang sudah digunakan untuk melatih model tidak akan disertakan dalam pelatihan berikutnya.`,
                "delete.failed.title": `Tidak dapat menghapus`,
                "delete.failed.network": `Kami tidak dapat terhubung ke Quran Lab. Tidak ada yang dihapus. Periksa koneksi Anda dan coba lagi.`,
                "delete.retry": `Coba lagi`,
                "recovery.hint": `Simpan kode sekali pakai ini untuk menghapus data yang Anda bagikan jika perangkat ini hilang: portal.quranlab.ai/delete`,
                "recovery.reveal": `Tampilkan kode pemulihan`,
                "recovery.copy": `Salin`,
                "recovery.copied": `Tersalin`,
                "recovery.keep": `Simpan kode ini baik-baik. Ini satu-satunya cara untuk menghapus apa yang Anda bagikan dari perangkat lain, dan hanya bisa digunakan satu kali.`,
                "recovery.used": `Kode pemulihan ini sudah pernah digunakan.`,
                "recovery.invalid": `Kode ini tidak valid. Periksa kembali kata-katanya dan coba lagi.`,
                reask: `Bacaan Anda hari ini bisa membantu pembelajar lain esok hari. Bersediakah Anda membagikannya?`,
                "impact.minutes": {
                    other: `Anda telah membagikan {minutes} menit bacaan. Semoga Allah membalas kebaikan Anda.`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: `https://hadeethenc.com/id/browse/hadith/65566`,
                translated: !1,
                verified_at: `2026-11-07`,
                note: `established translation published by HadeethEnc; one typo in the source corrected (mendokannya -> mendoakannya)`
            }
        },
        ms: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `ms`,
            dir: `ltr`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `Biarlah bacaan anda terus mengalirkan kebaikan`,
                "sheet.body": `Apabila anda berkongsi bacaan, ia membantu melatih model tajwid percuma aplikasi ini agar dapat mendengar dengan lebih baik. Setiap pembelajar yang dibantunya selepas ini moga menjadi kebaikan yang terus mengalir buat anda walaupun selepas selesai membaca, insya-Allah: sebagai sedekah jariah.`,
                "sheet.hadith": `Rasulullah SAW bersabda: "Apabila seseorang meninggal dunia, terputuslah amalannya melainkan tiga perkara: sedekah jariah, ilmu yang bermanfaat, atau anak soleh yang mendoakannya."`,
                "sheet.hadith_ref": `Sahih Muslim 1631`,
                "sheet.mistakes": `Kesilapan anda adalah bahagian yang paling bernilai. Ia mengajar model ini menegur pelajar seterusnya dengan lembut.`,
                "sheet.what": `Audio daripada sesi bacaan anda dalam aplikasi ini semasa ia mendengar, serta maklumat teknikal asas seperti versi model dan jenis peranti. Tiada nama, senarai kenalan mahupun lokasi.`,
                "sheet.who": `Quran Lab, sebuah inisiatif wakaf. Model yang dilatih adalah percuma untuk semua, selama-lamanya, dan tidak akan sesekali dijual.`,
                "sheet.control": `Anda boleh berhenti pada bila-bila masa dan memadam apa yang telah dikongsi melalui tetapan.`,
                "sheet.share": `Kongsi bacaan saya`,
                "sheet.not_now": `Bukan sekarang`,
                "sheet.guardian.title": `Pertanyaan untuk ibu bapa atau penjaga`,
                "sheet.guardian.body": `Aplikasi ini direka untuk kanak-kanak. Sila baca ini bersama anak anda: perkongsian ini akan menghantar audio bacaan mereka kepada Quran Lab untuk membantu pembelajar lain. Hanya ibu bapa atau penjaga yang boleh mengaktifkannya.`,
                "sheet.guardian.confirm": `Saya ibu bapa atau penjaga kepada anak ini, dan saya bersetuju untuk berkongsi bacaan mereka.`,
                "sheet.guardian.share": `Kongsi sebagai penjaga`,
                thanks: `Jazakallahu khairan. Bacaan anda kini membantu pembelajar lain. Semoga Allah menerimanya daripada anda.`,
                "settings.toggle": `Kongsi bacaan saya`,
                "settings.what": `Maklumat yang dikongsi`,
                "settings.delete": `Padam apa yang dikongsi`,
                "what.detail": `Apabila perkongsian diaktifkan, audio sesi bacaan anda dalam aplikasi ini akan dihantar kepada Quran Lab bersama butiran teknikal umum (versi model, jenis peranti, versi sistem, hari) dan kod rawak bagi pemasangan ini. Nama, akaun, kenalan, lokasi atau pengecam peranti anda tidak akan diambil sama sekali. Data ini disimpan di EU dan hanya digunakan untuk menambah baik model bacaan al-Quran percuma. Mematikan perkongsian akan menghentikan muat naik serta-merta, dan anda boleh memadamkan semua yang telah dikongsi melalui tetapan pada bila-bila masa: ia akan dipadamkan daripada pelayan Quran Lab serta-merta.`,
                "delete.confirm": `Rakaman bacaan yang anda kongsi akan dipadamkan daripada pelayan Quran Lab serta-merta. Tindakan ini tidak boleh dibatalkan.`,
                "delete.action": `Padam`,
                "delete.cancel": `Batal`,
                "delete.done": `Selesai. Apa yang anda kongsikan telah dipadamkan daripada pelayan Quran Lab. Salinan yang sudah digunakan untuk melatih model tidak akan disertakan dalam latihan akan datang.`,
                "delete.failed.title": `Tidak dapat memadam`,
                "delete.failed.network": `Kami tidak dapat menghubungi Quran Lab. Tiada apa-apa yang dipadamkan. Semak sambungan internet anda dan cuba lagi.`,
                "delete.retry": `Cuba lagi`,
                "recovery.hint": `Simpan kod sekali guna ini untuk memadamkan apa yang telah anda kongsi sekiranya anda kehilangan peranti ini: portal.quranlab.ai/delete`,
                "recovery.reveal": `Tunjukkan kod pemulihan saya`,
                "recovery.copy": `Salin`,
                "recovery.copied": `Disalin`,
                "recovery.keep": `Simpan kod ini dengan selamat. Ini satu-satunya cara untuk memadam apa yang anda kongsikan daripada peranti lain, dan ia hanya boleh digunakan sekali.`,
                "recovery.used": `Kod pemulihan ini sudah digunakan.`,
                "recovery.invalid": `Kod ini tidak sah. Semak perkataan dan cuba lagi.`,
                reask: `Bacaan anda hari ini mungkin dapat membantu pembelajar lain esok. Sudikah anda berkongsinya?`,
                "impact.minutes": {
                    other: `Anda telah berkongsi {minutes} minit bacaan. Semoga Allah membalas kebaikan anda.`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: null,
                translated: !0,
                verified_at: `2026-11-07`,
                note: `no established translation of this hadith found online in this language (HadeethEnc has none for 65566); translated by the router from the verified English and back-translated: When a person dies, their deeds are cut off except for three things: continuous charity, beneficial knowledge, or a righteous child who prays for them.`
            }
        },
        tr: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `tr`,
            dir: `ltr`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `Tilavetiniz hayra vesile olmaya devam etsin`,
                "sheet.body": `Okumalarınızı paylaştığınızda, bu uygulamanın ücretsiz tecvid modelinin daha iyi dinlemeyi öğrenmesine yardımcı olursunuz. Sizden sonra istifade eden her bir öğrenci, okumanız bittikten çok sonra da devam edebilecek bir hayır olabilir, inşallah: bir sadaka-i câriye.`,
                "sheet.hadith": `Peygamberimiz (aleyhisselam) şöyle buyurmuştur: «Bir insan öldüğü zaman, üç ameli dışında bütün amellerinin sevabı kesilir: Sadaka-i câriye, kendisinden faydalanılan ilim ve kendisine dua eden salih evlat.»`,
                "sheet.hadith_ref": `Sahih Müslim 1631`,
                "sheet.mistakes": `Hatalarınız işin en kıymetli kısmıdır. Modele, bir sonraki talebeyi incitmeden, nazikçe düzeltmeyi öğretirler.`,
                "sheet.what": `Uygulama dinlerken yapılan tilavet kayıtlarınız ile model sürümü ve cihaz türü gibi temel teknik detaylar. İsim, rehber veya konum asla paylaşılmaz.`,
                "sheet.who": `Quran Lab bir vakıftır. Geliştirdiği modeller herkes için daima ücretsizdir ve asla satılmaz.`,
                "sheet.control": `Dilediğiniz an paylaşımı durdurabilir ve paylaştıklarınızı ayarlar bölümünden silebilirsiniz.`,
                "sheet.share": `Tilavetlerimi paylaş`,
                "sheet.not_now": `Şimdi değil`,
                "sheet.guardian.title": `Anne, baba veya vasiler için bir soru`,
                "sheet.guardian.body": `Bu uygulama çocuklar için hazırlanmıştır. Lütfen burayı çocuğunuzla birlikte okuyun: Paylaşım açıldığında, diğer öğrencilere yardımcı olmak amacıyla okuma ses kayıtları Quran Lab'e iletilir. Bunu yalnızca bir ebeveyn veya vasi açabilir.`,
                "sheet.guardian.confirm": `Bu çocuğun anne babası veya vasisiyim, okuma kayıtlarının paylaşılmasını onaylıyorum.`,
                "sheet.guardian.share": `Veli olarak paylaş`,
                thanks: `Allah razı olsun. Tilavetiniz artık diğer öğrencilere de yardımcı oluyor. Allah kabul etsin.`,
                "settings.toggle": `Tilavetlerimi paylaş`,
                "settings.what": `Neler paylaşılır`,
                "settings.delete": `Paylaştıklarımı sil`,
                "what.detail": `Paylaşım açık olduğunda, bu uygulamadaki kıraat çalışmalarınızın ses kayıtları; temel teknik ayrıntılar (model sürümü, cihaz türü, sistem sürümü, gün) ve bu kuruluma özel rastgele bir kodla birlikte Quran Lab'e gönderilir. İsminiz, hesabınız, kişileriniz, konumunuz veya cihaz tanıtıcılarınız asla alınmaz. Veriler AB içinde saklanır ve sadece ücretsiz Kur'an kıraat modellerini geliştirmek için kullanılır. Paylaşımı kapattığınız anda yüklemeler durur ve paylaştığınız her şeyi ayarlardan dilediğiniz zaman silebilirsiniz: veriler Quran Lab sunucularından anında kaldırılır.`,
                "delete.confirm": `Paylaştığınız kıraat kayıtları Quran Lab sunucularından anında silinecektir. Bu işlem geri alınamaz.`,
                "delete.action": `Paylaşılanları sil`,
                "delete.cancel": `İptal et`,
                "delete.done": `Tamamlandı. Paylaştıklarınız Quran Lab sunucularından silindi. Bir modeli eğitmek için önceden kullanılmış kopyalar ise sonraki eğitimlere dahil edilmeyecektir.`,
                "delete.failed.title": `Silinemedi`,
                "delete.failed.network": `Quran Lab'e ulaşılamadı. Hiçbir şey silinmedi. Bağlantınızı kontrol edip tekrar deneyin.`,
                "delete.retry": `Tekrar deneyin`,
                "recovery.hint": `Cihazınızı kaybetmeniz durumunda paylaştıklarınızı silebilmek için bu tek kullanımlık kodu saklayın: portal.quranlab.ai/delete`,
                "recovery.reveal": `Kurtarma kodumu göster`,
                "recovery.copy": `Kopyala`,
                "recovery.copied": `Kopyalandı`,
                "recovery.keep": `Bu kodu güvenli bir yerde saklayın. Paylaştıklarınızı başka bir cihazdan silmenin tek yolu budur ve yalnızca bir kez kullanılabilir.`,
                "recovery.used": `Bu kurtarma kodu daha önce kullanıldı.`,
                "recovery.invalid": `Bu kod geçerli değil. Kelimeleri kontrol edip tekrar deneyin.`,
                reask: `Bugünkü tilavetiniz yarın bir başka öğrenciye yardımcı olabilir. Paylaşmak ister misiniz?`,
                "impact.minutes": {
                    one: `{minutes} dakika tilavet paylaştınız. Allah razı olsun.`,
                    other: `{minutes} dakika tilavet paylaştınız. Allah razı olsun.`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: `https://hadeethenc.com/tr/browse/hadith/65566`,
                translated: !1,
                verified_at: `2026-11-07`,
                note: `established translation published by HadeethEnc`
            }
        },
        ur: {
            format: `quranlab.sharing-copy/1`,
            version: `2026-11-13.1`,
            lang: `ur`,
            dir: `rtl`,
            consent_version: `share-2026-11-09`,
            delete_days: 0,
            delete_timing: `immediate`,
            strings: {
                "sheet.title": `اپنی تلاوت سے خیر کا سلسلہ جاری رکھیے`,
                "sheet.body": `جب آپ اپنی تلاوت شیئر کرتے ہیں تو اس سے اس ایپ کے مفت تجوید ماڈل کو بہتر طور پر سننے میں مدد ملتی ہے۔ آپ کے بعد جس بھی سیکھنے والے کی اس سے مدد ہوگی، وہ ان شاء اللہ آپ کی تلاوت مکمل ہو جانے کے بعد بھی ایک مسلسل نیکی بن سکتی ہے: صدقہ جاریہ۔`,
                "sheet.hadith": `نبی کریم صلی اللہ علیہ وسلم نے فرمایا: «جب انسان مر جاتا ہے تو اس کا عمل بھی منقطع ہو جاتا ہے، مگر تین قسم کے عمل (کا ثواب) جاری رہتا ہے۔ صدقۂ جاریہ، یا ایسا علم جس سے اس کے بعد بھی فائدہ اٹھایا جائے، یا نیک اولاد جو اس کے لیے دعا کرے۔»`,
                "sheet.hadith_ref": `صحیح مسلم 1631`,
                "sheet.mistakes": `آپ کی غلطیاں سب سے زیادہ قیمتی ہیں۔ ان سے ماڈل سیکھتا ہے کہ اگلے سیکھنے والے کی نرمی سے کیسے اصلاح کی جائے۔`,
                "sheet.what": `اس ایپ میں آپ کی تلاوت کی آڈیو جب ایپ سن رہی ہو، اور بنیادی تکنیکی تفصیلات جیسے ماڈل کا ورژن اور ڈیوائس کی قسم۔ کوئی نام، رابطے یا لوکیشن شامل نہیں۔`,
                "sheet.who": `Quran Lab، جو کہ ایک وقف ہے۔ اس کے تیار کردہ ماڈلز ہمیشہ سب کے لیے مفت رہیں گے اور کبھی بیچے نہیں جائیں گے۔`,
                "sheet.control": `آپ کسی بھی وقت اسے روک سکتے ہیں اور سیٹنگز سے اپنا شیئر کردہ ڈیٹا ڈیلیٹ کر سکتے ہیں۔`,
                "sheet.share": `میری تلاوتیں شیئر کریں`,
                "sheet.not_now": `ابھی نہیں`,
                "sheet.guardian.title": `والدین یا سرپرست کے لیے ایک سوال`,
                "sheet.guardian.body": `یہ ایپ بچوں کے لیے بنائی گئی ہے۔ براہِ کرم اپنے بچے کے ساتھ اسے پڑھیں: شیئر کرنے سے ان کی تلاوت کی آڈیو Quran Lab کو بھیجی جائے گی تاکہ دوسرے سیکھنے والوں کی مدد ہو سکے۔ اسے صرف والدین یا سرپرست ہی فعال کر سکتے ہیں۔`,
                "sheet.guardian.confirm": `میں اس بچے کا والد، والدہ یا سرپرست ہوں اور تلاوت شیئر کرنے پر رضامند ہوں۔`,
                "sheet.guardian.share": `بطور سرپرست شیئر کریں`,
                thanks: `جزاکم اللہ خیراً۔ آپ کی تلاوت سے اب دیگر سیکھنے والوں کو مدد مل رہی ہے۔ اللہ تعالیٰ آپ سے قبول فرمائے۔`,
                "settings.toggle": `میری تلاوتیں شیئر کریں`,
                "settings.what": `کیا شیئر کیا جاتا ہے`,
                "settings.delete": `شیئر کردہ مواد مٹائیں`,
                "what.detail": `جب شیئرنگ آن ہو، تو اس ایپ میں آپ کی تلاوت کی آڈیو Quran Lab کو بھیجی جاتی ہے، جس کے ساتھ کچھ بنیادی تکنیکی تفصیلات (ماڈل ورژن، ڈیوائس کی قسم، سسٹم ورژن اور دن) اور اس انسٹالیشن کا ایک بے ترتیب کوڈ شامل ہوتا ہے۔ آپ کا نام، اکاؤنٹ، رابطے، لوکیشن یا ڈیوائس کی ذاتی شناخت کبھی بھی شامل نہیں کی جاتی۔ یہ ڈیٹا EU میں محفوظ کیا جاتا ہے اور اسے صرف تلاوتِ قرآن کے مفت ماڈلز کو بہتر بنانے کے لیے استعمال کیا جاتا ہے۔ شیئرنگ بند کرنے سے اپ لوڈز فوراً رک جاتے ہیں، اور آپ سیٹنگز میں جا کر کسی بھی وقت اپنا شیئر کردہ تمام مواد ڈیلیٹ کر سکتے ہیں: اسے اسی وقت Quran Lab کے سرورز سے مٹا دیا جاتا ہے۔`,
                "delete.confirm": `آپ کی شیئر کردہ تلاوتیں فوراً Quran Lab کے سرورز سے ڈیلیٹ کر دی جائیں گی۔ اس عمل کو واپس نہیں لایا جا سکتا۔`,
                "delete.action": `ڈیلیٹ کریں`,
                "delete.cancel": `منسوخ کریں`,
                "delete.done": `مکمل ہو گیا۔ آپ کا شیئر کردہ مواد Quran Lab کے سرورز سے حذف کر دیا گیا ہے۔ جو کاپیاں ماڈل کی ٹریننگ کے لیے پہلے استعمال ہو چکی ہیں، انہیں آئندہ کی ٹریننگ میں شامل نہیں کیا جائے گا۔`,
                "delete.failed.title": `حذف نہیں ہو سکا`,
                "delete.failed.network": `Quran Lab سے رابطہ نہیں ہو سکا۔ کچھ بھی حذف نہیں ہوا۔ اپنا انٹرنیٹ کنکشن چیک کریں اور دوبارہ کوشش کریں۔`,
                "delete.retry": `دوبارہ کوشش کریں`,
                "recovery.hint": `اگر آپ کی یہ ڈیوائس گم ہو جائے، تو اپنا شیئر کردہ مواد ڈیلیٹ کرنے کے لیے یہ یک وقتی کوڈ اپنے پاس محفوظ رکھیں: portal.quranlab.ai/delete`,
                "recovery.reveal": `ریکوری کوڈ دکھائیں`,
                "recovery.copy": `کاپی کریں`,
                "recovery.copied": `کاپی ہو گیا`,
                "recovery.keep": `اس کوڈ کو محفوظ رکھیں۔ کسی اور ڈیوائس سے اپنا شیئر کردہ مواد حذف کرنے کا یہ واحد طریقہ ہے، اور یہ صرف ایک بار استعمال ہو سکتا ہے۔`,
                "recovery.used": `یہ ریکوری کوڈ پہلے ہی استعمال ہو چکا ہے۔`,
                "recovery.invalid": `یہ کوڈ درست نہیں ہے۔ الفاظ چیک کر کے دوبارہ کوشش کریں۔`,
                reask: `آج آپ کی تلاوت سے کل کسی اور سیکھنے والے کی مدد ہو سکتی ہے۔ کیا آپ اسے شیئر کرنا چاہیں گے؟`,
                "impact.minutes": {
                    one: `آپ نے تلاوت کا {minutes} منٹ شیئر کیا ہے۔ اللہ تعالیٰ آپ کو جزائے خیر عطا فرمائے۔`,
                    other: `آپ نے تلاوت کے {minutes} منٹ شیئر کیے ہیں۔ اللہ تعالیٰ آپ کو جزائے خیر عطا فرمائے۔`
                }
            },
            hadith_source: {
                collection: `Sahih Muslim`,
                number: 1631,
                url: `https://sunnah.com/muslim:1631`,
                translation_source: `https://hadeethenc.com/ur/browse/hadith/65566`,
                translated: !1,
                verified_at: `2026-11-07`,
                note: `established translation published by HadeethEnc`
            }
        }
    };

var la = new Map;

ca.en;

function ua(e = `en`, t = null) {
    let n = String(e || `en`),
        r = n.toLowerCase().split(/[-_]/)[0],
        i = la.get(n) || la.get(r) || ca[r] || ca.en,
        a = t || {},
        o = e => typeof e == `string` ? e.replace(/\{days\}/g, String(i.delete_days ?? 0)) : e,
        s = e => {
            if (typeof a[e] == `string`) return a[e];
            let t = i.strings[e] === void 0 ? ca.en.strings[e] : i.strings[e];
            return o(t)
        };
    return {
        lang: i.lang,
        dir: i.dir || `ltr`,
        version: i.version,
        consentVersion: i.consent_version,
        deleteDays: i.delete_days ?? 0,
        deleteTiming: i.delete_timing || (i.delete_days ? `delayed` : `immediate`),
        hadithSource: i.hadith_source || null,
        overridden: Object.keys(a),
        t: s,
        minutes: e => {
            let t = s(`impact.minutes`) || {},
                n = `other`;
            try {
                n = new Intl.PluralRules(i.lang).select(e)
            } catch {}
            let r = a[`impact.minutes.${n}`] ?? t[n] ?? a[`impact.minutes.other`] ?? t.other ?? ``,
                o = String(e);
            try {
                o = new Intl.NumberFormat(i.lang).format(e)
            } catch {}
            return r.replace(/\{minutes\}/g, o)
        }
    }
}

var da = `quranlab.consent-text/1`;

var fa = Object.freeze([`zero`, `one`, `two`, `few`, `many`, `other`]);

var pa = e => new TextEncoder().encode(e);

var ma = new Uint32Array([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]);

function ha(e) {
    let t = e.length,
        n = Math.ceil((t + 9) / 64),
        r = new Uint8Array(n * 64);
    r.set(e), r[t] = 128;
    let i = new DataView(r.buffer);
    i.setUint32(r.length - 8, Math.floor(t / 536870912), !1), i.setUint32(r.length - 4, t * 8 >>> 0, !1);
    let a = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]),
        o = new Uint32Array(64),
        s = (e, t) => e >>> t | e << 32 - t;
    for (let e = 0; e < n; e++) {
        for (let t = 0; t < 16; t++) o[t] = i.getUint32(e * 64 + t * 4, !1);
        for (let e = 16; e < 64; e++) {
            let t = s(o[e - 15], 7) ^ s(o[e - 15], 18) ^ o[e - 15] >>> 3,
                n = s(o[e - 2], 17) ^ s(o[e - 2], 19) ^ o[e - 2] >>> 10;
            o[e] = o[e - 16] + t + o[e - 7] + n >>> 0
        }
        let [t, n, r, c, l, u, d, f] = a;
        for (let e = 0; e < 64; e++) {
            let i = f + (s(l, 6) ^ s(l, 11) ^ s(l, 25)) + (l & u ^ ~l & d) + ma[e] + o[e] >>> 0,
                a = (s(t, 2) ^ s(t, 13) ^ s(t, 22)) + (t & n ^ t & r ^ n & r) >>> 0;
            f = d, d = u, u = l, l = c + i >>> 0, c = r, r = n, n = t, t = i + a >>> 0
        }
        a[0] += t, a[1] += n, a[2] += r, a[3] += c, a[4] += l, a[5] += u, a[6] += d, a[7] += f
    }
    return [...a].map(e => e.toString(16).padStart(8, `0`)).join(``)
}

function ga() {
    let e = new Set;
    for (let t of Object.values(ca))
        for (let [n, r] of Object.entries(t.strings))
            if (typeof r == `string`) e.add(n);
            else if (r && typeof r == `object`)
        for (let t of fa) e.add(`${n}.${t}`);
    return e
}

var _a = (e, t) => {
        let n = pa(e),
            r = pa(t);
        for (let e = 0; e < Math.min(n.length, r.length); e++)
            if (n[e] !== r[e]) return n[e] - r[e];
        return n.length - r.length
    };

var va = e => e.replace(/\\/g, `\\\\`).replace(/\n/g, `\\n`).replace(/\r/g, `\\r`).replace(/\t/g, `\\t`);

function ya(e) {
    if (e == null) return Object.freeze({});
    if (typeof e != `object` || Array.isArray(e)) throw TypeError(`wording: an object of {key: text}`);
    let t = ga(),
        n = {};
    for (let [r, i] of Object.entries(e)) {
        if (!t.has(r)) throw TypeError(`wording: unknown key ${JSON.stringify(r)}`);
        if (typeof i != `string`) throw TypeError(`wording: ${r} is not a string`);
        if (!i.length) throw TypeError(`wording: ${r} is empty`);
        if (/^\s*$/u.test(i)) throw TypeError(`wording: ${r} is blank`);
        n[r] = i
    }
    return Object.freeze(n)
}

function ba(e, t) {
    let n = Object.keys(t || {});
    if (!n.length) return null;
    let r = `${da}\nbase ${e}\n`;
    for (let e of n.sort(_a)) r += `${e}\t${va(t[e])}\n`;
    return r
}

function xa(e, t) {
    let n = ba(e, t);
    if (n === null) return Object.freeze({
        version: e,
        textSha256: null,
        canonicalText: null
    });
    let r = ha(pa(n));
    return Object.freeze({
        version: `custom-${r.slice(0,24)}`,
        textSha256: r,
        canonicalText: n
    })
}

var Sa = Object.freeze({
    accent: `--ql-accent`,
    accentText: `--ql-accent-fg`,
    background: `--ql-bg`,
    text: `--ql-fg`,
    secondaryText: `--ql-muted`,
    cornerRadius: `--ql-radius`,
    titleFont: `--ql-title-font`,
    bodyFont: `--ql-font`
});

function Ca(e) {
    if (e == null) return {};
    if (typeof e != `object` || Array.isArray(e)) throw TypeError(`theme: an object`);
    let t = {};
    for (let [n, r] of Object.entries(e)) {
        if (!(n in Sa)) throw TypeError(`theme: unknown key ${n} (${Object.keys(Sa).join(`, `)})`);
        if (r != null && r !== ``) {
            if (n === `cornerRadius` && typeof r == `number`) {
                t[Sa[n]] = `${r}px`;
                continue
            }
            if (typeof r != `string` || /[;{}<>]/.test(r)) throw TypeError(`theme: ${n} must be a CSS value`);
            t[Sa[n]] = r
        }
    }
    return t
}

function wa(e, t) {
    for (let [n, r] of Object.entries(Ca(t))) e.style.setProperty(n, r);
    return e
}

var Ta = `quranlab-sharing-keys-v1`;

var Ea = {
        name: `ECDSA`,
        namedCurve: `P-256`
    };

var Da = {
        name: `ECDSA`,
        hash: `SHA-256`
    };

function Oa() {
    return globalThis.indexedDB ? new Promise((e, t) => {
        let n = globalThis.indexedDB.open(Ta, 1);
        n.onupgradeneeded = () => n.result.createObjectStore(`keys`), n.onsuccess = () => e(n.result), n.onerror = () => t(n.error)
    }) : null
}

async function ka(e, t) {
    let n = await Oa();
    if (n) return new Promise((r, i) => {
        let a = n.transaction(`keys`, e),
            o = t(a.objectStore(`keys`));
        a.oncomplete = () => r(o && `result` in o ? o.result : void 0), a.onerror = () => i(a.error)
    })
}

var Aa = new Map;

async function ja(e, {
    create: t = !0
} = {}) {
    let n = Aa.get(e) || await ka(`readonly`, t => t.get(e)).catch(() => void 0);
    if (!n) {
        if (!t) return null;
        n = await globalThis.crypto.subtle.generateKey(Ea, !1, [`sign`, `verify`]), Aa.set(e, n), await ka(`readwrite`, t => t.put(n, e)).catch(() => {})
    }
    let r = globalThis.crypto.subtle,
        i = new Uint8Array(await r.exportKey(`raw`, n.publicKey)),
        a = new Uint8Array(await r.exportKey(`spki`, n.publicKey));
    return {
        contributor: e,
        extractable: n.privateKey.extractable,
        publicKeyRaw: i,
        publicKeySpki: a,
        async sign(e) {
            return new Uint8Array(await r.sign(Da, n.privateKey, e))
        }
    }
}

async function Ma(e) {
    Aa.delete(e), await ka(`readwrite`, t => t.delete(e)).catch(() => {})
}

var Na = `0123456789ABCDEFGHJKMNPQRSTVWXYZ`;

function Pa(e) {
    if (e.length !== 16) throw RangeError(`a recovery code is 16 bytes`);
    let t = 0,
        n = 0,
        r = ``;
    for (let i of e) {
        for (n = n << 8 | i, t += 8; t >= 5;) t -= 5, r += Na[n >> t & 31];
        n &= (1 << t) - 1
    }
    return t && (r += Na[n << 5 - t & 31]), r.match(/.{1,4}/g).join(`-`)
}

function Fa(e) {
    return String(e).toUpperCase().replace(/[\s-]/g, ``).replace(/O/g, `0`).replace(/[IL]/g, `1`)
}

async function Ia(e) {
    let t = await globalThis.crypto.subtle.digest(`SHA-256`, new TextEncoder().encode(Fa(e)));
    return Array.from(new Uint8Array(t), e => e.toString(16).padStart(2, `0`)).join(``)
}

function La() {
    let e = new Uint8Array(16);
    return globalThis.crypto.getRandomValues(e), Pa(e)
}

function Ra({
    app: e,
    contributor: t,
    nonce: n,
    timestamp: r
}) {
    return new TextEncoder().encode(`quranlab-contribution-delete 1\napp ${e}\ncontributor ${t}\nnonce ${n}\ntimestamp ${r}\naction delete-all\n`)
}

function za(e) {
    let t = ``;
    for (let n of e) t += String.fromCharCode(n);
    return btoa(t).replace(/\+/g, `-`).replace(/\//g, `_`).replace(/=+$/, ``)
}

var Ba = t({
        QuranLabConsent: () => yo,
        QuranLabSharingSettings: () => bo,
        SHEET_NAME: () => Va,
        contrastBar: () => ho,
        contrastRatio: () => uo,
        paintColors: () => _o
    });

var Va = `Quran Lab`;

var Ha = `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Naskh Arabic", "Helvetica Neue", Arial, sans-serif`;

var Ua = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

var Wa = {
        bg: `#FFFFFF`,
        text: `#17171A`,
        body: `#3D3D44`,
        secondary: `#62626B`,
        card: `#F4F4F6`,
        divider: `#E4E4E9`,
        bar: `#ECECF0`,
        grabber: `#D4D4DA`,
        off: `#C4C4CB`,
        accent: `#0E6B58`,
        onAccent: `#FFFFFF`,
        tint: 11,
        soft: 6
    };

var Ga = {
        bg: `#1C1C1E`,
        text: `#F4F4F6`,
        body: `#D2D2D8`,
        secondary: `#A7A7B0`,
        card: `#2A2A2D`,
        divider: `#3B3B40`,
        bar: `#2E2E32`,
        grabber: `#48484D`,
        off: `#5A5A60`,
        accent: `#62D2B6`,
        onAccent: `#0B0B0C`,
        tint: 16,
        soft: 8
    };

var Ka = {
        light: {
            card: .045,
            divider: .115,
            bar: .08,
            grabber: .185,
            off: .25
        },
        dark: {
            card: .065,
            divider: .145,
            bar: .08,
            grabber: .2,
            off: .3
        }
    };

var qa = e => `
  --_bg: var(--ql-bg, ${e.bg}); --_text: var(--ql-fg, ${e.text}); --_body: var(--ql-fg, ${e.body});
  --_secondary: var(--ql-muted, ${e.secondary}); --_card: ${e.card}; --_divider: ${e.divider}; --_bar-divider: ${e.bar};
  --_grabber: ${e.grabber}; --_switch-off: ${e.off}; --_accent: var(--ql-accent, ${e.accent});
  --_on-accent: var(--ql-accent-fg, ${e.onAccent});
  --_tint: color-mix(in srgb, var(--_accent) ${e.tint}%, var(--_bg));
  --_tint-soft: color-mix(in srgb, var(--_accent) ${e.soft}%, var(--_bg));
  --_on-tint: var(--_accent); --_icon: var(--_accent);`;

var Ja = (e, t = `1.8`) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='${t}' stroke-linecap='round' stroke-linejoin='round'>${e}</svg>`)}")`;

var Ya = Ja(`<rect x='9' y='3' width='6' height='11' rx='3'/><path d='M5.5 11.5a6.5 6.5 0 0 0 13 0'/><path d='M12 18v3'/>`);

var Xa = Ja(`<path d='M12 3l7 3v5.5c0 4.3-2.9 7.6-7 9.5-4.1-1.9-7-5.2-7-9.5V6l7-3z'/><path d='M9 12l2.2 2.2L15.2 10'/>`);

var Za = Ja(`<rect x='2.5' y='7' width='19' height='10' rx='5'/><circle cx='16.5' cy='12' r='2.4'/>`);

var Qa = Ja(`<rect x='2.5' y='7' width='19' height='10' rx='5'/><circle cx='7.5' cy='12' r='2.4'/>`);

var $a = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" focusable="false"><path d="M4 10v4"/><path d="M8 7v10"/><path d="M12 4v16"/><path d="M16 7v10"/><path d="M20 10v4"/></svg>`;

var z = e => `calc(${e}em / 16)`;

var eo = `
.switch { appearance: none; -webkit-appearance: none; flex: none; box-sizing: border-box; margin: 0; inline-size: 50px;
  block-size: 30px; border: 1px solid transparent; border-radius: 15px; cursor: pointer; vertical-align: middle;
  background: radial-gradient(circle 13px at 14px 50%, #FFFFFF 0 10.5px, rgb(0 0 0 / .18) 11.5px, transparent 13px) no-repeat, var(--_switch-off); }
.switch:checked { background: radial-gradient(circle 13px at calc(100% - 14px) 50%, #FFFFFF 0 10.5px, rgb(0 0 0 / .18) 11.5px, transparent 13px) no-repeat, var(--_accent); }
[dir="rtl"] .switch { background: radial-gradient(circle 13px at calc(100% - 14px) 50%, #FFFFFF 0 10.5px, rgb(0 0 0 / .18) 11.5px, transparent 13px) no-repeat, var(--_switch-off); }
[dir="rtl"] .switch:checked { background: radial-gradient(circle 13px at 14px 50%, #FFFFFF 0 10.5px, rgb(0 0 0 / .18) 11.5px, transparent 13px) no-repeat, var(--_accent); }
.switch:focus-visible { outline: 3px solid var(--_on-tint); outline-offset: 2px; }
@media (forced-colors: active) { .switch { appearance: auto; -webkit-appearance: auto; inline-size: 22px; block-size: 22px; } }`;

var to = `
:host { all: initial !important; }
*, *::before, *::after { box-sizing: border-box; }
p, h2, ul, li, figure { margin: 0; padding: 0; }`;

var no = `${to}
dialog { ${qa(Wa)}
  position: fixed; inset: auto 0 0 0; margin: 0; padding: 0; border: 0; outline: 1px solid transparent;
  inline-size: 100%; max-inline-size: 100%; block-size: auto; max-block-size: calc(100% - 24px);
  max-block-size: calc(100dvh - 24px - env(safe-area-inset-top, 0px));
  overflow: hidden; overscroll-behavior: contain; border-radius: var(--_r) var(--_r) 0 0;
  background: var(--_bg); color: var(--_text); box-shadow: 0 -10px 40px rgb(0 0 0 / .16);
  --_r: var(--ql-radius, 28px); --_font: var(--ql-font, ${Ha});
  font: 400 medium/normal var(--_font); letter-spacing: normal; word-spacing: normal; text-transform: none;
  text-align: start; text-indent: 0; text-shadow: none; white-space: normal; font-style: normal; visibility: visible;
  color-scheme: light; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
dialog[open] { display: flex; flex-direction: column; }
dialog::backdrop { background: rgb(0 0 0 / .45); }
@media (prefers-color-scheme: dark) { dialog { ${qa(Ga)} color-scheme: dark; box-shadow: 0 -10px 40px rgb(0 0 0 / .5); } }

/* the grabber's band: the scrolling column begins below it, so nothing of the column is drawn in it */
.band { flex: none; padding-block: 8px; background: var(--_bg); }
.grab { inline-size: 36px; block-size: 5px; border-radius: 3px; margin: 0 auto; background: var(--_grabber); }
.wrap, .bar { font-family: var(--_font); font-size: medium; font-weight: 400; line-height: normal; font-style: normal;
  letter-spacing: normal; text-transform: none; color: var(--_text); visibility: visible; }
.wrap { position: relative; flex: 1 1 auto; min-block-size: 0; display: flex; flex-direction: column; }
.scroll { flex: 1 1 auto; min-block-size: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: thin; scrollbar-color: var(--_grabber) transparent; }
.fade { position: absolute; inset-inline-start: 0; inset-inline-end: var(--_sbw, 0px); pointer-events: none; }
.fade.b { inset-block-end: 0; block-size: 40px; background: linear-gradient(to bottom, transparent, var(--_bg)); }
.fade.t { inset-block-start: 0; block-size: 28px; background: linear-gradient(to top, transparent, var(--_bg)); opacity: 0; }
.wrap.at-end .fade.b { opacity: 0; }
.wrap.scrolled .fade.t { opacity: 1; }

/* 12 below the band's 8: the header stays 20 below the grabber, as drawn */
.col { display: flex; flex-direction: column; gap: 18px; padding: 12px 24px 22px; }
.top { display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; align-items: center; gap: 10px; }
.emblem { flex: none; display: flex; align-items: center; justify-content: center; inline-size: 40px; block-size: 40px;
  border-radius: calc(var(--_r) * 12 / 28); background: var(--_tint); color: var(--_on-tint); }
.emblem svg { display: block; inline-size: 22px; block-size: 22px; }
.name { display: inline-block; direction: ltr; unicode-bidi: isolate; font-family: ${Ua}; font-size: ${z(15)};
  line-height: calc(20 / 15); font-weight: 600; font-style: normal; letter-spacing: -0.01em; text-transform: none;
  white-space: nowrap; color: var(--_text); opacity: 1; visibility: visible; outline: none; }
h2 { font-family: var(--ql-title-font, var(--_font)); font-size: ${z(26)}; line-height: calc(31 / 26); font-weight: 700;
  letter-spacing: 0; color: var(--_text); outline: none; }
#b { display: flex; flex-direction: column; gap: 18px; }
.body { font-size: ${z(15.5)}; line-height: calc(24 / 15.5); font-weight: 400; color: var(--_body); }
.card { list-style: none; padding: 2px 16px; background: var(--_card); border-radius: calc(var(--_r) * 18 / 28); }
.card li { position: relative; padding-block: 14px; padding-inline-start: 34px; font-size: ${z(14.5)}; line-height: calc(22 / 14.5);
  font-weight: 400; color: var(--_text); }
.card li + li { border-block-start: 1px solid var(--_divider); }
.card li::before { content: ""; position: absolute; inset-inline-start: 0; inset-block-start: 14px; inline-size: 22px;
  block-size: 22px; block-size: 1lh; background-color: var(--_icon);
  -webkit-mask: ${Ya} center / 22px 22px no-repeat; mask: ${Ya} center / 22px 22px no-repeat; }
.card li:nth-child(2)::before { -webkit-mask-image: ${Xa}; mask-image: ${Xa}; }
.card li:nth-child(3)::before { -webkit-mask-image: ${Za}; mask-image: ${Za}; }
[dir="rtl"] .card li:nth-child(3)::before { -webkit-mask-image: ${Qa}; mask-image: ${Qa}; }
.hadith { display: flex; flex-direction: column; gap: 10px; padding: 16px; background: var(--_tint-soft);
  border-radius: calc(var(--_r) * 18 / 28); }
.hadith .hq { font-size: ${z(15)}; line-height: calc(24 / 15); font-weight: 400; color: var(--_text); }
.hadith .ref { font-size: ${z(12)}; line-height: calc(16 / 12); font-weight: 600; color: var(--_secondary); }
.mistakes { font-size: ${z(15)}; line-height: calc(24 / 15); font-weight: 400; color: var(--_body); }
.guardian { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--_card);
  border-radius: calc(var(--_r) * 18 / 28); cursor: pointer; }
.guardian span { flex: 1 1 auto; min-inline-size: 0; font-size: ${z(14.5)}; line-height: calc(22 / 14.5); font-weight: 400; color: var(--_text); }
${eo}

dialog[data-script="latin"] h2 { letter-spacing: -0.02em; }
dialog[data-script="latin"] .hadith .ref { text-transform: uppercase; letter-spacing: 0.06em; }
dialog[data-script="arabic"] h2 { line-height: calc(36 / 26); }
dialog[data-script="arabic"] .body { line-height: calc(27 / 15.5); }
dialog[data-script="arabic"] .mistakes { line-height: calc(27 / 15); }
dialog[data-script="arabic"] .card li, dialog[data-script="arabic"] .guardian span { line-height: calc(25 / 14.5); }
dialog[data-script="arabic"] .hadith .hq { line-height: calc(28 / 15); }

.bar { flex: none; display: grid; grid-template-columns: minmax(0, 1fr); grid-auto-rows: 1fr; gap: 10px;
  padding: 12px 24px max(30px, env(safe-area-inset-bottom, 0px)); border-block-start: 1px solid var(--_bar-divider);
  background: var(--_bg); }
button { appearance: none; -webkit-appearance: none; display: block; inline-size: 100%; min-block-size: 52px; margin: 0;
  padding: 15px 16px; border: 1px solid transparent; border-radius: calc(var(--_r) * 14 / 28); cursor: pointer;
  font-family: var(--_font); font-size: 1em; line-height: calc(20 / 16); font-weight: 600; font-style: normal;
  letter-spacing: normal; text-transform: none; text-align: center; white-space: normal; overflow-wrap: anywhere; }
button.primary { background-color: var(--_accent); color: var(--_on-accent); }
button.secondary { background-color: var(--_tint); color: var(--_on-tint); }
button:disabled { opacity: 0.45; cursor: not-allowed; }
button:focus-visible { outline: 3px solid var(--_on-tint); outline-offset: 2px; }
@media (hover: hover) { button:not(:disabled):hover { background-image: linear-gradient(rgb(0 0 0 / .06), rgb(0 0 0 / .06)); } }

@media (min-width: 600px) {
  dialog { inset: 0; margin: auto; inline-size: calc(100% - 32px); max-inline-size: 480px; block-size: fit-content;
    max-block-size: calc(100% - 48px); border-radius: var(--_r); box-shadow: 0 24px 64px rgb(0 0 0 / .28); }
  .band { display: none; }
  .col { padding-block-start: 28px; }
}
@media (prefers-reduced-motion: no-preference) {
  dialog[open] { animation: ql-up 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); }
  dialog[open]::backdrop { animation: ql-fade 0.28s ease-out; }
  .fade { transition: opacity 0.15s; }
  @media (min-width: 600px) { dialog[open] { animation-name: ql-pop; } }
}
@keyframes ql-up { from { transform: translateY(100%); } }
@keyframes ql-pop { from { opacity: 0; transform: scale(0.97); } }
@keyframes ql-fade { from { opacity: 0; } }
@media (forced-colors: active) { .card li::before { background-color: CanvasText; } }
`;

var ro = `${to}
:host { display: block !important; }
section { ${qa(Wa)}
  --_r: var(--ql-radius, 28px); --_font: var(--ql-font, ${Ha});
  display: block; padding: 4px 16px; border-radius: calc(var(--_r) * 18 / 28); background: var(--_bg); color: var(--_text);
  font: 400 medium/1.5 var(--_font); letter-spacing: normal; text-transform: none; text-align: start; font-style: normal;
  visibility: visible; color-scheme: light; }
@media (prefers-color-scheme: dark) { section { ${qa(Ga)} color-scheme: dark; } }
section > * + * { border-block-start: 1px solid var(--_divider); }
.row { display: flex; justify-content: space-between; align-items: center; gap: 16px; min-block-size: 44px; padding-block: 10px; }
.row label, summary { font-size: ${z(15.5)}; line-height: calc(24 / 15.5); font-weight: 400; color: var(--_text); }
details { padding-block: 12px; }
summary { cursor: pointer; min-block-size: 24px; }
summary:focus-visible { outline: 3px solid var(--_on-tint); outline-offset: 2px; border-radius: 4px; }
details p { margin-block-start: 8px; font-size: ${z(14.5)}; line-height: calc(22 / 14.5); font-weight: 400; color: var(--_body); }
.muted { font-size: ${z(14.5)}; line-height: calc(22 / 14.5); color: var(--_secondary); }
#msg:empty { display: none; }
.code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: ${z(14)}; line-height: 1.5;
  color: var(--_text); word-break: break-all; }
label.guardian { display: flex; gap: 12px; align-items: flex-start; padding-block: 12px; font-size: ${z(14.5)};
  line-height: calc(22 / 14.5); font-weight: 400; color: var(--_text); cursor: pointer; }
label.guardian input { flex: none; inline-size: 20px; block-size: 20px; margin: 1px 0 0; accent-color: var(--_accent); }
button { appearance: none; -webkit-appearance: none; min-block-size: 44px; margin: 0; padding: 11px 16px;
  border: 1px solid transparent; border-radius: calc(var(--_r) * 14 / 28); cursor: pointer; font-family: var(--_font);
  font-size: 1em; line-height: calc(20 / 16); font-weight: 600; letter-spacing: normal; text-transform: none;
  background-color: var(--_tint); color: var(--_on-tint); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--_on-tint); outline-offset: 2px; }
section[data-script="arabic"] .row label, section[data-script="arabic"] summary { line-height: calc(27 / 15.5); }
section[data-script="arabic"] details p, section[data-script="arabic"] .muted, section[data-script="arabic"] label.guardian { line-height: calc(25 / 14.5); }
${eo}
`;

var B = e => String(e).replace(/[&<>"']/g, e => ({
        "&": `&amp;`,
        "<": `&lt;`,
        ">": `&gt;`,
        '"': `&quot;`,
        "'": `&#39;`
    })[e]);

var io = /^(ar|ur|fa|ps|sd|ug|ckb|ks)$/;

var ao = /^(en|fr|id|ms|tr|de|es|it|nl|pt|sw|ha|so|uz|az|sq|bs|ca|cs|da|et|fi|fil|ga|gl|hr|hu|is|lt|lv|mt|nb|nn|no|pl|ro|sk|sl|sv|tl|vi|wo|yo|af|eu|cy)$/;

var oo = e => {
        let t = String(e || ``).toLowerCase().split(/[-_]/)[0];
        return io.test(t) ? `arabic` : ao.test(t) ? `latin` : `other`
    };

var so = [255, 255, 255, 1];

var co = e => {
        let t = e / 255;
        return t <= .04045 ? t / 12.92 : ((t + .055) / 1.055) ** 2.4
    };

var lo = e => .2126 * co(e[0]) + .7152 * co(e[1]) + .0722 * co(e[2]);

function uo(e, t) {
    let n = lo(e),
        r = lo(t);
    return (Math.max(n, r) + .05) / (Math.min(n, r) + .05)
}

var V = (e, t, n) => [0, 1, 2].map(r => e[r] * n + t[r] * (1 - n)).concat(1);

var fo = (e, t) => e[3] >= 1 ? e : V(e, t, e[3]);

var H = e => `#${e.slice(0,3).map(e=>Math.max(0,Math.min(255,Math.round(e))).toString(16).padStart(2,`0`)).join(``)}`;

function po(e, t) {
    let n = String(e || ``).trim();
    if (!n) return null;
    let r = /^#([0-9a-f]{3,8})$/i.exec(n);
    if (r && [3, 4, 6, 8].includes(r[1].length)) {
        let e = r[1].length <= 4 ? r[1].replace(/./g, e => e + e) : r[1];
        return [parseInt(e.slice(0, 2), 16), parseInt(e.slice(2, 4), 16), parseInt(e.slice(4, 6), 16), e.length === 8 ? parseInt(e.slice(6, 8), 16) / 255 : 1]
    }
    if (r = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?\s*\)$/i.exec(n), r) return [+r[1], +r[2], +r[3], r[4] === void 0 ? 1 : r[5] ? r[4] / 100 : +r[4]];
    try {
        let e = t.createElement(`canvas`);
        e.width = 1, e.height = 1;
        let r = e.getContext(`2d`, {
            willReadFrequently: !0
        });
        if (!r || (r.fillStyle = `#010203`, r.fillStyle = n, r.fillStyle === `#010203` && !/^#010203$/i.test(n))) return null;
        r.clearRect(0, 0, 1, 1), r.fillRect(0, 0, 1, 1);
        let i = r.getImageData(0, 0, 1, 1).data;
        return [i[0], i[1], i[2], i[3] / 255]
    } catch {
        return null
    }
}

var mo = [`--_tint`, `--_tint-soft`, `--_on-accent`, `--_on-tint`, `--_icon`, `--_card`, `--_divider`, `--_bar-divider`, `--_grabber`, `--_switch-off`];

function ho(e) {
    return e && e.matchMedia && e.matchMedia(`(prefers-contrast: more)`).matches ? 4.5 : 3
}

var go = (e, t) => uo(so, e) >= t ? `#FFFFFF` : `#0B0B0C`;

function _o(e) {
    let t = e && e.ownerDocument,
        n = t && t.defaultView;
    if (!n || typeof n.getComputedStyle != `function` || !e.style) return null;
    for (let t of mo) e.style.removeProperty(t);
    let r = !!(n.matchMedia && n.matchMedia(`(prefers-color-scheme: dark)`).matches),
        i = ho(n),
        a = r ? Ga : Wa,
        o = n.getComputedStyle(e),
        s = e => o.getPropertyValue(e).trim() !== ``,
        c = (e, n) => po(o.getPropertyValue(e), t) || po(n, t),
        l = fo(c(`--_bg`, a.bg), r ? [0, 0, 0, 1] : so),
        u = fo(c(`--_text`, a.text), l),
        d = fo(c(`--_accent`, a.accent), l),
        f = V(d, l, a.tint / 100),
        p = (t, n) => e.style.setProperty(t, n);
    n.CSS && typeof n.CSS.supports == `function` && n.CSS.supports(`color`, `color-mix(in srgb, red 50%, blue)`) || (p(`--_tint`, H(f)), p(`--_tint-soft`, H(V(d, l, a.soft / 100))));
    let m = po(a.card, t);
    if (s(`--ql-bg`) || s(`--ql-fg`)) {
        let e = Ka[r ? `dark` : `light`];
        m = V(u, l, e.card), p(`--_card`, H(m)), p(`--_divider`, H(V(u, l, e.divider))), p(`--_bar-divider`, H(V(u, l, e.bar))), p(`--_grabber`, H(V(u, l, e.grabber))), p(`--_switch-off`, H(V(u, l, e.off)))
    }
    let h = null;
    s(`--ql-accent-fg`) || (h = go(d, i), p(`--_on-accent`, h));
    let g = uo(d, f),
        _ = uo(d, m),
        v = g < i,
        y = _ < i;
    return v && p(`--_on-tint`, `var(--_text)`), y && p(`--_icon`, `var(--_text)`), {
        dark: r,
        bar: i,
        accent: H(d),
        tint: H(f),
        card: H(m),
        onAccent: h,
        accentOnTint: g,
        accentOnCard: _,
        fallback: v,
        iconFallback: y
    }
}

var vo = globalThis.HTMLElement || class {};

var yo = class extends vo {
        static ask(e = {}) {
            let t = document.createElement(`quranlab-consent`);
            return (e.parent || document.body).appendChild(t), t.show(e).finally(() => t.remove())
        }
        show({
            lang: e = globalThis.navigator && navigator.language || `en`,
            variant: t = `first`,
            guardian: n = !1,
            wording: r = null,
            theme: i = null
        } = {}) {
            let a = ua(e, r);
            wa(this, i);
            let o = a.t,
                s = this.shadowRoot || this.attachShadow({
                    mode: `open`
                }),
                c = [`sheet.what`, `sheet.who`, `sheet.control`].map(e => `<li>${B(o(e))}</li>`).join(``),
                l = !!(a.hadithSource && a.hadithSource.verified_at),
                u = o(`sheet.hadith`) && l ? `<div class="hadith"><p class="hq">${B(o(`sheet.hadith`))}</p><p class="ref">${B(o(`sheet.hadith_ref`))}</p></div>` : ``;
            s.innerHTML = `<style>${no}</style>
<dialog part="sheet" lang="${B(a.lang)}" dir="${B(a.dir)}" data-script="${oo(a.lang)}" aria-labelledby="t" aria-describedby="b">
  <div class="band" aria-hidden="true"><div class="grab"></div></div>
  <div class="wrap">
    <div class="scroll">
      <div class="col">
        <div class="top">
          <div class="head"><span class="emblem" aria-hidden="true">${$a}</span><span class="name" id="n" dir="ltr" tabindex="-1">${Va}</span></div>
          <h2 id="t" part="title" tabindex="-1">${B(o(n?`sheet.guardian.title`:`sheet.title`))}</h2>
        </div>
        <div id="b" part="body">
          ${t===`reask`?`<p class="body">${B(o(`reask`))}</p>`:``}
          ${n?`<p class="body" part="guardian">${B(o(`sheet.guardian.body`))}</p>`:`<p class="body">${B(o(`sheet.body`))}</p>`}
          <ul class="card">${c}</ul>
          ${u}
          ${n?``:`<p class="mistakes">${B(o(`sheet.mistakes`))}</p>`}
        </div>
        ${n?`<label class="guardian" for="g"><span>${B(o(`sheet.guardian.confirm`))}</span><input type="checkbox" role="switch" class="switch" id="g"></label>`:``}
      </div>
    </div>
    <div class="fade t" aria-hidden="true"></div>
    <div class="fade b" aria-hidden="true"></div>
  </div>
  <div class="bar">
    <button type="button" class="primary" part="primary" id="yes" ${n?`disabled`:``}>${B(o(n?`sheet.guardian.share`:`sheet.share`))}</button>
    <button type="button" class="secondary" part="secondary" id="no">${B(o(`sheet.not_now`))}</button>
  </div>
</dialog>`;
            let d = s.querySelector(`dialog`),
                f = s.querySelector(`#g`),
                p = s.querySelector(`#yes`);
            f && f.addEventListener(`change`, () => {
                p.disabled = !f.checked
            });
            let m = this._live(d);
            return new Promise(e => {
                let t = !1,
                    n = n => {
                        if (!t) {
                            t = !0, m && m.stop();
                            try {
                                d.close()
                            } catch {}
                            e({
                                yes: n,
                                guardianConfirmed: !!(f && f.checked)
                            })
                        }
                    };
                p.addEventListener(`click`, () => n(!0)), s.querySelector(`#no`).addEventListener(`click`, () => n(!1)), d.addEventListener(`close`, () => n(!1)), d.addEventListener(`cancel`, () => n(!1)), typeof d.showModal == `function` ? d.showModal() : d.setAttribute(`open`, ``), m && m.start(), s.querySelector(`#n`).focus()
            })
        }
        _live(e) {
            let t = this.ownerDocument && this.ownerDocument.defaultView;
            if (!t || typeof t.getComputedStyle != `function` || !e || typeof e.getBoundingClientRect != `function`) return null;
            let n = this.shadowRoot,
                r = n.querySelector(`.wrap`),
                i = n.querySelector(`.scroll`),
                a = n.querySelector(`.col`),
                o = () => {
                    let e = i.scrollHeight - i.clientHeight;
                    r.classList.toggle(`scrolled`, i.scrollTop > 1), r.classList.toggle(`at-end`, i.scrollTop >= e - 1), r.style.setProperty(`--_sbw`, `${Math.max(0,i.offsetWidth-i.clientWidth)}px`)
                },
                s = t.matchMedia ? [t.matchMedia(`(prefers-color-scheme: dark)`), t.matchMedia(`(prefers-contrast: more)`)] : [],
                c = () => {
                    this._colors = _o(e)
                },
                l = null;
            return {
                start() {
                    c(), o(), i.addEventListener(`scroll`, o, {
                        passive: !0
                    }), typeof t.ResizeObserver == `function` && (l = new t.ResizeObserver(o), l.observe(i), l.observe(a));
                    for (let e of s) e.addEventListener && e.addEventListener(`change`, c)
                },
                stop() {
                    i.removeEventListener(`scroll`, o), l && l.disconnect();
                    for (let e of s) e.removeEventListener && e.removeEventListener(`change`, c)
                }
            }
        }
        static thank({
            lang: e,
            parent: t,
            ms: n = 6e3,
            wording: r = null,
            theme: i = null
        } = {}) {
            let a = ua(e || globalThis.navigator && navigator.language || `en`, r),
                o = document.createElement(`div`);
            o.setAttribute(`role`, `status`), o.lang = a.lang, o.dir = a.dir, o.textContent = a.t(`thanks`);
            let s = document.defaultView || globalThis,
                c = !!(s.matchMedia && s.matchMedia(`(prefers-color-scheme: dark)`).matches),
                l = c ? Ga : Wa;
            o.style.cssText = `all:initial;display:block;box-sizing:border-box;position:fixed;inset-inline:16px;inset-block-end:max(16px, env(safe-area-inset-bottom, 0px));max-inline-size:480px;margin-inline:auto;padding:14px 18px;border-radius:calc(var(--ql-radius, 28px) * 14 / 28);background:var(--ql-accent, ${l.accent});color:var(--ql-accent-fg, ${l.onAccent});font:400 medium/1.5 var(--ql-font, ${Ha});letter-spacing:normal;text-transform:none;text-align:start;white-space:normal;visibility:visible;z-index:2147483647;box-shadow:0 10px 30px rgb(0 0 0 / .25)`, wa(o, i), (t || document.body).appendChild(o);
            try {
                let e = s.getComputedStyle(o);
                if (!e.getPropertyValue(`--ql-accent-fg`).trim()) {
                    let t = po(e.backgroundColor, document);
                    t && (o.style.color = go(fo(t, c ? [28, 28, 30, 1] : so), ho(s)))
                }
            } catch {}
            return setTimeout(() => o.remove(), n), o
        }
    };

var bo = class extends vo {
        set client(e) {
            this._client = e, this.controller = e && e._i ? e._i.ctl : null
        }
        get client() {
            return this._client || null
        }
        set controller(e) {
            this._c = e, this.render()
        }
        get controller() {
            return this._c
        }
        connectedCallback() {
            this.render()
        }
        render() {
            if (!this._c) return;
            let e = ua(this.getAttribute(`lang`) || this._c.lang, this._c.wording || null);
            wa(this, this._c.theme || null);
            let t = e.t,
                n = this.shadowRoot || this.attachShadow({
                    mode: `open`
                }),
                r = this._c.state.sharing,
                i = this._c.recoveryCode();
            n.innerHTML = `<style>${ro}</style>
<section lang="${B(e.lang)}" dir="${B(e.dir)}" data-script="${oo(e.lang)}">
  <div class="row"><label for="s">${B(t(`settings.toggle`))}</label>
    <input type="checkbox" role="switch" class="switch" id="s" ${r?`checked`:``} aria-checked="${r}"></div>
  ${this._c.state.guardianVariant?`<label class="guardian"><input type="checkbox" id="g"> <span>${B(t(`sheet.guardian.confirm`))}</span></label>`:``}
  <details><summary>${B(t(`settings.what`))}</summary><p>${B(t(`what.detail`))}</p></details>
  ${i?`<details id="rc"><summary>${B(t(`recovery.reveal`))}</summary><p class="code" id="code"></p><p class="muted">${B(t(`recovery.keep`))}</p><p class="muted">${B(t(`recovery.hint`))}</p></details>`:``}
  <div class="row"><button class="secondary" id="del">${B(t(`settings.delete`))}</button></div>
  <p class="muted" id="msg" role="status"></p>
</section>`;
            let a = n.querySelector(`section`);
            a && this.ownerDocument && typeof a.getBoundingClientRect == `function` && (this._colors = _o(a));
            let o = n.querySelector(`#rc`);
            o && o.addEventListener(`toggle`, () => {
                n.querySelector(`#code`).textContent = o.open ? this._c.recoveryCode() : ``
            });
            let s = n.querySelector(`#msg`);
            n.querySelector(`#s`).addEventListener(`change`, e => {
                let t = n.querySelector(`#g`);
                try {
                    this._c.setSharing(e.target.checked, {
                        guardianConfirmed: !!(t && t.checked)
                    })
                } catch {
                    e.target.checked = !1
                }
                this.render()
            }), n.querySelector(`#del`).addEventListener(`click`, async () => {
                if (!globalThis.confirm || globalThis.confirm(t(`delete.confirm`))) {
                    let e = await this._c.deleteShared().then(() => !0, () => !1);
                    s.textContent = t(e ? `delete.done` : `delete.failed.network`), e && this.render()
                }
            })
        }
    };

globalThis.customElements && !globalThis.customElements.get(`quranlab-consent`) && (globalThis.customElements.define(`quranlab-consent`, yo), globalThis.customElements.define(`quranlab-sharing-settings`, bo));

var xo = `modulepreload`;

var So = function(e) {
        return `/` + e
    };

var Co = {};

var U = function(e, t, n) {
        let r = Promise.resolve();
        if (t && t.length > 0) {
            let e = document.getElementsByTagName(`link`),
                i = document.querySelector(`meta[property=csp-nonce]`),
                a = i?.nonce || i?.getAttribute(`nonce`);

            function o(e) {
                return Promise.all(e.map(e => Promise.resolve(e).then(e => ({
                    status: `fulfilled`,
                    value: e
                }), e => ({
                    status: `rejected`,
                    reason: e
                }))))
            }

            function s(e) {
                return import.meta.resolve ? import.meta.resolve(e) : new URL(e, import.meta.url).href
            }
            r = o(t.map(t => {
                if (t = So(t, n), t = s(t), t in Co) return;
                Co[t] = !0;
                let r = t.endsWith(`.css`);
                for (let n = e.length - 1; n >= 0; n--) {
                    let i = e[n];
                    if (i.href === t && (!r || i.rel === `stylesheet`)) return
                }
                let i = document.createElement(`link`);
                if (i.rel = r ? `stylesheet` : xo, r || (i.as = `script`), i.crossOrigin = ``, i.href = t, a && i.setAttribute(`nonce`, a), document.head.appendChild(i), r) return new Promise((e, n) => {
                    i.addEventListener(`load`, e), i.addEventListener(`error`, () => n(Error(`Unable to preload CSS for ${t}`)))
                })
            }))
        }

        function i(e) {
            let t = new Event(`vite:preloadError`, {
                cancelable: !0
            });
            if (t.payload = e, window.dispatchEvent(t), !t.defaultPrevented) throw e
        }
        return r.then(t => {
            for (let e of t || []) e.status === `rejected` && i(e.reason);
            return e().catch(i)
        })
    };

function wo(e, t = {}) {
    let n = t.lang || globalThis.navigator && navigator.language || `en`,
        r = ya(t.wording),
        i = t.theme || null;
    Ca(i);
    let a = ua(n, r),
        o = xa(a.consentVersion, r),
        s = new sa(e.state, {
            enabled: () => e.sharingAllowed(),
            consentVersion: o.version,
            consentTextSha256: o.textSha256,
            audience: e.audience
        }),
        c = t => {
            try {
                e.telemetry && typeof e.telemetry.count == `function` && e.telemetry.count(t)
            } catch {}
        },
        l = null,
        u = {
            lang: n,
            state: s,
            get deck() {
                return a
            },
            get copy() {
                return a
            },
            get consent() {
                return o
            },
            get wording() {
                return r
            },
            get theme() {
                return i
            },
            setWording(e) {
                return r = ya(e), a = ua(n, r), o = xa(a.consentVersion, r), s.setConsent(o.version, o.textSha256), o
            },
            setTheme(e) {
                Ca(e), i = e || null
            },
            get pendingAsk() {
                return l
            },
            answer(e, {
                guardianConfirmed: t = !1
            } = {}) {
                let n = s.s.consent,
                    r = s.answer(!!e, {
                        guardianConfirmed: !!t
                    });
                return l = null, n !== `granted` && n !== `final` && c(e ? `share_yes` : `share_no`), r
            },
            async sessionCompleted({
                feedback: e = !0,
                now: d = !1
            } = {}) {
                let f = d ? s.askNow() : s.sessionCompleted({
                    feedback: e
                });
                if (!f) return null;
                let p = typeof t.ask == `function` ? t.ask : async e => {
                    let {
                        QuranLabConsent: t
                    } = await U(async () => {
                        let {
                            QuranLabConsent: e
                        } = await Promise.resolve().then(() => Ba);
                        return {
                            QuranLabConsent: e
                        }
                    }, void 0);
                    return t.ask({
                        lang: n,
                        variant: e.variant,
                        guardian: e.guardian,
                        wording: r,
                        theme: i
                    })
                };
                await new Promise(e => {
                    let n = () => !t.idle || t.idle() ? e() : setTimeout(n, 1e3);
                    n()
                });
                let m = {
                    ...f,
                    lang: n,
                    copy: a,
                    consentVersion: o.version
                };
                l = m, c(`share_asked`);
                let h = await p(m);
                return !h || typeof h.yes != `boolean` ? null : (l === m && u.answer(h.yes, {
                    guardianConfirmed: !!h.guardianConfirmed
                }), h)
            },
            askNow() {
                return u.sessionCompleted({
                    now: !0
                })
            },
            setSharing(e, t) {
                return s.setSharing(e, t), e ? (u.outbox && Promise.resolve(u.outbox.resume()).catch(() => {}), Promise.resolve()) : (u.outbox ? Promise.resolve(u.outbox.stop()).catch(() => {}) : Promise.resolve()).then(() => f()).catch(() => {}).then(() => s.flush())
            },
            async background() {
                u.outbox && u.outbox.background && await u.outbox.background()
            },
            async foreground() {
                u.outbox && u.outbox.foreground && await u.outbox.foreground()
            },
            async closeRecording() {
                u.outbox && u.outbox.closeRecording && await u.outbox.closeRecording()
            },
            async deleteShared() {
                u.outbox && u.outbox.hold && u.outbox.hold();
                let t = s.offUntilAnswered(),
                    n = () => {
                        t.refused(), u.outbox && s.sharing && Promise.resolve(u.outbox.resume()).catch(() => {})
                    },
                    r = e.contributor(),
                    i;
                try {
                    i = await ja(r, {
                        create: !1
                    })
                } catch (e) {
                    throw n(), e
                }
                if (!i) return n(), e.resetContributor(), {
                    deleted: 0,
                    objects: 0
                };
                u.outbox && u.outbox.pause && await u.outbox.pause();
                let a;
                try {
                    a = await To(e, i)
                } catch (e) {
                    throw n(), e
                }
                return t.accepted(), u.outbox && await Promise.resolve(u.outbox.stop()).catch(() => {}), await f().catch(() => {}), s.flush(), await Ma(r), e.resetContributor(), e.state.set(`sharing.recovery`, null), e.state.set(`sharing.install`, null), u.outbox && u.outbox.forgetInstall && u.outbox.forgetInstall().catch(() => {}), a
            },
            recoveryCode() {
                return e.state.get(`sharing.recovery`)
            },
            async rotateContributor() {
                await Ma(e.contributor()), e.resetContributor(), e.state.set(`sharing.recovery`, null)
            },
            async impactLine() {
                let t = await e.contributionSummary();
                return !t || !t.you || !t.you.minutes ? null : u.copy.minutes(Math.floor(t.you.minutes))
            }
        };
    e.sharing = u;
    let d = async () => {
        let t = async () => ({
            token: await e.token(),
            attested: !!(e._token && e._token.attested)
        });
        return t.invalidate = async () => {
            e._token = null, e.state.set(`token`, null)
        }, {
            api: e.apiUrl,
            fetch: e.fetch,
            tokenProvider: t,
            headers: e.origin ? {
                origin: e.origin
            } : {},
            flags: () => e.flags,
            enabled: () => s.sharing,
            epoch: () => s.changes,
            onIssue: (t, n) => e.reportIssue(t, n),
            install: {
                get: async () => e.state.get(`sharing.install`),
                set: t => e.state.set(`sharing.install`, t.seq || t.prevEnd !== null ? t : null)
            },
            ...e.sharingStorage ? {
                storage: e.sharingStorage
            } : {},
            ...e.sharingSeams || {}
        }
    }, f = async () => {
        let t = s.changes;
        if (t === (e.state.get(`sharing.swept`) || 0)) return;
        let n = await U(() => import(/* @vite-ignore */ sdkAssets.sharing), __vite__mapDeps([0, 1])),
            r = await n.outbox.configure(await d());
        u.outbox = n.outbox, await r.outbox.sweep() === 0 && s.changes === t && e.state.set(`sharing.swept`, t)
    };
    u.sweep = f, Promise.resolve().then(f).catch(() => {});
    let p = 0,
        m = 0;
    return u.feedWaiting = () => m, u.feed = (t, n) => {
        if (!(t instanceof Float32Array) || !(n >= 8e3 && n <= 192e3)) throw TypeError(`feed takes a Float32Array and its sample rate`);
        if (!s.sharing) {
            u.outbox && u.outbox.feed && u.outbox.feed(new Float32Array, n).catch(() => {});
            return
        }
        if (p > 0 || !t.length || t.length > 10 * n || m > 0 && m + t.length > 2 * n) return;
        let r = t.slice(),
            i = e.clock();
        m += r.length, U(() => import(/* @vite-ignore */ sdkAssets.sharing).then(async e => {
            let t = await e.outbox.configure(await d());
            u.outbox = e.outbox, s.sharing && t.feed(r, n, i)
        }), __vite__mapDeps([0, 1])).catch(() => {}).then(() => {
            m -= r.length
        })
    }, u.streamStarted = (a, o) => {
        let c = s.changes;
        if (!s.sharing) return;
        let l = null,
            d = null,
            f = e.clock(),
            m = !1,
            h = 0,
            g = !1,
            _ = () => d ||= U(() => import(/* @vite-ignore */ sdkAssets.sharing).then(async t => {
                let n = await ja(e.contributor()),
                    r = e.state.get(`sharing.recovery`);
                r || (r = La(), e.state.set(`sharing.recovery`, r));
                let i = async () => ({
                    token: await e.token(),
                    attested: !!(e._token && e._token.attested)
                });
                i.invalidate = async () => {
                    e._token = null, e.state.set(`token`, null)
                };
                let o = e.telemetry.device || {};
                return l = await t.createSharingSession({
                    api: e.apiUrl,
                    fetch: e.fetch,
                    tokenProvider: i,
                    headers: e.origin ? {
                        origin: e.origin
                    } : {},
                    contributor: e.contributor(),
                    contributorKeyRaw: n.publicKeyRaw,
                    recoveryHash: await Ia(r),
                    inputSampleRate: a.sampleRate,
                    inputRoute: `unknown`,
                    decodeInfo: {
                        modelRevision: e.modelRevision || null,
                        modelBuild: e.modelBuild || null,
                        backend: `exact`,
                        weightsSha256: null,
                        sdkVersion: `3.1.3`
                    },
                    startedAt: f,
                    consentVersion: s.grantVersion,
                    consentTextSha256: s.grantTextSha256,
                    device: {
                        deviceClass: o.class || `browser`,
                        osMajor: o.os_major || 1
                    },
                    flags: () => e.flags,
                    enabled: () => s.sharing,
                    epoch: () => s.changes,
                    stamp: c,
                    onIssue: (t, n) => e.reportIssue(t, n),
                    ...e.sharingBitrate ? {
                        bitrate: e.sharingBitrate
                    } : {},
                    ...e.sharingStorage ? {
                        storage: e.sharingStorage
                    } : {},
                    ...e.sharingSeams || {}
                }), u.outbox = t.outbox || u.outbox, l
            }), __vite__mapDeps([0, 1])).catch(t => (e.reportIssue(`other`, `sharing_start:` + (t.code || `error`)), null)),
            v = o.pushAudio,
            y = o.finish,
            b = o.free;
        o.pushAudio = e => {
            let t = v(e);
            if (m || (m = !0, p++), s.sharing && !g) {
                if (!l && (h += e.length, h > 30 * a.sampleRate)) return g = !0, _(), t;
                let n = e.slice();
                _().then(e => e && !g && e.push(n))
            }
            return t
        }, o.finish = () => {
            let a = y();
            m && (m = !1, p--);
            let o = e.clock();
            return d && _().then(e => e && e.finish({
                endedAt: o
            })).then(() => {
                s.takeThanks() && typeof t.ask != `function` && U(() => Promise.resolve().then(() => Ba).then(e => e.QuranLabConsent.thank({
                    lang: n,
                    wording: r,
                    theme: i
                })), void 0)
            }), d = null, a
        }, o.free = () => {
            m && (m = !1, p--);
            let t = e.clock();
            return d && _().then(e => e && e.finish({
                endedAt: t
            })), d = null, b()
        }
    }, u
}

async function To(e, t) {
    let n = `${e.platform}:${e.bundleId}`,
        r = t.contributor,
        i = async (t, n) => {
            let r = {
                    "content-type": `application/json`,
                    ...e.origin ? {
                        origin: e.origin
                    } : {}
                },
                i = await e.fetch(e.apiUrl + t, {
                    method: `POST`,
                    headers: r,
                    body: JSON.stringify(n),
                    redirect: `error`
                }),
                a = {};
            try {
                a = await i.json()
            } catch {}
            if (i.status >= 400) {
                let e = Error(`${i.status} ${a.error||``}`);
                throw e.status = i.status, e.code = a.error, e
            }
            return a
        }, a = null;
    for (let o = 0; o < 2; o++) {
        let {
            nonce: o
        } = await i(`/v1/contributions/challenge`, {
            app: n,
            contributor: r
        }), s = Math.floor(e.clock() / 1e3), c = await t.sign(Ra({
            app: n,
            contributor: r,
            nonce: o,
            timestamp: s
        }));
        try {
            await i(`/v1/contributions/delete`, {
                app: n,
                contributor: r,
                nonce: o,
                timestamp: s,
                action: `delete-all`,
                signature: za(c)
            });
            let t = await e.contributionSummary();
            return {
                accepted: !0,
                sessionsLeft: t && t.you ? t.you.sessions : null
            }
        } catch (e) {
            if (a = e, e.code !== `nonce_invalid` && e.code !== `timestamp_invalid`) throw e
        }
    }
    throw a
}

var W = Object.freeze([{
    name: `log_probs`,
    key: `logProbs`,
    width: 38,
    rate: 40,
    kind: `log_softmax`,
    what: `final CTC head`
}, {
    name: `inter1_log_probs`,
    key: `inter1LogProbs`,
    width: 38,
    rate: 40,
    kind: `log_softmax`,
    what: `stack-1 InterCTC (consonants)`
}, {
    name: `inter4_log_probs`,
    key: `inter4LogProbs`,
    width: 38,
    rate: 40,
    kind: `log_softmax`,
    what: `stack-4 InterCTC (diagnostic)`
}, {
    name: `id_log_probs`,
    key: `idLogProbs`,
    width: 38,
    rate: 20,
    kind: `log_softmax`,
    what: `identity CTC`
}, {
    name: `timing_log_probs`,
    key: `timingLogProbs`,
    width: 38,
    rate: 20,
    kind: `log_softmax`,
    what: `H-time chain (durations); 0 = pause`
}, {
    name: `gem`,
    key: `gem`,
    width: 2,
    rate: 20,
    kind: `softmax`,
    classes: [`single`, `held`]
}, {
    name: `attr_tafkheem`,
    key: `attrTafkheem`,
    width: 3,
    rate: 20,
    kind: `softmax`,
    classes: [`thin`, `heavy`, `low_heavy`]
}, {
    name: `attr_ghunna`,
    key: `attrGhunna`,
    width: 5,
    rate: 20,
    kind: `softmax`,
    classes: [`none`, `plain`, `geminate`, `ikhfa`, `idgham`]
}, {
    name: `attr_qalqalah`,
    key: `attrQalqalah`,
    width: 3,
    rate: 20,
    kind: `softmax`,
    classes: [`none`, `sughra`, `kubra`]
}, {
    name: `attr_face`,
    key: `attrFace`,
    width: 4,
    rate: 20,
    kind: `softmax`,
    classes: [`none`, `imala`, `tasheel`, `sakt`]
}, {
    name: `boundary`,
    key: `boundary`,
    width: 1,
    rate: 20,
    kind: `logit`,
    what: `a unit starts here`
}, {
    name: `conf`,
    key: `conf`,
    width: 1,
    rate: 20,
    kind: `logit`,
    what: `the frame label is truthful`
}]);

function Eo(e) {
    let t = /^c(\d+)_l(\d+)$/.exec(String(e));
    return t ? Number(t[1]) * 20 : 0
}

var Do = Object.fromEntries(W.map(e => [e.name, e]));

var Oo = e => 1 / (1 + Math.exp(-e));

function ko(e, t, n = 0, r = t) {
    let i = Array(Math.max(0, r - n));
    for (let t = n; t < r; t++) {
        let r = t * 38,
            a = 0;
        for (let t = 1; t < 38; t++) e[r + t] > e[r + a] && (a = t);
        let o = +(a === 0);
        for (let t = 0; t < 38; t++) t !== a && e[r + t] > e[r + o] && (o = t);
        let s = e[r + a],
            c = e[r + o];
        i[t - n] = {
            top1: a,
            top1LogProb: s,
            runnerUp: o,
            runnerUpLogProb: c,
            margin: s - c
        }
    }
    return i
}

function Ao(e, t = {}) {
    let n = t.tokens || null,
        r = e.n40;
    if (!e.logProbs) throw TypeError(`decode: heads.logProbs is required`);
    let i = t.frames || ko(e.logProbs, r);
    if (t.k !== void 0 && t.k !== null) {
        let a = Po(e.logProbs, r, 38, t.k);
        for (let e = 0; e < r; e++) {
            let t = [];
            for (let r = 0; r < a.k; r++) {
                let i = a.ids[e * a.k + r];
                t.push({
                    id: i,
                    unit: n && i < n.length ? n[i] : String(i),
                    logProb: a.values[e * a.k + r],
                    margin: a.margins[e * a.k + r]
                })
            }
            i[e] = {
                ...i[e],
                ranked: t
            }
        }
    }
    let a = e.conf || null,
        o = e => n && e < n.length ? n[e] : String(e),
        s = [];
    for (let e = 0; e < r;) {
        let t = i[e].top1;
        if (t === 0) {
            e++;
            continue
        }
        let n = e;
        for (; n + 1 < r && i[n + 1].top1 === t;) n++;
        let c = e;
        for (let t = e + 1; t <= n; t++) i[t].top1LogProb > i[c].top1LogProb && (c = t);
        let l = null;
        if (a) {
            let t = 0;
            for (let r = 2 * e; r < 2 * n + 2; r++) t += Oo(a[r]);
            l = t / (2 * (n - e + 1))
        }
        let u = i[c];
        s.push({
            id: t,
            unit: o(t),
            frame0: e,
            frame1: n,
            startMs: 40 * e,
            endMs: 40 * (n + 1),
            peakFrame: c,
            logProb: u.top1LogProb,
            runnerUp: u.runnerUp,
            runnerUpUnit: o(u.runnerUp),
            runnerUpLogProb: u.runnerUpLogProb,
            margin: u.margin,
            confidence: l
        }), e = n + 1
    }
    let c = [],
        l = [],
        u = () => {
            if (!l.length) return;
            let e = l.map(e => s[e]);
            c.push({
                index: c.length,
                tokens: l,
                units: e.map(e => e.unit),
                startMs: e[0].startMs,
                endMs: e[e.length - 1].endMs,
                confidence: e.some(e => e.confidence === null) ? null : Math.min(...e.map(e => e.confidence)),
                margin: Math.min(...e.map(e => e.margin))
            })
        };
    return s.forEach((e, t) => {
        e.id === 1 ? (u(), l = []) : l.push(t)
    }), u(), {
        frames: i,
        tokens: s,
        words: c,
        transcript: s.map(e => e.unit).join(` `),
        ids: s.map(e => e.id)
    }
}

var jo = Object.freeze({
        log_probs: 38,
        inter1_log_probs: 38,
        inter4_log_probs: 38,
        id_log_probs: 38,
        timing_log_probs: 38,
        gem: 2,
        attr_tafkheem: 3,
        attr_ghunna: 5,
        attr_qalqalah: 3,
        attr_face: 4
    });

var Mo = {
        log_probs: `logProbs`,
        inter1_log_probs: `inter1LogProbs`,
        inter4_log_probs: `inter4LogProbs`,
        id_log_probs: `idLogProbs`,
        timing_log_probs: `timingLogProbs`,
        gem: `gem`,
        attr_tafkheem: `attrTafkheem`,
        attr_ghunna: `attrGhunna`,
        attr_qalqalah: `attrQalqalah`,
        attr_face: `attrFace`
    };

var No = jo;

function Po(e, t, n, r) {
    if (!(Number.isInteger(r) && r >= 1 && r <= n)) throw RangeError(`k must be 1..${n}`);
    let i = new Int32Array(t * r),
        a = new Float32Array(t * r),
        o = new Float64Array(t * r),
        s = Array(n);
    for (let c = 0; c < t; c++) {
        let t = c * n;
        for (let e = 0; e < n; e++) s[e] = e;
        let l = Math.min(n, r + 1);
        for (let r = 0; r < l; r++) {
            let i = r;
            for (let a = r + 1; a < n; a++) {
                let n = e[t + s[a]],
                    r = e[t + s[i]];
                (n > r || n === r && s[a] < s[i]) && (i = a)
            }
            let a = s[r];
            s[r] = s[i], s[i] = a
        }
        for (let l = 0; l < r; l++) i[c * r + l] = s[l], a[c * r + l] = e[t + s[l]], o[c * r + l] = l + 1 < n ? e[t + s[l]] - e[t + s[l + 1]] : 0
    }
    return {
        frames: t,
        cols: n,
        k: r,
        ids: i,
        values: a,
        margins: o
    }
}

function Fo(e, t = `log_probs`, n = 2, r = null) {
    let i = jo[t];
    if (!i) throw RangeError(`${t} has no ranking (the rankable heads: ${Object.keys(jo).join(`, `)})`);
    let a = e[Mo[t]];
    if (!a) return null;
    let o = Po(a, a.length / i, i, n),
        s = Do[t];
    return {
        head: t,
        rate: s ? s.rate : i === 38 ? 40 : 20,
        names: i === 38 ? r || null : s && s.classes || null,
        ...o
    }
}

var Io = [
        [`heads`, [`n40`, `n20`, `vocab`, ...W.map(e => e.name)]],
        [`top2`, [`token`, `runner_up`, `log_prob`, `runner_up_log_prob`, `margin`]],
        [`openoptions`, [`context`, `batch`, `no_pin`]]
    ];

var Lo = 4;

var Ro = Object.freeze({
        log_probs: 1,
        inter1_log_probs: 2,
        inter4_log_probs: 4,
        id_log_probs: 8,
        timing_log_probs: 16,
        gem: 32,
        attr_tafkheem: 64,
        attr_ghunna: 128,
        attr_qalqalah: 256,
        attr_face: 512,
        boundary: 1024,
        conf: 2048
    });

var zo = 4095;

function Bo(e) {
    if (!e) return zo;
    let t = Ro.log_probs;
    for (let n of e) t |= Ro[n] || 0;
    return t
}

function Vo(e) {
    return !!(e && typeof e._zft_model_open == `function` && typeof e._zft_layout == `function`)
}

var Ho = 0;

var Uo = class {
        constructor(e) {
            if (!Vo(e)) throw Error(`the module has no zft_* exports`);
            this.m = e, this.apiVersion = e._zft_api_version(), this.version = this.str(e._zft_version());
            let t = e._zft_layout_count(),
                n = e._zft_layout() >> 2,
                r = Array.from(e.HEAP32.subarray(n, n + t));
            if (r[0] !== Lo) throw Error(`zft_layout version ${r[0]}, this SDK reads ${Lo}`);
            let i = 2 + Io.reduce((e, [, t]) => e + 1 + t.length, 0);
            if (t !== i) throw Error(`zft_layout has ${t} entries, this SDK expects ${i}`);
            this.layout = {};
            let a = 2;
            for (let [e, t] of Io) {
                let n = {
                    size: r[a++]
                };
                for (let e of t) n[e] = r[a++];
                this.layout[e] = n
            }
            this.liveStream = null
        }
        str(e) {
            return e ? this.m.UTF8ToString(e) : ``
        }
        cstr(e) {
            return e == null ? 0 : this.m.stringToNewUTF8(String(e))
        }
        withStrings(e, t) {
            let n = e.map(e => this.cstr(e));
            try {
                return t(...n)
            } finally {
                for (let e of n) e && this.m._free(e)
            }
        }
        alloc(e) {
            let t = this.m._malloc(Math.max(8, e));
            if (!t) throw Error(`out of wasm memory`);
            return this.m.HEAPU8.fill(0, t, t + e), t
        }
        i32(e) {
            return this.m.HEAP32[e >> 2]
        }
        f64(e) {
            return this.m.HEAPF64[e >> 3]
        }
        error() {
            return this.str(this.m._zft_error()) || `engine error`
        }
        stage(e, t) {
            let n = e || {
                    dir: `/tajweedformer/${++Ho}`,
                    files: [],
                    dirs: []
                },
                r = new Set(n.dirs),
                i = e => {
                    let t = ``;
                    for (let n of e.split(`/`).filter(Boolean))
                        if (t += `/` + n, !r.has(t)) {
                            try {
                                this.m.FS.mkdir(t)
                            } catch {}
                            r.add(t)
                        }
                };
            for (let e of t) {
                let t = `${n.dir}/${e.path}`;
                n.files.includes(t) || (i(t.slice(0, t.lastIndexOf(`/`))), this.m.FS.writeFile(t, e.bytes), n.files.push(t))
            }
            return n.dirs = [...r].filter(e => e.startsWith(n.dir)).sort((e, t) => t.length - e.length), n
        }
        unstage(e) {
            if (e) {
                for (let t of e.files) try {
                    this.m.FS.unlink(t)
                } catch {}
                for (let t of e.dirs) try {
                    this.m.FS.rmdir(t)
                } catch {}
            }
        }
        openModel(e, {
            context: t = null,
            threads: n = 0,
            sampleRate: r = 0
        } = {}) {
            let i = this.withStrings([e, t], (e, t) => this.m._zft_model_open(e, t, n | 0, r === 16e3 ? 0 : r | 0));
            if (!i) throw Error(`zf_tajweed_model_open: ${this.error()}`);
            return i
        }
        closeModel(e) {
            e && this.m._zft_model_close(e)
        }
        modelContext(e) {
            return this.str(this.m._zft_model_context(e))
        }
        chunkMs(e) {
            return this.m._zft_model_chunk_ms(e)
        }
        referenceOpen(e) {
            let t = this.m,
                n = this.alloc(e.length),
                r;
            try {
                t.HEAPU8.set(e, n), r = t._zft_reference_open(n, e.length)
            } finally {
                t._free(n)
            }
            if (r !== 0) throw Error(`zf_tajweed_reference_open_memory: ${this.error()}`);
            this.referenceIsOpen = !0;
            let i = t._zft_reference_tokens_sha256();
            return i ? Array.from(t.HEAPU8.subarray(i, i + 32), e => e.toString(16).padStart(2, `0`)).join(``) : null
        }
        referenceUnits(e, t) {
            let n = this.m;
            if (!this.referenceIsOpen) throw Error(`the reference table is not open`);
            let r = n._zft_reference_units(e, t);
            if (r < 0) return null;
            let i = n._zft_reference_units_ptr() >> 2,
                a = n._zft_reference_words_ptr() >> 2;
            return {
                units: Int32Array.from(n.HEAP32.subarray(i, i + r)),
                words: Int32Array.from(n.HEAP32.subarray(a, a + r)),
                nWords: n._zft_reference_n_words()
            }
        }
        referenceClose() {
            this.referenceIsOpen && this.m._zft_reference_close(), this.referenceIsOpen = !1
        }
        readHeads(e, t = 0, n = null, r = null) {
            let i = this.layout.heads,
                a = this.i32(e + i.n40),
                o = n === null ? a - t : n,
                s = {
                    n40: o,
                    n20: 2 * o,
                    vocab: 38
                };
            for (let n of W) {
                let a = this.i32(e + i[n.name]) >>> 0;
                if (!a || r && !r.has(n.name)) {
                    s[n.key] = null;
                    continue
                }
                let c = n.width * (n.rate === 40 ? 1 : 2),
                    l = (a >> 2) + t * c;
                s[n.key] = this.m.HEAPF32.slice(l, l + o * c)
            }
            return s
        }
        writeHeads(e) {
            let t = this.layout.heads,
                n = [],
                r = this.alloc(t.size);
            n.push(r), this.m.HEAP32[r + t.n40 >> 2] = e.n40, this.m.HEAP32[r + t.n20 >> 2] = 2 * e.n40, this.m.HEAP32[r + t.vocab >> 2] = 38;
            for (let i of W) {
                let a = e[i.key];
                if (!a) continue;
                let o = this.alloc(a.length * 4);
                n.push(o), this.m.HEAPF32.set(a, o >> 2), this.m.HEAP32[r + t[i.name] >> 2] = o
            }
            return {
                ptr: r,
                free: () => {
                    for (let e of n) this.m._free(e)
                }
            }
        }
        streamTopK(e, t, n, r) {
            let i = this.m,
                a = No[t];
            if (!a) throw RangeError(`${t} has no ranking`);
            if (!(Number.isInteger(n) && n >= 1 && n <= a)) throw RangeError(`k must be 1..${a}`);
            let o = Math.min(a, n + 1),
                s = this.alloc(o * 4),
                c;
            try {
                c = i._zft_stream_topk(e.s, Ro[t], o, s, 0, 0, 0)
            } finally {
                i._free(s)
            }
            if (c < 0) return null;
            let l = this.alloc(Math.max(1, c * o) * 4),
                u = this.alloc(Math.max(1, c * o) * 4);
            try {
                if (i._zft_stream_topk(e.s, Ro[t], o, l, u, 0, c) < 0) return null;
                let s = new Int32Array(c * n),
                    d = new Float32Array(c * n),
                    f = new Float64Array(c * n),
                    p = i.HEAP32.subarray(l >> 2, (l >> 2) + c * o),
                    m = i.HEAPF32.subarray(u >> 2, (u >> 2) + c * o);
                for (let e = 0; e < c; e++)
                    for (let t = 0; t < n; t++) s[e * n + t] = p[e * o + t], d[e * n + t] = m[e * o + t], f[e * n + t] = t + 1 < o ? m[e * o + t] - m[e * o + t + 1] : 0;
                let h = W.find(e => e.name === t);
                return {
                    head: t,
                    rate: h.rate,
                    names: a === 38 ? r || null : h.classes || null,
                    frames: c,
                    cols: a,
                    k: n,
                    ids: s,
                    values: d,
                    margins: f
                }
            } finally {
                i._free(l), i._free(u)
            }
        }
        streamCreate(e) {
            if (this.liveStream) throw Error(`one TajweedFormer stream at a time (the engine allows one live stream); free the other first`);
            let t = this.m._zft_stream_create(e);
            if (!t) throw Error(`zf_tajweed_stream_create: ${this.error()}`);
            return this.liveStream = t, t
        }
        streamDestroy(e) {
            e && (this.m._zft_stream_destroy(e), this.liveStream === e && (this.liveStream = null))
        }
    };

var Wo = class {
        constructor(e, t, {
            onChunk: n = null,
            keep: r = null,
            tokens: i = null
        } = {}) {
            this.eng = e, this.s = e.streamCreate(t), this.onChunk = n, this.keep = r, this.tokens = i, this.chunkMs = e.chunkMs(t), this.per40 = Math.max(1, Math.round(this.chunkMs / 40)), this.seen40 = 0, this.chunkIndex = 0, this.inPtr = 0, this.inCap = 0, this.headsPtr = e.alloc(e.layout.heads.size), this.mask = Bo(r), this._applyHeads()
        }
        _applyHeads() {
            let e = this.eng.m;
            if (typeof e._zft_stream_set_heads == `function` && e._zft_stream_set_heads(this.s, this.mask) !== 0) throw Error(`zf_tajweed_stream_set_heads refused the selection (the take already has chunks)`)
        }
        top2(e = 0, t = null) {
            let n = this.eng,
                r = n.m;
            if (typeof r._zft_stream_top2 != `function`) return null;
            let i = r._zft_stream_top2(this.s);
            if (i < 0) throw Error(`zf_tajweed_stream_top2: ${this.error()}`);
            let a = n.layout.top2,
                o = r._zft_stream_top2_ptr(),
                s = t === null ? i : Math.min(i, t),
                c = Array(Math.max(0, s - e));
            for (let t = e; t < s; t++) {
                let i = o + t * a.size,
                    s = r.HEAPF32[i + a.log_prob >> 2],
                    l = r.HEAPF32[i + a.runner_up_log_prob >> 2];
                c[t - e] = {
                    top1: n.i32(i + a.token),
                    top1LogProb: s,
                    runnerUp: n.i32(i + a.runner_up),
                    runnerUpLogProb: l,
                    margin: s - l
                }
            }
            return c
        }
        _live() {
            if (!this.s) throw Error(`the stream was freed`)
        }
        _emit(e) {
            if (!this.onChunk || e <= 0) return;
            let t = this.eng;
            if (t.m._zft_stream_heads(this.s, this.headsPtr) < 0) throw Error(`zf_tajweed_stream_heads: ${this.error()}`);
            let n = t.i32(this.headsPtr + t.layout.heads.n40);
            for (; this.seen40 + this.per40 <= n;) {
                let e = t.readHeads(this.headsPtr, this.seen40, this.per40, this.keep);
                e.index = this.chunkIndex++, e.frame0 = this.seen40, e.startMs = 40 * this.seen40, e.endMs = 40 * (this.seen40 + this.per40), e.frames = this.top2(this.seen40, this.seen40 + this.per40) || (e.logProbs ? ko(e.logProbs, this.per40) : null), this.seen40 += this.per40, this.onChunk(e)
            }
        }
        error() {
            return this.s ? this.eng.str(this.eng.m._zft_stream_error(this.s)) || `engine error` : `freed`
        }
        pushAudio(e) {
            this._live();
            let t = this.eng,
                n = t.m;
            if (!(e instanceof Float32Array)) throw TypeError(`pushAudio takes a Float32Array`);
            e.length > this.inCap && (this.inPtr && n._free(this.inPtr), this.inPtr = t.alloc(e.length * 4), this.inCap = e.length), n.HEAPF32.set(e, this.inPtr >> 2);
            let r = n._zft_stream_push_audio(this.s, this.inPtr, e.length);
            if (r < 0) throw Error(`zf_tajweed_stream_push_audio: ${this.error()}`);
            return this._emit(r), r
        }
        finish() {
            this._live();
            let e = this.eng.m._zft_stream_finish(this.s);
            if (e < 0) throw Error(`zf_tajweed_stream_finish: ${this.error()}`);
            return this._emit(e), e
        }
        heads() {
            if (this._live(), this.eng.m._zft_stream_heads(this.s, this.headsPtr) < 0) throw Error(`zf_tajweed_stream_heads: ${this.error()}`);
            return this.eng.readHeads(this.headsPtr, 0, null, this.keep)
        }
        decoded({
            k: e
        } = {}) {
            let t = this.heads(),
                n = this.top2();
            return Ao(t, {
                tokens: this.tokens,
                k: e,
                frames: n && n.length === t.n40 ? n : void 0
            })
        }
        topK(e = `log_probs`, t = 2) {
            return typeof this.eng.m._zft_stream_topk == `function` ? this.eng.streamTopK(this, e, t, this.tokens) : Fo(this.heads(), e, t, this.tokens)
        }
        greedy() {
            this._live();
            let e = this.eng.m,
                t = e._zft_stream_greedy(this.s, 0, 0);
            if (t <= 0) return [];
            let n = this.eng.alloc(t * 4);
            try {
                return e._zft_stream_greedy(this.s, n, t), Array.from(e.HEAP32.subarray(n >> 2, (n >> 2) + t))
            } finally {
                e._free(n)
            }
        }
        reset() {
            this._live(), this.eng.m._zft_stream_reset(this.s), this.seen40 = 0, this.chunkIndex = 0, this._applyHeads()
        }
        free() {
            if (!this.s) return;
            let e = this.eng.m;
            this.eng.streamDestroy(this.s), this.inPtr && e._free(this.inPtr), e._free(this.headsPtr), this.s = 0, this.inPtr = this.headsPtr = 0
        }
    };

var Go = () => typeof performance < `u` ? performance.now() : Date.now();

var Ko = class {
        constructor(e) {
            this.factory = e, this.eng = null, this.staged = null, this.model = 0, this.opened = null, this.stream = null, this.out = []
        }
        async init() {
            if (!this.eng) {
                let e = await this.factory();
                if (!Vo(e)) throw Error(`the WebAssembly module has no TajweedFormer engine`);
                this.eng = new Uo(e)
            }
            return {
                engineVersion: this.eng.version,
                apiVersion: this.eng.apiVersion
            }
        }
        async stage(e) {
            return await this.init(), this.staged = this.eng.stage(this.staged, e), {
                files: this.staged.files.length
            }
        }
        _open(e, t) {
            let n = this.opened;
            this.model && n && n.context === e && n.sampleRate === t || (this._endStream(), this.model && (this.eng.closeModel(this.model), this.model = 0, this.opened = null), this.model = this.eng.openModel(this.staged.dir, {
                context: e,
                sampleRate: t
            }), this.opened = {
                context: e,
                sampleRate: t
            })
        }
        _endStream() {
            this.stream &&= (this.stream.free(), null), this.out = []
        }
        async warm({
            context: e,
            sampleRate: t = 16e3
        }) {
            await this.init(), this._open(e, t);
            let n = this.eng.chunkMs(this.model),
                r = new Wo(this.eng, this.model, {
                    keep: new Set([`log_probs`])
                });
            try {
                r.pushAudio(new Float32Array(Math.ceil(t * n / 1e3) * 2))
            } finally {
                r.free()
            }
            return {
                chunkMs: n
            }
        }
        async start({
            context: e,
            sampleRate: t = 16e3,
            heads: n = null
        }) {
            await this.init(), this._open(e, t), this._endStream();
            let r = n ? new Set(n) : null;
            return this.stream = new Wo(this.eng, this.model, {
                keep: r,
                onChunk: e => this.out.push(e)
            }), {
                chunkMs: this.eng.chunkMs(this.model)
            }
        }
        _take() {
            let e = this.out;
            return this.out = [], e.map(e => {
                let t = {};
                for (let n of W) e[n.key] && (t[n.name] = e[n.key]);
                return {
                    index: e.index,
                    firstFrame: e.frame0,
                    n40: e.n40,
                    heads: t
                }
            })
        }
        async push(e) {
            if (!this.stream) throw Error(`no take is open`);
            let t = Go();
            return this.stream.pushAudio(e), {
                chunks: this._take(),
                computeMs: Go() - t
            }
        }
        async finish() {
            if (!this.stream) throw Error(`no take is open`);
            let e = Go();
            this.stream.finish();
            let t = Go() - e,
                n = this._take();
            return this._endStream(), {
                chunks: n,
                computeMs: t
            }
        }
        async cancel() {
            return this._endStream(), {}
        }
        async loadReference(e) {
            return await this.init(), {
                tokensSha256: this.eng.referenceOpen(e)
            }
        }
        async reference({
            surah: e,
            ayah: t
        }) {
            return await this.init(), this.eng.referenceUnits(e, t)
        }
        async close() {
            return this._endStream(), this.eng && (this.model && this.eng.closeModel(this.model), this.eng.referenceClose(), this.eng.unstage(this.staged)), this.model = 0, this.opened = null, this.staged = null, {}
        }
    };

function qo(e, t = []) {
    if (!e || typeof e != `object`) return t;
    if (ArrayBuffer.isView(e)) return t.includes(e.buffer) || t.push(e.buffer), t;
    if (Array.isArray(e)) {
        for (let n of e) qo(n, t);
        return t
    }
    for (let n of Object.values(e)) qo(n, t);
    return t
}

var Jo = [`init`, `stage`, `warm`, `start`, `push`, `finish`, `cancel`, `loadReference`, `reference`, `close`];

function Yo(e) {
    let t = new Ko(e),
        n = Promise.resolve(),
        r = {
            kind: `local`
        };
    for (let e of Jo) r[e] = (...r) => {
        let i = n.then(() => t[e](...r));
        return n = i.catch(() => {}), i
    };
    return r
}

function Xo(e) {
    let t = 0,
        n = new Map,
        r = null,
        i = e => {
            r = e;
            for (let t of n.values()) t.reject(e);
            n.clear()
        };
    e.onmessage = e => {
        let {
            id: t,
            result: r,
            error: i
        } = e.data || {}, a = n.get(t);
        a && (n.delete(t), i ? a.reject(Error(i.message)) : a.resolve(r))
    }, e.onerror = e => i(Error(`the engine worker failed: ${e&&e.message||`error`}`)), e.onmessageerror = () => i(Error(`the engine worker sent a message that could not be read`));
    let a = {
        kind: `worker`,
        terminate() {
            e.terminate(), i(Error(`the engine worker was ended`))
        }
    };
    for (let i of Jo) a[i] = (...a) => new Promise((o, s) => {
        if (r) {
            s(r);
            return
        }
        let c = ++t;
        n.set(c, {
            resolve: o,
            reject: s
        }), e.postMessage({
            id: c,
            method: i,
            args: a
        }, qo(a))
    });
    return a
}

var Zo = new Map(W.map(e => [e.name, e]));

var Qo = Object.freeze(W.map(e => e.name));

var $o = Object.freeze([`log_probs`, `inter1_log_probs`, `timing_log_probs`, `gem`, `attr_qalqalah`, `conf`]);

var es = e => 1 / (1 + Math.exp(-e));

function ts(e) {
    if (e == null) return [...$o];
    if (e === `all`) return [...Qo];
    if (!Array.isArray(e)) throw P(`heads must be a list of head names or 'all'`);
    for (let t of e)
        if (!Zo.has(t)) throw P(`unknown head ${JSON.stringify(t)}; the heads are ${Qo.join(`, `)}`);
    let t = new Set([`log_probs`, ...e]);
    return Qo.filter(e => t.has(e))
}

function ns(e, t, n) {
    let r = [],
        i = 0,
        a = null,
        o = -1 / 0;
    for (let s = 0; s < t; s++) {
        let t = s * 38,
            c = 0;
        for (let n = 1; n < 38; n++) e[t + n] > e[t + c] && (c = n);
        c === i ? a && (a.lastMs = s * n, e[t + c] > o && (o = e[t + c], a.peakMs = s * n)) : (a = null, c !== 0 && (a = {
            id: c,
            firstMs: s * n,
            peakMs: s * n,
            lastMs: s * n
        }, o = e[t + c], r.push(a))), i = c
    }
    return r
}

function rs({
    logProbs: e,
    conf: t = null,
    n40: n,
    names: r = null,
    frames: i = null,
    topK: a = 0,
    isFinal: o = !1
}) {
    let s = i || ko(e, n),
        c = e => r && e < r.length ? r[e] : String(e),
        l = [],
        u = !1;
    for (let e = 0; e < n;) {
        let r = s[e].top1;
        if (r === 0) {
            e++;
            continue
        }
        let i = e;
        for (; i + 1 < n && s[i + 1].top1 === r;) i++;
        let a = e;
        for (let t = e + 1; t <= i; t++) s[t].top1LogProb > s[a].top1LogProb && (a = t);
        let o = null;
        if (t) {
            let n = 0;
            for (let r = 2 * e; r < 2 * i + 2; r++) n += es(t[r]);
            o = n / (2 * (i - e + 1))
        }
        l.push({
            id: r,
            name: c(r),
            firstMs: 40 * e,
            peakMs: 40 * a,
            lastMs: 40 * i,
            confidence: o
        }), u = i === n - 1, e = i + 1
    }
    let d = [],
        f = [],
        p = () => {
            f.length && (d.push({
                index: d.length,
                text: f.map(e => e.name).join(` `),
                tokens: f,
                firstMs: f[0].firstMs,
                lastMs: f[f.length - 1].lastMs,
                confidence: f.some(e => e.confidence === null) ? null : Math.min(...f.map(e => e.confidence))
            }), f = [])
        };
    for (let e of l) e.id === 1 ? p() : f.push(e);
    p();
    let m = null;
    if (a > 0) {
        if (!(Number.isInteger(a) && a <= 38)) throw P(`topK must be 0 to 38`);
        m = Po(e, n, 38, a)
    }
    let h = Array(n);
    for (let e = 0; e < n; e++) {
        let t = s[e],
            n = {
                top1: t.top1,
                top1LogProb: t.top1LogProb,
                runnerUp: t.runnerUp,
                runnerUpLogProb: t.runnerUpLogProb,
                margin: t.margin
            };
        if (m) {
            n.topK = [];
            for (let t = 0; t < a; t++) {
                let r = m.ids[e * a + t];
                n.topK.push({
                    id: r,
                    name: c(r),
                    logProb: m.values[e * a + t],
                    margin: m.margins[e * a + t]
                })
            }
        }
        h[e] = n
    }
    return {
        text: l.map(e => e.name).join(` `),
        tokens: l,
        words: d,
        frames: h,
        settled: o || !u ? l.length : l.length - 1,
        isFinal: o
    }
}

var is = class {
    constructor(e, t, n = null, r = {}) {
        this._a = e, this._n40 = t, this._names = n, this._o = r
    }
    get names() {
        return Qo.filter(e => this._a[e])
    }
    get(e) {
        let t = Zo.get(e);
        if (!t) throw P(`unknown head ${JSON.stringify(e)}; the heads are ${Qo.join(`, `)}`);
        let n = this._a[e];
        return n ? {
            name: e,
            kind: t.kind === `log_softmax` ? `ctc` : `attribute`,
            frameMs: t.rate,
            frames: t.rate === 40 ? this._n40 : 2 * this._n40,
            classes: t.width,
            values: n
        } : null
    }
    greedy(e = `log_probs`) {
        let t = this.get(e);
        if (!t) throw P(`this take did not compute ${e}`);
        if (t.kind !== `ctc`) throw P(`${e} is not a CTC head`);
        return ns(t.values, t.frames, t.frameMs)
    }
    decoded() {
        return rs({
            logProbs: this._a.log_probs,
            conf: this._a.conf || null,
            n40: this._n40,
            names: this._names,
            topK: this._o.topK || 0,
            isFinal: !!this._o.isFinal
        })
    }
};

function as(e) {
    let t = {};
    for (let n of Qo) {
        if (!e.length || e.some(e => !e[n])) continue;
        let r = new Float32Array(e.reduce((e, t) => e + t[n].length, 0)),
            i = 0;
        for (let t of e) r.set(t[n], i), i += t[n].length;
        t[n] = r
    }
    return t
}

var os = 1500;

var ss = 6e4;

Object.freeze([`log_probs`, `timing_log_probs`]);

function cs(e) {
    let t = Math.floor(e.length / 38),
        n = Array(t);
    for (let r = 0; r < t; r++) {
        let t = 0,
            i = e[r * 38];
        for (let n = 1; n < 38; n++) {
            let a = e[r * 38 + n];
            a > i && (i = a, t = n)
        }
        n[r] = t
    }
    return n
}

function ls(e, t) {
    return e.map((e, n) => e !== 0 || (t[2 * n] || 0) !== 0 || (t[2 * n + 1] || 0) !== 0)
}

function us(e, t) {
    let n = Math.ceil(t / 40);
    return {
        trigger: e + n,
        atMs: 40 * (e + 1),
        silenceMs: 40 * n
    }
}

var ds = class {
        constructor(e = os) {
            this.windowMs = e, this.frames = 0, this.active = 0, this.last = -1, this.speaking = !1, this.ending = null
        }
        feed(e, t) {
            let n = [],
                r = !1,
                i = ls(e, t);
            for (let t = 0; t < e.length; t++) {
                let e = this.frames++;
                i[t] ? (r = !0, this.active++, this.speaking || (this.speaking = !0, n.push({
                    type: `speechStarted`,
                    atMs: 40 * e
                })), this.last = e, this.ending = us(e, this.windowMs)) : this.speaking && e === this.ending.trigger && (this.speaking = !1, n.push({
                    type: `speechEnded`,
                    atMs: this.ending.atMs,
                    silenceMs: this.ending.silenceMs
                }))
            }
            return {
                speech: r,
                events: n
            }
        }
        counts() {
            return {
                speech: this.active,
                silence: this.frames - this.active
            }
        }
    };

var fs = Object.freeze([7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6]);

function ps(e) {
    return Number.isInteger(e) && e >= 1 && e <= 114 ? fs[e - 1] : 0
}

var ms = Object.freeze({
        kind: `cpu`,
        name: `wasm`,
        stage: `cpu`,
        reason: null
    });

var hs = class {
        constructor(e, t = null) {
            this.q = [], this.waiting = [], this.done = !1, this.limit = e, this.dropped = 0, this.onDrop = t
        }
        push(e) {
            if (this.done) return;
            let t = this.waiting.shift();
            if (t) {
                t({
                    value: e,
                    done: !1
                });
                return
            }
            this.q.push(e), this.q.length > this.limit && (this.q.shift(), this.dropped++, this.onDrop && this.onDrop())
        }
        close() {
            this.done = !0;
            for (let e of this.waiting.splice(0)) e({
                value: void 0,
                done: !0
            })
        } [Symbol.asyncIterator]() {
            let e = this;
            return {
                next() {
                    return e.q.length ? Promise.resolve({
                        value: e.q.shift(),
                        done: !1
                    }) : e.done ? Promise.resolve({
                        value: void 0,
                        done: !0
                    }) : new Promise(t => e.waiting.push(t))
                },
                return () {
                    return Promise.resolve({
                        value: void 0,
                        done: !0
                    })
                },
                [Symbol.asyncIterator]() {
                    return this
                }
            }
        }
    };

var gs = class {
        constructor() {
            this.a = new Float32Array(4096), this.n = 0
        }
        append(e) {
            if (this.n + e.length > this.a.length) {
                let t = new Float32Array(Math.max(2 * this.a.length, this.n + e.length));
                t.set(this.a.subarray(0, this.n)), this.a = t
            }
            this.a.set(e, this.n), this.n += e.length
        }
        view(e) {
            return this.a.subarray(0, e)
        }
    };

var _s = class {
        constructor(e, t, n = null) {
            this._m = e, this._o = t, this._source = n;
            let r = e.limits || {};
            this._chunks = new hs(r.chunks || 256, e.onDrop || null), this._events = new hs(r.events || 64), this._maxTakeMs = r.maxTakeMs || 12e5, this._maxSamples = Math.floor(this._maxTakeMs / 1e3 * t.sampleRate), this._live = !!(n && n.live), this._maxPending = this._live ? Math.floor((r.maxPendingMs || 3e4) / 1e3 * t.sampleRate) : r.maxPendingSamples || 576e5, this._pending = 0, this._state = `open`, this._store = {
                n40: 0,
                logProbs: new gs,
                conf: t.heads.includes(`conf`) ? new gs : null,
                frames: [],
                arrays: []
            }, this._speech = new ds(t.endOnSilenceMs || 1500), this._timing = t.heads.includes(`timing_log_probs`), this._index = 0, this._samples = 0, this._chunkUs = [], this._counts = !1, this._recitedCounted = !1, this._t0 = e.clock(), this._firstMs = null, this._heads = null, this._error = null, this._recited = null, this._done = null, this._drop = !1, this._failed = null, this._tap = e.platform ? e.platform.takeStarted({
                sampleRate: t.sampleRate
            }) : null, this._q = Promise.resolve().then(() => e.ensureContext(t.context)).then(() => e.host.start({
                context: t.context,
                sampleRate: t.sampleRate,
                heads: this._timing ? t.heads : [...t.heads, `timing_log_probs`]
            })).then(e => {
                this._chunkMs = e.chunkMs
            }).catch(e => this._fail(e))
        }
        get chunks() {
            return this._chunks
        }
        get events() {
            return this._events
        }
        get backend() {
            return ms
        }
        push(e) {
            if (this._source) throw P(`push() is for a session made with model.session(); a listen session is fed by the SDK`);
            this._push(e)
        }
        _push(e) {
            if (this._state !== `open`) throw new N(`session_closed`);
            let t;
            if (e instanceof Float32Array) t = e.slice();
            else if (Array.isArray(e) || ArrayBuffer.isView(e)) t = Float32Array.from(e);
            else throw P(`push takes mono float samples (a Float32Array)`);
            if (!t.length) return;
            let n = this._maxSamples - this._samples,
                r = t.length >= n;
            r && (t = t.subarray(0, n));
            let i = null;
            if (this._pending > 0 && this._pending + t.length > this._maxPending && (i = this._live ? new N(`engine_failed`, {
                    detail: `this device decodes slower than the microphone delivers audio`
                }) : P(`too much audio is waiting to be decoded; push as the chunks arrive`)), i) {
                if (this._close(`self`, {
                        reason: `error`,
                        error: i,
                        flush: !1
                    }), !this._source) throw i;
                return
            }
            if (this._pending += t.length, this._firstMs === null && (this._firstMs = this._m.clock() - this._t0), this._samples += t.length, this._tap) try {
                this._tap.pushAudio(t)
            } catch {}
            this._q = this._q.then(() => this._drop ? null : this._m.host.push(t)).then(e => {
                this._pending -= t.length, e && !this._drop && this._deliver(e, !1)
            }).catch(e => this._fail(e)), r && this._close(`self`, {
                reason: `limit`
            })
        }
        _emit(e) {
            if (this._events.push(e), this._o.onEvent) try {
                this._o.onEvent(e)
            } catch (e) {
                queueMicrotask(() => {
                    throw e
                })
            }
        }
        _deliver({
            chunks: e,
            computeMs: t
        }, n) {
            let r = this._store,
                i = this._m.names,
                a = !1,
                o = e.slice();
            n && !o.length && o.push({
                firstFrame: r.n40,
                n40: 0,
                heads: {}
            });
            for (let s = 0; s < o.length && !a; s++) {
                let c = o[s],
                    l = c.heads.log_probs,
                    u = c.n40 ? ko(l, c.n40) : [],
                    d = c.n40 && c.heads.timing_log_probs ? cs(c.heads.timing_log_probs) : [];
                if (!this._timing && c.heads.timing_log_probs && delete c.heads.timing_log_probs, c.n40) {
                    r.arrays.push(c.heads), r.logProbs.append(l), r.conf && c.heads.conf && r.conf.append(c.heads.conf);
                    for (let e of u) r.frames.push(e);
                    r.n40 += c.n40, this._chunkUs.push(Math.round(t * 1e3 / e.length))
                }
                let f = this._speech.feed(u.map(e => e.top1), d);
                a = !n && this._o.endOnSilenceMs > 0 && f.events.some(e => e.type === `speechEnded`);
                for (let e of f.events) this._emit(e);
                let p = r.n40,
                    m = a || n && s === o.length - 1,
                    h = this._o.topK,
                    g = {
                        index: this._index++,
                        startMs: 40 * c.firstFrame,
                        endMs: 40 * (c.firstFrame + c.n40),
                        firstFrame: c.firstFrame,
                        backend: ms,
                        speech: f.speech,
                        heads: new is(c.heads, c.n40, i, {
                            topK: h
                        })
                    },
                    _ = null;
                if (Object.defineProperty(g, "decoded", {
                        enumerable: !0,
                        get() {
                            return _ ||= rs({
                                logProbs: r.logProbs.view(p * 38),
                                conf: r.conf ? r.conf.view(2 * p) : null,
                                n40: p,
                                names: i,
                                frames: r.frames,
                                topK: h,
                                isFinal: m
                            }), _
                        }
                    }), this._chunks.push(g), this._o.onChunk) try {
                    this._o.onChunk(g)
                } catch (e) {
                    queueMicrotask(() => {
                        throw e
                    })
                }
            }
            a && this._state === `open` && this._close(`self`, {
                reason: `silence`,
                flush: !1
            })
        }
        _fail(e) {
            let t = F(e);
            this._state === `open` ? this._close(`self`, {
                reason: `error`,
                error: t,
                flush: !1
            }) : this._state === `closing` && !this._failed && (this._failed = t, this._drop = !0)
        }
        _end(e, t = null) {
            this._state === `open` && this._close(`self`, {
                reason: e,
                error: t
            })
        }
        _close(e, t = {}) {
            let {
                reason: n = null,
                error: r = null,
                flush: i = !0
            } = t;
            if (this._state !== `open`) return this._done;
            if (this._state = `closing`, this._drop = e === `cancel` || !i, this._source) try {
                this._source.stop()
            } catch {}
            let a = this._m.host,
                o = async () => {
                    let t = null;
                    if (this._failed && e !== `cancel` && (e = `self`, n = `error`, r = this._failed, i = !1), e === `cancel` || !i) await a.cancel().catch(() => {});
                    else try {
                        t = await a.finish()
                    } catch (t) {
                        e = `self`, n = `error`, r = F(t)
                    }
                    if (t) try {
                        this._deliver(t, !0)
                    } catch (t) {
                        e = `self`, n = `error`, r = F(t)
                    }
                    this._finalize(e, n, r)
                };
            return this._done = this._q.then(o, o), this._q = this._done.catch(() => {}), this._done
        }
        _finalize(e, t, n) {
            let r = this._store,
                i = e === `cancel`;
            if (this._state = i ? `cancelled` : `ended`, this._counts = !i && t !== `error`, i || (this._heads = new is(as(r.arrays), r.n40, this._m.names, {
                    topK: this._o.topK,
                    isFinal: !0
                })), i ? this._error = new N(`cancelled`) : t === `error` && (this._error = n || new N(`engine_failed`, {
                    detail: `the take failed`
                })), e === `self` && this._emit({
                    type: `ended`,
                    reason: t,
                    ...t === `error` ? {
                        error: this._error
                    } : {}
                }), this._tap) try {
                i ? this._tap.free() : this._tap.finish()
            } catch {}
            try {
                this._report()
            } catch {}
            this._chunks.close(), this._events.close(), this._m.sessionEnded(this)
        }
        _report() {
            let e = this._m.platform;
            if (!e) return;
            let t = this._store,
                n = {},
                r = [],
                i = [],
                a = this._speech.counts();
            if (this._counts) {
                for (let e of this._heads.names) this._heads.get(e).kind === `ctc` && (n[e] = this._heads.greedy(e).length);
                for (let e of this._heads.decoded().tokens) r.push(t.frames[e.peakMs / 40].margin), e.confidence !== null && i.push(e.confidence)
            }
            e.telemetry.take(this._m.cohort(this._o.context), {
                samples: this._samples,
                sampleRate: this._o.sampleRate,
                chunkUs: this._chunkUs,
                chunkLenMs: this._chunkMs || 320,
                aborted: !this._counts,
                firstMs: this._firstMs,
                margins: r,
                confidences: i,
                tokens: n,
                speechFrames: a.speech,
                silenceFrames: a.silence
            }), this._counts && this._recited && (e.telemetry.recited(this._recited.surah, this._recited.ayahs), this._recitedCounted = !0), this._counts && a.speech > 0 && typeof e.takeFinished == `function` && e.takeFinished()
        }
        finish() {
            return this._state === `open` && this._close(`finish`), this._done.then(() => {
                if (this._error) throw this._error;
                return this._heads
            })
        }
        cancel() {
            return this._state === `open` && this._close(`cancel`), this._done.then(() => {})
        }
        reportRecited(e, t, n) {
            if (!Number.isInteger(e) || e < 1 || e > 114) throw P(`surah ${e} is not 1 to 114`);
            let r = ps(e);
            if (!Number.isInteger(t) || !Number.isInteger(n) || t < 1 || t > n || n > r) throw P(`ayahs ${t} to ${n} are not inside surah ${e} (1 to ${r})`);
            let i = {
                surah: e,
                ayahs: n - t + 1
            };
            if (this._state !== `ended` && this._state !== `cancelled`) {
                this._recited = i;
                return
            }
            if (!this._counts || this._recitedCounted) return;
            this._recitedCounted = !0;
            let a = this._m.platform;
            a && a.telemetry.recited(i.surah, i.ayahs)
        }
    };

var vs = `
class QuranLabMic extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(Math.max(128, Math.round(sampleRate / 50 / 128) * 128)); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      this.buf.set(ch, this.n);
      this.n += ch.length;
      if (this.n + 128 > this.buf.length) { this.port.postMessage(this.buf.slice(0, this.n)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('quranlab-mic', QuranLabMic);
`;

var ys = (e = {}) => ({
        mediaDevices: e.mediaDevices === void 0 ? globalThis.navigator && globalThis.navigator.mediaDevices || null : e.mediaDevices,
        AudioContext: e.AudioContext || globalThis.AudioContext || globalThis.webkitAudioContext || null,
        AudioWorkletNode: e.AudioWorkletNode || globalThis.AudioWorkletNode || null,
        permissions: e.permissions === void 0 ? globalThis.navigator && globalThis.navigator.permissions || null : e.permissions
    });

async function bs(e = {}) {
    let t = ys(e);
    if (!t.mediaDevices || typeof t.mediaDevices.getUserMedia != `function`) return `none`;
    try {
        let e = await t.permissions.query({
            name: `microphone`
        });
        return e.state === `granted` ? `granted` : e.state === `denied` ? `denied` : `notAsked`
    } catch {
        return `notAsked`
    }
}

var xs = class e {
        constructor(e) {
            Object.assign(this, {
                _e: e.e,
                _ctx: e.ctx,
                _stream: null,
                _node: null,
                _src: null,
                _closed: !1,
                _paused: !1
            }), this._queue = [], this._waiting = [], this._listeners = new Set, this.sampleRate = e.ctx.sampleRate
        }
        static async open(t = {}) {
            let n = ys(t);
            if (!n.mediaDevices || typeof n.mediaDevices.getUserMedia != `function` || !n.AudioContext) throw new N(`microphone_unavailable`, {
                detail: `this runtime has no microphone (no getUserMedia or AudioContext)`
            });
            let r;
            try {
                r = await e._capture(n)
            } catch (e) {
                throw F(e, {
                    fallback: `microphone_unavailable`
                })
            }
            let i = null;
            try {
                i = new n.AudioContext({
                    latencyHint: `interactive`
                });
                let t = new e({
                    e: n,
                    ctx: i
                });
                return await t._worklet(), t._attach(r), i.state === `suspended` && typeof i.resume == `function` && await i.resume().catch(() => {}), t._watch(), t
            } catch (e) {
                for (let e of r.getTracks()) e.stop();
                throw i && typeof i.close == `function` && i.close().catch(() => {}), F(e, {
                    fallback: `microphone_unavailable`
                })
            }
        }
        static _capture(e) {
            return e.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: !1,
                    noiseSuppression: !1,
                    autoGainControl: !1
                },
                video: !1
            })
        }
        async _worklet() {
            let e = this._ctx;
            if (!e.audioWorklet || !this._e.AudioWorkletNode) throw new N(`microphone_unavailable`, {
                detail: `this browser has no AudioWorklet`
            });
            let t = null;
            try {
                t = URL.createObjectURL(new Blob([vs], {
                    type: `text/javascript`
                })), await e.audioWorklet.addModule(t)
            } finally {
                t && URL.revokeObjectURL(t)
            }
        }
        _attach(e) {
            let t = this._ctx;
            this._stream = e, this._src = t.createMediaStreamSource(e), this._node || (this._node = new this._e.AudioWorkletNode(t, `quranlab-mic`, {
                numberOfInputs: 1,
                numberOfOutputs: 0,
                channelCount: 1,
                channelCountMode: `explicit`
            }), this._node.port.onmessage = e => {
                !this._closed && !this._paused && this._block(e.data)
            }), this._src.connect(this._node);
            let n = e.getAudioTracks()[0];
            this._track = n, n && typeof n.addEventListener == `function` && (n.addEventListener(`mute`, this._onMute = () => this._pause()), n.addEventListener(`unmute`, this._onUnmute = () => this._resume()), n.addEventListener(`ended`, this._onEnded = () => {
                !this._closed && this._track === n && this._reopen()
            }))
        }
        _detach() {
            let e = this._track;
            if (e && typeof e.removeEventListener == `function` && (e.removeEventListener(`mute`, this._onMute), e.removeEventListener(`unmute`, this._onUnmute), e.removeEventListener(`ended`, this._onEnded)), this._src) try {
                this._src.disconnect()
            } catch {}
            if (this._stream)
                for (let e of this._stream.getTracks()) e.stop();
            this._src = this._stream = this._track = null
        }
        _watch() {
            let e = this._e.mediaDevices,
                t = this._ctx;
            typeof e.addEventListener == `function` && e.addEventListener(`devicechange`, this._onDevice = () => {
                this._closed || this._reopen()
            }), typeof t.addEventListener == `function` && t.addEventListener(`statechange`, this._onState = () => {
                this._closed || (t.state === `running` ? this._resume() : (t.state === `suspended` || t.state === `interrupted`) && this._pause())
            })
        }
        _notify(e) {
            for (let t of this._listeners) try {
                t(e)
            } catch {}
        }
        _pause() {
            this._paused || this._closed || (this._paused = !0, this._notify({
                type: `interrupted`,
                cause: `interruption`
            }))
        }
        _resume() {
            this._paused && !this._closed && (this._paused = !1, this._notify({
                type: `resumed`
            }))
        }
        async _reopen() {
            if (!(this._reopening || this._closed)) {
                this._reopening = !0;
                try {
                    this._detach();
                    let t = await e._capture(this._e);
                    if (this._closed) {
                        for (let e of t.getTracks()) e.stop();
                        return
                    }
                    this._attach(t), this._notify({
                        type: `interrupted`,
                        cause: `routeChange`
                    })
                } catch (e) {
                    this._notify({
                        type: `lost`,
                        error: new N(`interrupted`, {
                            detail: `the input device went away and no other could be opened`
                        }, {
                            cause: e
                        })
                    }), this.close()
                } finally {
                    this._reopening = !1
                }
            }
        }
        _block(e) {
            if (this._notify({
                    type: `samples`,
                    samples: e
                }), !this._iterating) return;
            let t = this._waiting.shift();
            if (t) {
                t({
                    value: e,
                    done: !1
                });
                return
            }
            this._queue.push(e), this._queue.length > 1500 && this._queue.shift()
        }
        _on(e) {
            return this._listeners.add(e), () => this._listeners.delete(e)
        }
        samples() {
            this._iterating = !0;
            let e = this;
            return {
                [Symbol.asyncIterator]() {
                    return this
                },
                next() {
                    return e._queue.length ? Promise.resolve({
                        value: e._queue.shift(),
                        done: !1
                    }) : e._closed ? Promise.resolve({
                        value: void 0,
                        done: !0
                    }) : new Promise(t => e._waiting.push(t))
                },
                return () {
                    return e._iterating = !1, e._queue.length = 0, Promise.resolve({
                        value: void 0,
                        done: !0
                    })
                }
            }
        }
        close() {
            if (this._closed) return;
            this._closed = !0, this._detach();
            let e = this._e.mediaDevices,
                t = this._ctx;
            if (this._onDevice && typeof e.removeEventListener == `function` && e.removeEventListener(`devicechange`, this._onDevice), this._onState && typeof t.removeEventListener == `function` && t.removeEventListener(`statechange`, this._onState), this._node) try {
                this._node.port.onmessage = null, this._node.disconnect()
            } catch {}
            typeof t.close == `function` && Promise.resolve(t.close()).catch(() => {});
            for (let e of this._waiting.splice(0)) e({
                value: void 0,
                done: !0
            })
        }
    };

var Ss = new Set([`calibration`, `reference`, `selftest`, `expected`]);

var Cs = [`realTime`, `fast`];

function ws(e, t, n) {
    if (e != null) {
        if (typeof e != `string` || !n.contexts.includes(e)) throw P(`unknown context ${JSON.stringify(e)}; this model has ${n.contexts.join(`, `)}`);
        return {
            context: e,
            source: `app`
        }
    }
    let r = t && typeof t == `object` ? t.inference : null,
        i = r && typeof r == `object` && !Array.isArray(r) ? r.context : null;
    return typeof i == `string` && n.contexts.includes(i) ? {
        context: i,
        source: `config`
    } : {
        context: n.default_context,
        source: `manifest`
    }
}

var Ts = e => {
    if (e && typeof e == `object` && !Object.isFrozen(e)) {
        Object.freeze(e);
        for (let t of Object.values(e)) Ts(t)
    }
    return e
};

async function Es(e) {
    if (e.host) return e.host;
    let t = () => Yo(e.engine || (async () => (await U(async () => {
        let {
            default: e
        } = await import(/* @vite-ignore */ sdkAssets.glue);
        return {
            default: e
        }
    }, [])).default(await qn(`tajweedformer.wasm`))));
    if (typeof globalThis.Worker != `function` || globalThis.document === void 0 || e.engine || e.worker === !1) return t();
    let n = null;
    try {
        return n = Xo(new Worker(sdkAssets.worker, {
            type: `module`,
            name: `tajweedformer-engine`
        })), await n.init(), n
    } catch {
        return n && n.terminate(), t()
    }
}

function Ds(e) {
    let t = new Map(e.map((e, t) => [e, t]));
    return Object.freeze({
        count: e.length,
        blank: 0,
        wordBar: 1,
        name(t) {
            return Number.isInteger(t) && t >= 0 && t < e.length ? e[t] : null
        },
        id(e) {
            return t.has(e) ? t.get(e) : null
        }
    })
}

function Os(e, t) {
    let n = new TextDecoder(`utf-8`, {
            fatal: !0
        }).decode(e),
        r = Ts(JSON.parse(n)),
        i = r && typeof r.contexts == `object` && r.contexts ? r.contexts : {};
    return Object.freeze({
        format: typeof r.format == `string` ? r.format : null,
        sha256: t,
        text: n,
        json: r,
        contexts: Object.freeze(Object.keys(i)),
        classes: Object.freeze(Array.isArray(r.classes) ? [...r.classes] : []),
        presets: Object.freeze(r.presets && typeof r.presets == `object` ? Object.keys(r.presets) : []),
        context(e) {
            return Object.prototype.hasOwnProperty.call(i, e) ? i[e] : null
        },
        threshold(e, t, n) {
            let r = this.context(e),
                i = r && r.sites && r.sites[t] && r.sites[t].thresholds;
            return i && typeof i[n] == `number` ? i[n] : null
        }
    })
}

var ks = Symbol(`openModel`);

var As = class {
        constructor(e, t) {
            if (t !== ks || !e) throw P(`a TajweedModel comes from client.model()`);
            this._x = e;
            let n = e.folder.manifest;
            this.id = n.model_id, this.version = e.version, this.build = e.build, this.contexts = Object.freeze([...e.contexts]), this.tokens = Ds(e.names), this.calibration = e.calibration, this.reference = e.reference, this.sampleClips = e.clips, this._open = null, this._closed = !1, this._staged = new Set;
            let r = this;
            this._forSession = {
                host: e.host,
                names: e.names,
                platform: e.platform,
                clock: e.clock,
                limits: e.limits,
                onDrop: e.onDrop,
                ensureContext: e => r._ensureContext(e),
                sessionEnded: e => {
                    r._open === e && (r._open = null)
                },
                cohort: e => ({
                    revision: r.version,
                    build: r.build,
                    context: e,
                    backend: `cpu`
                })
            }
        }
        get defaultContext() {
            return ws(null, this._x.platform ? this._x.platform.config : null, this._x.folder.manifest).context
        }
        chunkMs(e = this.defaultContext) {
            if (!this.contexts.includes(e)) throw P(`unknown context ${JSON.stringify(e)}; this model has ${this.contexts.join(`, `)}`);
            return Eo(e)
        }
        get backend() {
            return ms
        }
        async _ensureContext(e) {
            if (this._staged.has(e)) return;
            let t = this._x,
                n = Ai(t.folder.manifest, {
                    context: e,
                    platform: `web`
                }).filter(e => !Ss.has(t.folder.entry(e).role) && !this._staged.has(`file:` + e));
            t.reader.prefetch && await t.reader.prefetch(n);
            let r = [];
            for (let e of n) {
                let n = await t.folder.read(e);
                r.push({
                    path: e,
                    bytes: t.reader.fresh || t.host.kind === `local` ? n : n.slice()
                })
            }
            await t.host.stage(r);
            for (let e of n) this._staged.add(`file:` + e);
            this._staged.add(e)
        }
        _options(e = {}) {
            if (typeof e != `object` || !e) throw P(`session options must be an object`);
            let {
                context: t
            } = ws(e.context, this._x.platform ? this._x.platform.config : null, this._x.folder.manifest), n = e.sampleRate === void 0 || e.sampleRate === null ? 16e3 : e.sampleRate;
            if (!Number.isInteger(n) || n < 8e3 || n > 192e3) throw P(`sampleRate ${n} is not a whole number from 8000 to 192000`);
            let r = e.backend === void 0 || e.backend === null ? `auto` : e.backend;
            if (r !== `auto` && r !== `cpu`) throw P(`backend must be 'auto' or 'cpu'`);
            let i = e.topK === void 0 || e.topK === null ? 0 : e.topK;
            if (!Number.isInteger(i) || i < 0 || i > 38) throw P(`topK must be 0 to 38`);
            let a = e.endOnSilenceMs === void 0 || e.endOnSilenceMs === null ? 0 : e.endOnSilenceMs;
            if (a !== 0 && !(Number.isInteger(a) && a >= 500 && a <= 6e4)) throw P(`endOnSilenceMs must be off (0 or null) or a whole number of milliseconds from 500 to ${ss}`);
            for (let t of [`onChunk`, `onEvent`])
                if (e[t] !== void 0 && e[t] !== null && typeof e[t] != `function`) throw P(`${t} must be a function`);
            return {
                context: t,
                sampleRate: n,
                heads: ts(e.heads),
                topK: i,
                endOnSilenceMs: a,
                onChunk: e.onChunk || null,
                onEvent: e.onEvent || null
            }
        }
        _session(e, t) {
            if (this._closed) throw new N(`session_closed`);
            if (this._open) throw new N(`session_open`);
            let n = new _s(this._forSession, e, t);
            return this._open = n, n
        }
        session(e = {}) {
            if (e && e.pace !== void 0) throw P(`pace is for listen({ from })`);
            return this._session(this._options(e), null)
        }
        async listen(e = {}) {
            if (typeof e != `object` || !e) throw P(`listen options must be an object`);
            if (this._closed) throw new N(`session_closed`);
            if (this._open) throw new N(`session_open`);
            let {
                from: t,
                pace: n = `realTime`,
                ...r
            } = e;
            if (t == null) {
                if (e.pace !== void 0) throw P(`pace is for listen({ from })`);
                if (r.sampleRate !== void 0) throw P(`listen() takes its sampleRate from the microphone`);
                return this._options(r), this._listenMicrophone(r)
            }
            if (!Cs.includes(n)) throw P(`pace must be 'realTime' or 'fast'`);
            let i, a;
            if (t instanceof Float32Array) i = t, a = r.sampleRate === void 0 ? 16e3 : r.sampleRate;
            else {
                let e = this._x.clipFiles.get(t && t.name);
                if (!e || this.sampleClips.indexOf(t) < 0) throw P(`from must be one of model.sampleClips or a Float32Array of samples`);
                if (r.sampleRate !== void 0) throw P(`a sample clip has its own sampleRate`);
                i = await this._clipSamples(e), a = e.sampleRate
            }
            let o = this._options({
                ...r,
                sampleRate: a
            });
            if (this._open) throw new N(`session_open`);
            let s = {
                    stopped: !1,
                    stop() {
                        this.stopped = !0, this.timer && this.timers.clearTimeout(this.timer)
                    },
                    timers: this._x.timers
                },
                c = this._session(o, s);
            return js(c, s, i, a, n, this._x.clock), c
        }
        async _clipSamples(e) {
            let t;
            try {
                t = await this._x.folder.read(e.path)
            } catch (e) {
                throw F(e, {
                    fallback: `download_failed`
                })
            }
            let n = t.length >> 1,
                r = new DataView(t.buffer, t.byteOffset, t.byteLength),
                i = new Float32Array(n);
            for (let e = 0; e < n; e++) i[e] = r.getInt16(2 * e, !0) / 32768;
            return i
        }
        async _listenMicrophone(e) {
            let t = this._x,
                n = await xs.open(t.microphone || {}),
                r, i, a = t.lifecycle || {
                    document: globalThis.document,
                    window: globalThis.window === void 0 ? null : globalThis.window
                },
                o = a.document,
                s = a.window,
                c = {
                    live: !0,
                    stop() {
                        d(), o && typeof o.removeEventListener == `function` && o.removeEventListener(`visibilitychange`, l), s && typeof s.removeEventListener == `function` && s.removeEventListener(`pagehide`, u), n.close()
                    }
                },
                l = () => {
                    o.visibilityState === `hidden` && i._end(`hidden`)
                },
                u = () => i._end(`hidden`),
                d = () => {};
            try {
                r = this._options({
                    ...e,
                    sampleRate: Math.round(n.sampleRate)
                }), i = this._session(r, c)
            } catch (e) {
                throw n.close(), e
            }
            return d = n._on(e => {
                i._state === `open` && (e.type === `samples` ? i._push(e.samples) : e.type === `interrupted` ? i._emit({
                    type: `interrupted`,
                    cause: e.cause
                }) : e.type === `resumed` ? i._emit({
                    type: `resumed`
                }) : e.type === `lost` && i._end(`interrupted`, e.error))
            }), o && typeof o.addEventListener == `function` && o.addEventListener(`visibilitychange`, l), s && typeof s.addEventListener == `function` && s.addEventListener(`pagehide`, u), o && o.visibilityState === `hidden` && i._end(`hidden`), i
        }
        async close() {
            if (this._closed) return;
            this._closed = !0, this._open && await this._open.cancel().catch(() => {});
            let e = this._x.host;
            await e.close().catch(() => {}), typeof e.terminate == `function` && e.terminate(), this._x.onClose && this._x.onClose(this)
        }
    };

function js(e, t, n, r, i, a) {
    let o = Math.max(1, Math.round(r / 10)),
        s = t.timers,
        c = 0,
        l = a(),
        u = () => {
            if (t.stopped || e._state !== `open`) return;
            if (i === `fast`) {
                if (e._push(n.subarray(c, c + o)), c += o, c >= n.length) {
                    e._end(`sourceEnd`);
                    return
                }
                e._q.then(u);
                return
            }
            let d = Math.min(n.length, Math.floor((a() - l) / 1e3 * r) + o);
            for (; c < d && e._state === `open`;) e._push(n.subarray(c, Math.min(d, c + o))), c = Math.min(d, c + o);
            if (c >= n.length) {
                e._end(`sourceEnd`);
                return
            }
            t.timer = s.setTimeout(u, 100)
        };
    Promise.resolve().then(u)
}

async function Ms({
    reader: e,
    folder: t = {},
    platform: n = null,
    seams: r = {},
    onClose: i = null,
    onDrop: a = null
}) {
    let o = r.clock || (() => Date.now()),
        s = o(),
        c;
    try {
        c = await Br(e, {
            verify: `on-read`,
            requireSignature: !0,
            ...t
        })
    } catch (e) {
        throw F(e, {
            fallback: `model_invalid`
        })
    }
    let {
        folder: l,
        tokens: u,
        contexts: d,
        version: f,
        build: p
    } = c, m = null;
    try {
        let t = null,
            c = l.withRole(`calibration`)[0] || (l.has(`calibration.json`) ? `calibration.json` : null);
        c && (t = Os(await l.read(c), l.entry(c).sha256));
        let h = [],
            g = new Map;
        if (l.has(`selftest/selftest.json`)) {
            let e = null;
            try {
                e = JSON.parse(await l.readText(`selftest/selftest.json`))
            } catch {
                e = null
            }
            for (let t of e && Array.isArray(e.clips) ? e.clips : []) {
                let e = `selftest/${t.file}`;
                if (typeof t.id != `string` || !l.has(e) || !(t.sample_rate > 0)) continue;
                let n = Object.freeze({
                    name: t.id,
                    kind: String(t.kind || `clean`),
                    durationMs: Math.round(1e3 * t.samples / t.sample_rate)
                });
                h.push(n), g.set(n.name, {
                    path: e,
                    sampleRate: t.sample_rate
                })
            }
        }
        m = await Es(r);
        let _ = {
            reader: e,
            folder: l,
            names: u,
            contexts: d,
            version: f,
            build: p,
            calibration: t,
            clips: Object.freeze(h),
            clipFiles: g,
            host: m,
            platform: n,
            clock: o,
            timers: r.timers || {
                setTimeout: (e, t) => setTimeout(e, t),
                clearTimeout: e => clearTimeout(e)
            },
            microphone: r.microphone || null,
            lifecycle: r.lifecycle || null,
            limits: r.limits || null,
            onDrop: a || null,
            onClose: i,
            reference: null
        };
        _.reference = await Ns(_);
        let v = new As(_, ks),
            y = v.defaultContext;
        return await v._ensureContext(y), await m.warm({
            context: y,
            sampleRate: 16e3
        }), v.loadMs = o() - s, v
    } catch (e) {
        throw m && (await m.close().catch(() => {}), typeof m.terminate == `function` && m.terminate()), F(e)
    }
}

async function Ns(e) {
    let t = e.folder.withRole(`reference`)[0];
    if (!t) return null;
    let n = !1;
    n = typeof e.reader.cached == `function` ? await e.reader.cached(t).catch(() => !1) : await e.folder.read(t).then(() => !0, () => !1);
    let r = null,
        i = () => r ||= (async () => {
            let r = await e.folder.read(t),
                i = await e.host.loadReference(e.reader.fresh || e.host.kind === `local` ? r : r.slice());
            if (i.tokensSha256 && i.tokensSha256 !== String(e.folder.manifest.tokens_sha256).toLowerCase()) throw new N(`model_invalid`, {
                detail: `the reference data was built for another vocabulary than this model's tokens`
            });
            n = !0
        })().catch(e => {
            throw r = null, e
        });
    return {
        get isDownloaded() {
            return n
        },
        async fetch() {
            try {
                await i()
            } catch (e) {
                throw e instanceof N && e.code === `model_invalid` ? e : new N(`reference_missing`, {}, {
                    cause: e
                })
            }
        },
        async units(t, r) {
            if (!Number.isInteger(t) || t < 1 || t > 114) throw P(`surah ${t} is not 1 to 114`);
            if (!Number.isInteger(r) || r < 1) throw P(`ayah ${r} is not a positive whole number`);
            if (!n) throw new N(`reference_missing`);
            try {
                await i()
            } catch (e) {
                throw new N(`reference_missing`, {}, {
                    cause: e
                })
            }
            let a;
            try {
                a = await e.host.reference({
                    surah: t,
                    ayah: r
                })
            } catch (e) {
                throw F(e)
            }
            if (!a) throw P(`surah ${t} has no ayah ${r}`);
            return {
                units: Array.from(a.units),
                words: Array.from(a.words),
                wordCount: a.nWords
            }
        }
    }
}

var Ps = /^[a-z][a-z0-9_]{0,23}$/;

var Fs = 1e5;

var Is = Symbol(`TajweedClient.create`);

var Ls = `model.purge`;

var Rs = null;

var zs = class {
        constructor(e, t) {
            if (t !== Is || !e) throw P(`a TajweedClient is made by TajweedClient.create(options)`);
            this._i = e, this._ql = e.ql, this._closed = !1, this._model = null, this._opening = null, this._lastError = null, this._droppedChunks = 0, this.pin = null;
            let n = this;
            this.analytics = Object.freeze({
                reportChecks(e, t, r) {
                    if (typeof e != `string` || !Ps.test(e)) throw P(`rule ${JSON.stringify(e)} is not a rule name (lower-case letters, digits and underscores, at most 24)`);
                    if (!Number.isInteger(t) || !Number.isInteger(r) || r < 0 || r > t || t > Fs) throw P(`reportChecks needs whole numbers with 0 <= flagged <= checked <= ${Fs}`);
                    !n._closed && t && n._ql.telemetry.checks(e, t, r)
                }
            }), this.sharing = Bs(this)
        }
        static create(e) {
            return Vs(e, {})
        }
        _guard() {
            if (this._closed) throw new N(`invalid_argument`, {
                detail: `this client is closed`
            })
        }
        _fail(e, t) {
            let n = F(e, {
                sdk: I,
                origin: this._ql.origin || globalThis.location && globalThis.location.origin || this._ql.bundleId || ``,
                ...t
            });
            return this._lastError = n.code, n
        }
        async _source(e) {
            let t = this._ql,
                n = this._i.state;
            t.modelVersionPin = e;
            let r = null,
                i = null;
            try {
                r = await t.modelSource()
            } catch (e) {
                i = e
            }
            if (r && r.version) return n.set(`model.last`, {
                url: r.url,
                version: r.version,
                build: r.build,
                pinned: e
            }), this.pin = r.pin, r.pin && t.debug && console.warn(`TajweedFormer: model version ${r.pin.version} is ${r.pin.status}; using ${r.version}`), r;
            let a = n.get(`model.last`);
            if (a && (!e || a.version === e)) return {
                url: a.url,
                version: a.version,
                build: a.build,
                pin: null
            };
            throw r && !r.version ? new N(`model_incompatible`, {
                detail: `the config names a model build without a version; this SDK needs a build made for SDK 3.0.0 or later`
            }) : i
        }
        _reader(e, t) {
            let n = this._i,
                r = this._ql;
            return ji({
                baseUrl: e.url,
                fetch: n.fetch,
                store: n.store,
                onProgress: t,
                headers: () => r.modelHeaders(),
                renew: () => r.renewToken(),
                stops: e => !!ri(e),
                onRefusal: e => r.noteModelRefusal(e),
                onServed: () => r.noteModelServed(),
                stopped: () => !!r.modelRefusal
            })
        }
        _refused() {
            if (this._ql.modelStopped) throw this._ql.modelRefusal
        }
        _stillRefused() {
            if (this._ql.modelRefusal) throw this._ql.modelRefusal
        }
        _purge() {
            let e = async () => {
                let e = this._i.state;
                try {
                    e.set(Ls, !0)
                } catch {}
                try {
                    return await Fi(this._i.store), e.set(`model.last`, null), e.set(Ls, null), !0
                } catch {
                    return !1
                }
            }, t = (this._purgeChain || Promise.resolve()).then(e, e);
            return this._purgeChain = t, t
        }
        _purgeOwed() {
            try {
                return this._i.state.get(Ls) === !0
            } catch {
                return !0
            }
        }
        async _beforeModelCall() {
            this._ql.syncRefusal(), (this._ql.modelRefusal || this._purgeOwed()) && await this._purge()
        }
        async _failRefused(e, t) {
            throw this._ql.modelRefusal ? (await this._purge(), this._fail(this._ql.modelRefusal, t)) : this._fail(e, t)
        }
        async _allowedSource(e) {
            let t;
            try {
                t = await this._source(e)
            } catch (e) {
                throw this._refused(), e
            }
            return this._refused(), t
        }
        async _gate(e) {
            let t = this._i.installs;
            try {
                return await t.state(e.build) || (await t.sweep(), await t.write(e.build, `downloading`), null)
            } catch (e) {
                throw new N(`storage_failed`, {
                    detail: String(e && e.message || e)
                }, {
                    cause: e
                })
            }
        }
        async _installed(e, t) {
            if (t !== `installed`) try {
                await this._i.installs.write(e.build, `installed`)
            } catch {}
        }
        model(e) {
            this._guard();
            let t = e && typeof e == `object` ? e.version : e;
            if (t != null && (typeof t != `string` || !rr.test(t))) throw P(`version ${JSON.stringify(t)} is not a model version (x.y.z)`);
            let n = t || null;
            if (this._opening && this._opening.pinned === n) return this._opening.promise;
            if (this._model && !this._model._closed && this._modelPinned === n) return Promise.resolve(this._model);
            let r = (async () => {
                this._model && !this._model._closed && await this._model.close();
                let e, t;
                try {
                    await this._beforeModelCall(), e = await this._allowedSource(n);
                    let r = await this._gate(e);
                    t = this._reader(e);
                    let i = await Ms({
                        reader: t,
                        platform: this._ql,
                        seams: this._i.seams,
                        folder: {
                            trustedKeys: this._i.modelKeys,
                            expect: {
                                version: e.version,
                                build: e.build
                            }
                        },
                        onClose: e => {
                            this._model === e && (this._model = null), this._purgeOwed() && this._purge()
                        },
                        onDrop: () => {
                            this._droppedChunks++
                        }
                    });
                    if (this._ql.modelRefusal) throw await i.close().catch(() => {}), await this._purge(), this._ql.modelRefusal;
                    return await this._installed(e, r), this._model = i, this._modelPinned = n, this._ql.modelOpened({
                        revision: i.version,
                        build: i.build,
                        context: i.defaultContext,
                        backend: `cpu`
                    }, {
                        loadMs: i.loadMs,
                        delivery: t.stats
                    }), i
                } catch (e) {
                    await this._failRefused(e, {
                        fallback: `engine_failed`
                    })
                }
            })();
            this._opening = {
                pinned: n,
                promise: r
            };
            let i = () => {
                this._opening && this._opening.promise === r && (this._opening = null)
            };
            return r.then(i, i), r
        }
        async prefetch({
            unmeteredOnly: e = !1,
            onProgress: t = null,
            version: n = null
        } = {}) {
            if (this._guard(), t !== null && typeof t != `function`) throw P(`onProgress must be a function`);
            try {
                await this._beforeModelCall();
                let r = await this._allowedSource(n),
                    i = await this._gate(r),
                    a = new Map,
                    o = 0,
                    s = () => {
                        t && t({
                            bytesDone: [...a.values()].reduce((e, t) => e + t, 0),
                            bytesTotal: o
                        })
                    },
                    c = this._reader(r, e => {
                        a.has(e.path) && (a.set(e.path, Math.min(l.get(e.path), Math.round(e.loaded / (e.total || 1) * l.get(e.path)))), s())
                    }),
                    l = new Map,
                    u = await Fr.open(c, {
                        verify: `on-read`,
                        requireSignature: !0,
                        requireVersion: !0,
                        engineFormats: [3],
                        trustedKeys: this._i.modelKeys,
                        expect: {
                            version: r.version,
                            build: r.build
                        }
                    }),
                    d = this._prefetchPaths(u);
                for (let e of d) {
                    let t = u.entry(e),
                        n = t.stored ? t.stored.size : t.size;
                    l.set(e, n), o += n, a.set(e, 0)
                }
                let f = [];
                for (let e of d) await c.cached(e) && (a.set(e, l.get(e)), f.push(e));
                s();
                let p = () => ({
                    bytesDone: [...a.values()].reduce((e, t) => e + t, 0),
                    bytesTotal: o,
                    complete: f.length === d.length
                });
                if (f.length === d.length) return this._stillRefused(), await this._installed(r, i), p();
                if (e && [`metered`, `none`].includes(this._connection())) return p();
                for (let e of d) f.includes(e) || (await u.read(e), a.set(e, l.get(e)), f.push(e), s());
                return c.stats.bytesDownloaded > 0 && this._ql.telemetry.download({
                    revision: r.version,
                    build: r.build,
                    profile: `web-cpu`,
                    bytes: c.stats.bytesDownloaded,
                    success: !0,
                    resumed: c.stats.rangesResumed > 0
                }), this._stillRefused(), await this._installed(r, i), p()
            } catch (e) {
                await this._failRefused(e, {
                    fallback: `download_failed`
                })
            }
        }
        _prefetchPaths(e) {
            let t = e.manifest,
                n = this._ql.config,
                r = n && n.inference && n.inference.context,
                i = Ai(t, {
                    context: typeof r == `string` && t.contexts.includes(r) ? r : t.default_context,
                    platform: `web`
                }).filter(t => ![`expected`, `reference`, `selftest`].includes(e.entry(t).role));
            return e.has(`selftest/selftest.json`) && i.push(`selftest/selftest.json`), i
        }
        _connection() {
            let e = globalThis.navigator,
                t = this._i.connection === void 0 ? e && e.connection : this._i.connection;
            return t && (t.type === `none` || t.online === !1) || this._i.connection === void 0 && e && e.onLine === !1 ? `none` : t ? t.saveData === !0 || t.metered === !0 || t.type === `cellular` ? `metered` : t.type === `wifi` || t.type === `ethernet` ? `unmetered` : `unknown` : `unknown`
        }
        storage() {
            return this._guard(), this._storage()
        }
        async _storedContext(e) {
            if (!e || !e.build) return null;
            try {
                let t = this._i.store;
                for (let n of await t.keys(`manifest/`)) {
                    let r = await t.get(n);
                    if (!r || (await vr(r)).slice(0, 40) !== e.build) continue;
                    let i = JSON.parse(new TextDecoder().decode(r));
                    return ws(null, this._ql.config, i).context || null
                }
            } catch {}
            return null
        }
        async _storage() {
            let e = this._i.store,
                t = {
                    models: [],
                    sharingQueueBytes: 0
                };
            try {
                let n = new Set(await e.keys(`sha256/`));
                for (let r of await e.keys(`manifest/`)) {
                    let i = await e.get(r),
                        a = null;
                    try {
                        a = JSON.parse(new TextDecoder().decode(i))
                    } catch {
                        a = null
                    }
                    if (!a || !Array.isArray(a.files) || typeof a.version != `string` || !rr.test(a.version)) continue;
                    let o = i.length;
                    for (let e of a.files) {
                        let t = e.encoding === `gzip` && e.decoded ? e.decoded : e;
                        n.has(`sha256/${String(t.sha256).toLowerCase()}`) && (o += t.size)
                    }
                    t.models.push({
                        version: a.version,
                        build: (await vr(i)).slice(0, 40),
                        bytes: o
                    })
                }
                t.models.sort((e, t) => Vr(e.version, t.version) || (e.build < t.build ? -1 : +(e.build > t.build)))
            } catch {}
            try {
                let e = await this._sharingStorage();
                if (e)
                    for (let n of await e.sessions())
                        for (let r of await e.list(n)) {
                            let i = await e.read(n, r);
                            t.sharingQueueBytes += i ? i.length : 0
                        }
            } catch {}
            return t
        }
        async _sharingStorage() {
            if (this._i.sharingStorage) return this._i.sharingStorage;
            let {
                outbox: e
            } = await U(async () => {
                let {
                    outbox: e
                } = await import(/* @vite-ignore */ sdkAssets.sharing);
                return {
                    outbox: e
                }
            }, __vite__mapDeps([0, 1])), t = await e.sharing();
            return t ? t.storage : null
        }
        async removeModels() {
            this._guard(), this._model && !this._model._closed && await this._model.close();
            let e = this._i.store;
            try {
                await Fi(e), this._i.state.set(`model.last`, null), this._i.state.set(Ls, null)
            } catch (e) {
                throw this._fail(new N(`storage_failed`, {
                    detail: String(e && e.message || e)
                }, {
                    cause: e
                }))
            }
        }
        async diagnose() {
            let e = this._ql,
                t = this._i,
                n = Gr(e.config),
                r = e.stopped,
                i = e.stoppedError || e.refusedError || e.modelRefusal || null,
                a = i ? F(i, {
                    sdk: I
                }).code : null,
                o = r || i ? {
                    accepted: !1,
                    reason: a === `invalid_key` || a === `sdk_too_old` ? a : a ? `server_rejected` : r === `invalid_key` || r === `unauthorized` ? `invalid_key` : r === `sdk_too_old` ? `sdk_too_old` : `server_rejected`
                } : {
                    accepted: e.keyAccepted ? !0 : null,
                    reason: null
                },
                s = t.state.get(`config`),
                c = e.clock(),
                l = e.config && e.config.expires_at * 1e3 > c,
                u = this._model && !this._model._closed ? this._model : null,
                d = t.state.get(`model.last`),
                f = u ? null : await this._storedContext(d);
            return {
                sdk: {
                    version: I,
                    latest: n && rr.test(n.version) ? n.version : null
                },
                key: o,
                config: l ? `fresh` : e.config || s && s.cfg ? `stale` : `none`,
                model: u ? {
                    version: u.version,
                    build: u.build,
                    verified: !0
                } : d && d.version ? {
                    version: d.version,
                    build: d.build,
                    verified: !1
                } : null,
                context: u ? u.defaultContext : f,
                backend: u || f ? {
                    ...ms
                } : null,
                microphone: await bs(t.seams && t.seams.microphone || {}),
                storage: await this._storage(),
                lastError: this._lastError,
                droppedChunks: this._droppedChunks,
                connection: this._connection()
            }
        }
        background() {
            return this._closed ? Promise.resolve() : this._ql.background().then(() => {}, () => {})
        }
        foreground() {
            this._closed || this._ql.foreground()
        }
        async close() {
            if (!this._closed) {
                this._closed = !0;
                try {
                    this._opening && await this._opening.promise.catch(() => {}), this._model && !this._model._closed && await this._model.close(), await this._ql.sendTelemetry(`close`, {
                        keepalive: !0
                    }).catch(() => {}), this._ql.stopSchedule(), this._ql.stopRefresh()
                } finally {
                    Rs === this && (Rs = null)
                }
            }
        }
    };

function Bs(e) {
    let t = e._ql,
        n = e._i.ctl,
        r = () => {
            if (!t.sharingAllowed()) throw new N(`sharing_unavailable`)
        };
    return Object.freeze({
        get isAvailable() {
            return t.sharingAllowed()
        },
        get isOn() {
            return n.state.s.consent === `granted`
        },
        setOn(e) {
            return e && r(), Promise.resolve(n.setSharing(!!e)).then(() => {})
        },
        async ask() {
            return r(), n.askNow()
        },
        feed(e, t) {
            typeof n.feed == `function` && n.feed(e, t)
        },
        async items() {
            return n.outbox ? n.outbox.items() : []
        },
        summary() {
            return t.contributionSummary()
        },
        delete() {
            return n.deleteShared()
        },
        get recoveryCode() {
            return n.recoveryCode()
        },
        setWording(e) {
            try {
                return n.setWording(e)
            } catch (e) {
                throw F(e, {
                    fallback: `invalid_argument`
                })
            }
        }
    })
}

async function Vs(e, t = {}) {
    if (Rs) throw new N(`client_exists`);
    let n = e || {};
    if (typeof n.key != `string` || !/^qlk_v1_/.test(n.key)) throw P(`a developer key qlk_v1_... is needed (from sdk.quranlab.ai)`);
    for (let e of [`appId`, `appVersion`, `storage`])
        if (n[e] !== void 0 && n[e] !== null && typeof n[e] != `string`) throw P(`${e} must be a string`);
    if (n.analytics !== void 0 && n.analytics !== `on` && n.analytics !== `off`) throw P(`analytics must be 'on' or 'off'`);
    if (n.audience !== void 0 && n.audience !== `general` && n.audience !== `children`) throw P(`audience must be 'general' or 'children'`);
    let r = Gn();
    if (r && !n.appId && !t.origin) throw P(`appId is needed outside a browser (the app id of your desktop key)`);
    let i = {};
    Rs = i;
    try {
        let e = t.state,
            i = t.store,
            a = t.sharingStorage || null;
        if (r && (!e || !i)) {
            let {
                path: t,
                os: r,
                dirStore: o
            } = Kn(), s = n.storage || t.join({}.XDG_CACHE_HOME || t.join(r.homedir(), `.cache`), `quranlab`, `tajweedformer`);
            try {
                e ||= await Xn(t.join(s, `state`)), i ||= o(t.join(s, `models`)), a ||= await (await U(async () => {
                    let {
                        dirStorage: e
                    } = await import(/* @vite-ignore */ sdkAssets.outbox);
                    return {
                        dirStorage: e
                    }
                }, [])).dirStorage(t.join(s, `sharing`))
            } catch (e) {
                throw new N(`storage_failed`, {
                    detail: String(e && e.message || e)
                }, {
                    cause: e
                })
            }
        }
        e ||= Yn(n.storage ? `quranlab.${n.storage}.` : `quranlab.`), i ||= await Oi();
        let o = t.platform || (r ? {
                win32: `windows`,
                darwin: `macos`
            } [process.platform] || `linux` : `web`),
            s = new vi({
                key: n.key,
                appVersion: n.appVersion,
                bundleId: n.appId || t.origin || void 0,
                platform: o,
                origin: t.origin,
                analytics: n.analytics,
                audience: n.audience,
                state: e,
                fetch: t.fetch,
                clock: t.clock,
                apiUrl: t.apiUrl,
                modelsUrl: t.modelsUrl,
                trustedKeys: t.trustedKeys,
                lifecycle: t.lifecycle,
                autoSend: t.autoSend,
                debug: t.debug
            });
        a && (s.sharingStorage = a), t.sharing && (s.sharingSeams = t.sharing);
        let c = wo(s, t.sharingOptions || {}),
            l = new na({
                store: i,
                deviceKey: t.installKey || ta(i)
            }),
            u = new zs({
                ql: s,
                ctl: c,
                state: e,
                store: i,
                installs: l,
                sharingStorage: a,
                fetch: s.fetch,
                seams: t,
                modelKeys: t.modelKeys || [`fc02fbd906608ebc206a371d8e61c1062ea555778b44b1ac834061043aee4a33`],
                connection: t.connection
            }, Is);
        return s.onModelStop = () => {
            u._purge()
        }, (s.modelRefusal || u._purgeOwed()) && await u._purge(), await s.launch(), u._purgeChain && await u._purgeChain, s.lastError && (u._lastError = F(s.lastError, {
            sdk: I,
            fallback: `download_failed`
        }).code), Rs = u, u
    } catch (e) {
        throw Rs === i && (Rs = null), F(e, {
            fallback: `storage_failed`
        })
    }
}

export { zs as TajweedClient };
