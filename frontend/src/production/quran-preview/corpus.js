var ke = `_.|.ء.ب.ت.ث.ج.ح.خ.د.ذ.ر.ز.س.ش.ص.ض.ط.ظ.ع.غ.ف.ق.ك.ل.م.ن.ه.و.ي.ں.a.i.u.A.I.U.?`.split(`.`);

var Ae = `<blk>.|.ء.ب.ت.ث.ج.ح.خ.د.ذ.ر.ز.س.ش.ص.ض.ط.ظ.ع.غ.ف.ق.ك.ل.م.ن.ه.و.ي.ں.a.i.u.aa.ii.uu.<foreign>`.split(`.`);

var je = new Map(ke.map((e, t) => [e, t]));

function Ne(e) {
    let t = [];
    for (let n of e) {
        let e = je.get(n);
        if (e === void 0 || e <= 1) return null;
        t.push(e)
    }
    return t
}

var Pe = `َ`;

var Fe = `ِ`;

var Ie = `ُ`;

var Le = ke.map((e, t) => {
        switch (t) {
            case 31:
                return Pe;
            case 32:
                return Fe;
            case 33:
                return Ie;
            case 34:
                return `َاا`;
            case 35:
                return `ِۦۦ`;
            case 36:
                return `ُۥۥ`;
            case 0:
            case 1:
            case 37:
                return ``;
            default:
                return e
        }
    });

function Re(e) {
    return Le[e] ?? ``
}

function ze(e) {
    let t = ``;
    for (let n of e) t += Le[n] ?? ``;
    return t
}

var Be = class {
        text;
        wordStart;
        wordSurah;
        wordAyah;
        wordInAyah;
        surahs;
        wordCount;
        mushaf;
        plain;
        forms;
        parsed = new Map;
        tagged = new Map;
        markers;
        ayahFirst;
        ayahWords;
        constructor(data) {
            this.buildIndex(data);
        }
        buildIndex({ v, surahs }) {
            if (v !== 4) throw Error(`quran.json v${v} unsupported - this engine reads the V4 reference with its tajweed tags (v4)`);
            const count = surahs.reduce((sum, { ayahs }) =>
                ayahs.reduce((total, { w }) => total + w.length, sum), 0);
            this.wordCount = count;
            this.wordStart = new Int32Array(count + 1);
            for (const field of ["wordSurah", "wordAyah", "wordInAyah"]) this[field] = new Int32Array(count);
            for (const field of ["mushaf", "plain", "forms"]) this[field] = Array(count);
            this.markers = [];
            this.surahs = [];
            this.ayahFirst = [];
            this.ayahWords = [];
            const sounds = [];
            let offset = 0;
            for (const { n, name, nameEn, ayahs } of surahs) {
                const firstWord = sounds.length;
                const starts = new Int32Array(ayahs.length);
                const lengths = new Int32Array(ayahs.length);
                const markers = [];
                for (const [verse, { n: ayah, m, w }] of ayahs.entries()) {
                    if (ayah !== verse + 1) throw Error(`surah ${n}: ayah ${ayah} at index ${verse}`);
                    starts[verse] = sounds.length;
                    lengths[verse] = w.length;
                    markers.push(m);
                    for (const [word, [display, form, plain, tag]] of w.entries()) {
                        const index = sounds.length;
                        const delimiter = form.indexOf("|");
                        const spelling = Ne(delimiter < 0 ? form : form.slice(0, delimiter));
                        if (!spelling?.length) throw Error(`${n}:${ayah} w${word}: "${form}" is not V4 notation`);
                        const sound = ze(spelling);
                        if (tag) this.tagged.set(index, tag);
                        this.forms[index] = form;
                        this.wordStart[index] = offset;
                        this.wordSurah[index] = n;
                        this.wordAyah[index] = ayah;
                        this.wordInAyah[index] = word;
                        this.mushaf[index] = display;
                        this.plain[index] = plain;
                        sounds.push(sound);
                        offset += sound.length;
                    }
                }
                this.surahs.push({ n, name, nameEn, ayahCount: ayahs.length, firstWord, endWord: sounds.length });
                this.ayahFirst.push(starts);
                this.ayahWords.push(lengths);
                this.markers.push(markers);
            }
            this.wordStart[count] = offset;
            this.text = sounds.join("");
            if (this.text.length !== offset) throw Error(`phoneme offsets disagree`);
            if (this.surahs.length !== 114) throw Error(`${this.surahs.length} surahs`)
        }
        surah(e) {
            let t = this.surahs[e - 1];
            if (!t || t.n !== e) throw Error(`no surah ${e}`);
            return t
        }
        ayahCount(e) {
            return this.surah(e).ayahCount
        }
        hasAyah(e, t) {
            return !Number.isInteger(e) || e < 1 || e > this.surahs.length ? !1 : Number.isInteger(t) && t >= 1 && t <= this.surahs[e - 1].ayahCount
        }
        ayahOrdinal(e, t) {
            if (t < 1 || t > this.ayahCount(e)) throw Error(`no ayah ${e}:${t}`);
            let n = 0;
            for (let t = 1; t < e; t++) n += this.ayahCount(t);
            return n + t - 1
        }
        ayahFirstWord(e, t) {
            let n = this.ayahFirst[e - 1];
            if (!n || t < 1 || t > n.length) throw Error(`no ayah ${e}:${t}`);
            return n[t - 1]
        }
        ayahWordCount(e, t) {
            return this.ayahWords[e - 1][t - 1]
        }
        wordIndex(e, t, n) {
            let r = this.ayahFirstWord(e, t) + n;
            if (n < 0 || n >= this.ayahWordCount(e, t)) throw Error(`no word ${e}:${t} w${n}`);
            return r
        }
        wordAt(e) {
            if (e < 0) return 0;
            if (e >= this.text.length) return this.wordCount - 1;
            let lower = 1, upper = this.wordCount;
            while (lower < upper) {
                const middle = lower + ((upper - lower) >>> 1);
                if (this.wordStart[middle] <= e) lower = middle + 1;
                else upper = middle;
            }
            return lower - 1;
        }
        displayWord(e) {
            return this.mushaf[e]
        }
        plainWord(e) {
            return this.plain[e]
        }
        ayahMarker(e, t) {
            return this.markers[e - 1][t - 1] ?? ``
        }
        phonemes(e) {
            return this.text.slice(this.wordStart[e], this.wordStart[e + 1])
        }
        spellings(word) {
            const cached = this.parsed.get(word);
            if (cached) return cached;
            const variants = this.forms[word].split("|").map(Ne).filter(tokens => tokens?.length);
            this.parsed.set(word, variants);
            return variants;
        }
        tags(e) {
            const encoded = this.tagged.get(e);
            if (!encoded) return [];
            const tags = [];
            for (const field of encoded.split(";")) {
                const [offset, code, values] = field.split(":");
                const allowed = values ? values.split(",").map(Number) : [];
                tags.push({ position: Number(offset), kind: code === "q" ? "qalqalah" : code, allowed });
            }
            return tags;
        }
        isAyahStart(e) {
            return this.wordInAyah[e] === 0
        }
        isAyahEnd(e) {
            return e + 1 >= this.wordCount || this.wordInAyah[e + 1] === 0
        }
        ref(e) {
            return {
                surah: this.wordSurah[e],
                ayah: this.wordAyah[e],
                word: this.wordInAyah[e],
                wordIndex: e
            }
        }
    };

