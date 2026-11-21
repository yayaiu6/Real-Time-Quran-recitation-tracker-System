function $s() {
    let e = new URLSearchParams(location.search),
        t = e.get(`audio`);
    return t ? {
        url: t,
        speed: Math.max(.25, Number(e.get(`speed`) ?? 1) || 1)
    } : null
}

async function ec(e, signal) {
    let t = await fetch(e, { signal }).then(t => {
            if (!t.ok) throw Error(`${e}: HTTP ${t.status}`);
            return t.arrayBuffer()
        }),
        n = await new OfflineAudioContext(1, 1, 16e3).decodeAudioData(t),
        r = Math.ceil((n.duration + 1) * 16e3),
        i = new OfflineAudioContext(1, r, 16e3),
        a = i.createBufferSource();
    return a.buffer = n, a.connect(i.destination), a.start(), (await i.startRendering()).getChannelData(0).slice(0)
}

function recordedCapture(samples, speed, { onChunk, onLive }) {
    const chunkSize = 7680;
    let active = null;
    return {
        get running() { return active !== null; },
        async start() {
            if (active) return;
            const run = active = { timer: null, offset: 0, live: false };
            run.timer = window.setInterval(() => {
                if (active !== run) return;
                const chunk = new Float32Array(chunkSize);
                if (run.offset < samples.length) chunk.set(samples.subarray(run.offset, run.offset + chunkSize));
                run.offset += chunkSize;
                if (!run.live) {
                    run.live = true;
                    onLive();
                }
                if (active === run) onChunk(chunk);
            }, 480 / speed);
        },
        async stop() {
            const run = active;
            active = null;
            if (run) clearInterval(run.timer);
        },
    };
}

async function hc(signal) {
    let e = $s();
    if (!e) return;
    let t = await ec(e.url, signal);
    console.log(`[reader] dev audio: ${e.url} (${(t.length/16e3).toFixed(1)} s at ${e.speed}×)`);
    return callbacks => recordedCapture(t, e.speed, callbacks);
}

export { $s as audioQuery, hc as captureFromAudioQuery };
