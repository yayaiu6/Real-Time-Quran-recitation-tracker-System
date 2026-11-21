import { Ne, ze } from "./corpus.js";
import { searchPolicy } from "./search-policy.js";
import { ot, at, st } from "./phonetics.js";

var un = 5;

var dn = 1 << 18;

var fn = 5;

var pn = 400;

var mn = 24;

var hn = 16;

var gn = 32;

var _n = 20;

var vn = 8;

function yn(e) {
    let t = Ne(e);
    if (!t) throw Error(`not V4 notation: ${e}`);
    return ze(t)
}

var bn = yn(`ءaعUذuبiلAهiمiنaشaيطAنiرaجIم`);

var xn = yn(`بiسمiلAهiرaحمAنiرaحIم`);

var Sn = .3;

var Cn = 100;

function wn(e, t) {
    if (e.length > bn.length + 4) return !1;
    let n = bn.slice(0, Math.min(bn.length, e.length));
    return ot(t.encode(e), t.encode(n), t) <= .35
}

function Tn(e, t) {
    let n = 0,
        r = !1,
        i = 0;
    for (let a of [bn, xn]) {
        let o = t.encode(a),
            s = -1,
            c = 1 / 0;
        for (let r = a.length - 4; r <= a.length + 4; r++) {
            if (r <= 0 || n + r > e.length) continue;
            let i = ot(t.encode(e.slice(n, n + r)), o, t);
            i < c && (c = i, s = r)
        }
        s > 0 && c <= Sn && (a === xn && (r = !0, i = n), n += s)
    }
    return {
        offset: n,
        basmala: r,
        basmalaOffset: i
    }
}