var Ve = `ءابتثجحخدذرزسشصضطظعغفقكلمنهويۥۦں۾ٲأإآؤئٱى`;

var He = `َُِ`;

var Ue = `ڇؙۣ۪ٞۜـ`;

var We = {
        ۦ: `ي`,
        ۥ: `و`,
        ں: `ن`,
        "۾": `م`,
        ٱ: `ا`,
        ى: `ي`
    };

var Ge = new Set(`ءأإآاؤئٲ`);

var Ke = [`ذدضتط`, `ظزذصسث`, `جزش`, `ةهت`, `قكغ`, `فبم`];

var qe = [
        [`ه`, `ح`],
        [`غ`, `خ`],
        [`ء`, `ع`],
        [`ن`, `م`],
        [`ن`, `ل`],
        [`ظ`, `ض`]
    ];

var Je = .1;

var Ye = .1;

var Xe = .25;

var Ze = .25;

function Qe(e) {
    return We[e] ?? e
}

function $e(e) {
    return He.includes(e)
}

function et(e) {
    return He.includes(e) || Ue.includes(e)
}

var tt = new Set;

for (let e of Ke)
    for (let t = 0; t < e.length; t++)
        for (let n = t + 1; n < e.length; n++) tt.add(e[t] < e[n] ? e[t] + e[n] : e[n] + e[t]);

for (let [e, t] of qe) tt.add(e < t ? e + t : t + e);

function nt(e, t) {
    if (e === t) return 0;
    let n = Qe(e),
        r = Qe(t);
    if (n === r) return 0;
    let i = et(n),
        a = et(r);
    if (i || a) return i && a ? $e(n) && $e(r) ? Ye : Ze : 1;
    if (Ge.has(n) && Ge.has(r)) return Je;
    let o = n < r ? n + r : r + n;
    return tt.has(o) ? Xe : 1
}

export { Ae as MODEL_TOKENS, Ne, Re as tokenText, ze, Be as QuranCorpus, Ve, He, Ue, nt };
export const createCorpus = data => new Be(data);
