import { Ve, He, Ue, nt } from "./corpus.js";

var rt = class {
        alphabet;
        size;
        unknownId;
        ids = new Map;
        cost;
        constructor() {
            this.alphabet = Ve + He + Ue, this.size = this.alphabet.length + 1, this.unknownId = this.alphabet.length;
            for (let e = 0; e < this.alphabet.length; e++) this.ids.set(this.alphabet[e], e);
            this.cost = new Float32Array(this.size * this.size);
            for (let e = 0; e < this.size; e++)
                for (let t = 0; t < this.size; t++) this.cost[e * this.size + t] = e === this.unknownId || t === this.unknownId ? 1 : nt(this.alphabet[e], this.alphabet[t])
        }
        id(e) {
            return this.ids.get(e) ?? this.unknownId
        }
        encode(e) {
            let t = new Uint8Array(e.length);
            for (let n = 0; n < e.length; n++) t[n] = this.id(e[n]);
            return t
        }
        costOf(e, t) {
            return this.cost[e * this.size + t]
        }
    };

var it;

function at() {
    return it ??= new rt
}

function ot(query, reference, table) {
    if (!query.length || !reference.length) return Number(query.length !== reference.length);
    const row = Float32Array.from({ length: reference.length + 1 }, (_, column) => column);
    for (let q = 0; q < query.length; q++) {
        let diagonal = row[0];
        row[0] = q + 1;
        for (let r = 0; r < reference.length; r++) {
            const above = row[r + 1];
            const deletion = above + 1, insertion = row[r] + 1;
            const substitution = diagonal + table.costOf(query[q], reference[r]);
            row[r + 1] = substitution < deletion
                ? (substitution < insertion ? substitution : insertion)
                : (deletion < insertion ? deletion : insertion);
            diagonal = above;
        }
    }
    return row[reference.length] / Math.max(query.length, reference.length);
}

function st(query, reference, start, end, table, skipCost = .5) {
    const width = end - start + 1;
    const costs = new Float32Array(width);
    const refStarts = Int32Array.from({ length: width }, (_, column) => column);
    const queryStarts = new Int32Array(width);
    for (let q = 1; q <= query.length; q++) {
        const restart = q * skipCost;
        let diagonal = costs[0], diagonalRef = refStarts[0], diagonalQuery = queryStarts[0];
        costs[0] = restart;
        queryStarts[0] = q;
        for (let col = 1; col < width; col++) {
            const above = costs[col], aboveRef = refStarts[col], aboveQuery = queryStarts[col];
            let cost = diagonal + table.costOf(query[q - 1], reference[start + col - 1]);
            let ref = diagonalRef, first = diagonalQuery;
            const deletion = above + 1, insertion = costs[col - 1] + 1;
            if (deletion < cost) {
                cost = deletion;
                ref = aboveRef;
                first = aboveQuery;
            }
            if (insertion < cost) {
                cost = insertion;
                ref = refStarts[col - 1];
                first = queryStarts[col - 1];
            }
            if (restart < cost) {
                cost = restart;
                ref = col;
                first = q;
            }
            costs[col] = cost;
            refStarts[col] = ref;
            queryStarts[col] = first;
            diagonal = above;
            diagonalRef = aboveRef;
            diagonalQuery = aboveQuery;
        }
    }
    let last = 0;
    for (let col = 1; col < width; col++) if (costs[col] < costs[last]) last = col;
    const cost = costs[last];
    return { cost, distance: query.length ? cost / query.length : 1,
        refStart: start + refStarts[last], refEnd: start + last, queryStart: queryStarts[last] };
}

var ct = new Set([...`َُِڇؙۣ۪ٞۜـ`]);

function lt(e) {
    const chunks = [];
    let end = 0;
    while (end < e.length && ct.has(e[end])) end++;
    while (end < e.length) {
        const start = end++;
        const base = e[start];
        while (e[end] === base && end < e.length) end++;
        const marksStart = end;
        while (end < e.length && ct.has(e[end])) end++;
        chunks.push({ text: e.slice(start, end), base, repeatCount: marksStart - start,
            marks: e.slice(marksStart, end), start, end });
    }
    return chunks;
}

var ut = .1;

var dt = .25;

var ft = .1;

var pt = .25;

var mt = {
        ۦ: `ي`,
        ۥ: `و`,
        ں: `ن`,
        "۾": `م`,
        ٱ: `ا`,
        ى: `ي`
    };

var ht = new Set([...`ءأإآاؤئ`]);

var gt = [`ذدضتط`, `ظزذصسث`, `جزش`, `ةهت`, `قكغ`, `فبم`];

var _t = [
        [`ه`, `ح`],
        [`غ`, `خ`],
        [`ء`, `ع`],
        [`ن`, `م`],
        [`ن`, `ل`],
        [`ظ`, `ض`]
    ];

var vt = new Set([...`اوي`]);

var yt = (e, t) => e < t ? e + t : t + e;

var bt = new Set;

for (let e of gt) {
    let t = [...e];
    for (let e = 0; e < t.length; e++)
        for (let n = e + 1; n < t.length; n++) bt.add(yt(t[e], t[n]))
}

for (let [e, t] of _t) bt.add(yt(e, t));

function xt(e) {
    return mt[e] ?? e
}

function St(e, t) {
    if (e === t) return 0;
    let n = xt(e),
        r = xt(t);
    return n === r ? 0 : ht.has(n) && ht.has(r) ? ft : bt.has(yt(n, r)) ? pt : 1
}

function Ct(e, t) {
    return St(e, t) <= pt
}

function wt(e, t) {
    if (e.text === t.text) return 0;
    let n = St(e.base, t.base);
    return n >= 1 ? 1 : (e.marks !== t.marks && (n += ut), e.repeatCount !== t.repeatCount && !vt.has(xt(t.base)) && (n += dt), Math.min(n, 1))
}

function Tt(reference, heard, denominator = 1) {
    const size = reference.length, count = heard.length;
    if (!size || !count) {
        const empty = size === count;
        return { similarity: Number(empty), tailMatched: empty };
    }
    const row = Float64Array.from({ length: count + 1 }, (_, column) => column);
    let tailMatched = false;
    for (let word = 0; word < size; word++) {
        const last = word === size - 1;
        const target = reference[word];
        let diagonal = row[0];
        row[0] = word + 1;
        for (let j = 0; j < count; j++) {
            const above = row[j + 1];
            const substitution = diagonal + wt(heard[j], target);
            const deletion = above + 1;
            const best = Math.min(deletion, row[j] + 1, substitution);
            if (last) {
                if (best === substitution) tailMatched = xt(target.base) === xt(heard[j].base);
                else if (best === deletion) tailMatched = false;
            }
            row[j + 1] = best;
            diagonal = above;
        }
    }
    return { similarity: 1 - row[count] / Math.max(size, Math.max(denominator, 1)), tailMatched };
}

var Et = [
    [`ط`, `ق`],
    [`غ`, `ر`],
    [`ش`, `س`],
    [`م`, `ب`],
    [`ض`, `د`],
    [`ر`, `د`],
    [`ف`, `و`]
];

function Dt(e, t) {
    return e === t || Ct(e, t) ? !0 : Et.some(([n, r]) => n === e && r === t || n === t && r === e)
}

export { at, ot, st, lt, xt, Ct, Tt, Dt };