export class PassageIndex {
        corpus;
        cfg;
        table;
        ids;
        bucketStart;
        postings;
        surahStartIdx;
        surahStartCorpus;
        constructor(corpus, policy = searchPolicy) {
            this.corpus = corpus;
            this.cfg = policy;
            this.table = at();
            const { surahs, wordStart, text } = corpus;
            this.surahStartIdx = new Int32Array(surahs.length);
            this.surahStartCorpus = new Int32Array(surahs.length);
            let size = Math.max(0, surahs.length - 1) * vn;
            for (const { firstWord, endWord } of surahs) size += wordStart[endWord] - wordStart[firstWord];
            this.ids = new Uint8Array(size);
            let offset = 0;
            for (const [index, { firstWord, endWord }] of surahs.entries()) {
                if (index > 0) {
                    this.ids.fill(this.table.unknownId, offset, offset + vn);
                    offset += vn;
                }
                const start = wordStart[firstWord], end = wordStart[endWord];
                this.surahStartIdx[index] = offset;
                this.surahStartCorpus[index] = start;
                this.ids.set(this.table.encode(text.slice(start, end)), offset);
                offset += end - start;
            }
            const count = Math.max(0, size - un + 1);
            const boundaries = new Int32Array(dn + 1);
            for (let position = 0; position < count; position++) {
                boundaries[1 + this.hashAt(this.ids, position)]++;
            }
            for (let bucket = 1; bucket <= dn; bucket++) boundaries[bucket] += boundaries[bucket - 1];
            this.bucketStart = boundaries;
            this.postings = new Int32Array(count);
            const cursor = boundaries.slice();
            for (let position = 0; position < count; position++) {
                const bucket = this.hashAt(this.ids, position);
                this.postings[cursor[bucket]++] = position;
            }
        }
        toCorpus(e) {
            let t = 0,
                n = this.surahStartIdx.length - 1;
            for (; t < n;) {
                let r = t + n + 1 >> 1;
                this.surahStartIdx[r] <= e ? t = r : n = r - 1
            }
            let r = e - this.surahStartIdx[t],
                i = this.corpus.surahs[t],
                a = this.corpus.wordStart[i.endWord] - this.surahStartCorpus[t];
            return this.surahStartCorpus[t] + Math.min(r, a)
        }
        hashAt(e, t) {
            let n = 2166136261;
            for (let r = 0; r < un; r++) n ^= e[t + r], n = Math.imul(n, 16777619);
            return n >>> 0 & 262143
        }
        search(query, hint = null, limit = 3) {
            if (query.length < this.cfg.searchMinChars) return { hits: [], decisive: false };
            const full = this.searchOnce(query, hint, limit);
            const tailStart = query.length - Cn;
            if (full.decisive || tailStart <= 0) return full;
            const tail = this.searchOnce(query.slice(tailStart), hint, limit);
            return tail.decisive ? this.shiftQuery(tail, tailStart) : full;
        }
        shiftQuery(result, offset) {
            for (const hit of result.hits) hit.queryStart += offset;
            return result;
        }
        searchOnce(query, hint, limit) {
            const empty = { hits: [], decisive: false };
            if (wn(query, this.table)) return empty;
            const { offset, basmala, basmalaOffset } = Tn(query, this.table);
            const body = query.slice(offset);
            if (body.length < this.cfg.searchMinChars) return empty;
            if (basmala) {
                const withBasmala = query.slice(basmalaOffset);
                const result = this.decide(this.searchRaw(withBasmala, hint, limit), withBasmala.length, 0);
                if (result.decisive && result.hits[0].queryStart <= 2) return this.shiftQuery(result, basmalaOffset);
            }
            const raw = this.searchRaw(body, hint, limit);
            if (!raw) return empty;
            if (!basmala) return this.decide(this.shiftQuery(raw, offset), body.length, 0);
            let restored = 0;
            for (const hit of raw.hits) {
                if (hit.surah === 1 && hit.ayah === 2 && hit.word <= 3) {
                    Object.assign(hit, this.corpus.ref(0), { refOffset: 0, queryStart: basmalaOffset });
                    if (hit === raw.best) restored = offset - basmalaOffset;
                } else {
                    hit.queryStart += offset;
                }
            }
            return this.decide(raw, body.length, restored);
        }
        decide(e, t, n) {
            if (!e) return {
                hits: [],
                decisive: !1
            };
            let {
                cfg: r
            } = this, i = t - e.bestQueryStart + n, a = e.rivals[0], o = e.best.distance <= r.searchDecisiveDistance && i >= _n && (a === void 0 || a.distance - e.best.distance >= r.searchDecisiveMargin);
            return {
                hits: e.hits,
                decisive: o
            }
        }
        seedWindows(query) {
            const votes = new Map();
            const { bucketStart, postings } = this;
            for (let offset = 0; offset <= query.length - un; offset++) {
                const hash = this.hashAt(query, offset);
                const start = bucketStart[hash], end = bucketStart[hash + 1];
                if (end - start > pn) continue;
                for (const position of postings.subarray(start, end)) {
                    const diagonal = (position - offset) >> fn;
                    votes.set(diagonal, (votes.get(diagonal) ?? 0) + 1);
                }
            }
            return [...votes.keys()].sort((a, b) => votes.get(b) - votes.get(a) || a - b)
                .slice(0, mn).map(diagonal => diagonal << fn);
        }
        alignWindow(query, center) {
            const start = Math.max(0, center - hn);
            const end = Math.min(this.ids.length, center + query.length + gn);
            if (end <= start) return null;
            const { queryStart, distance, refStart, refEnd: endInIndex } =
                st(query, this.ids, start, end, this.table);
            if (query.length - queryStart < this.cfg.searchMinChars) return null;
            const refOffset = this.toCorpus(refStart), refEnd = this.toCorpus(endInIndex);
            if (refEnd <= refOffset) return null;
            return { ...this.corpus.ref(this.corpus.wordAt(refOffset)), refOffset, refEnd, queryStart, distance };
        }
        searchRaw(text, hint, limit) {
            const query = this.table.encode(text);
            const scored = this.seedWindows(query).map(center => this.alignWindow(query, center)).filter(Boolean);
            return this.rankHits(scored, hint, limit);
        }
        rankHits(scored, hint, limit) {
            const ranked = scored.sort((a, b) => a.distance - b.distance || a.wordIndex - b.wordIndex);
            const distinct = [];
            for (const hit of ranked) {
                if (distinct.every(other => !(hit.refOffset < other.refEnd && other.refOffset < hit.refEnd))) {
                    distinct.push(hit);
                }
            }
            if (!distinct.length) return null;
            let [best, ...rivals] = distinct;
            if (hint) {
                const cutoff = best.distance + this.cfg.searchDecisiveMargin;
                const origin = this.corpus.ayahFirstWord(hint.surah, hint.ayah);
                const nearby = distinct.filter(hit => hit.distance <= cutoff && hit.surah === hint.surah);
                if (nearby.length) {
                    const proximity = hit => Math.abs(hit.wordIndex - origin);
                    best = nearby.reduce((chosen, hit) => {
                        const order = proximity(hit) - proximity(chosen) || hit.wordIndex - chosen.wordIndex;
                        return order < 0 ? hit : chosen;
                    });
                    rivals = distinct.filter(hit => hit !== best && !(hit.distance <= cutoff));
                }
            }
            const hits = [best, ...distinct.filter(hit => hit !== best)].slice(0, limit);
            return { hits, best, rivals, bestQueryStart: best.queryStart };
        }
    }
