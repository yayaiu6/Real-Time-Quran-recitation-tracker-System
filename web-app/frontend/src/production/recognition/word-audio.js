var ac = class e {
        constructor(output) {
            this.output = output;
        }
        cache = new Map;
        source = null;
        current = null;
        currentKey = null;
        token = 0;
        #pending = null;
        static MAX_CACHED = 200;
        onChange = null;
        static key(e, t, n) {
            return `${e}:${t}:${n}`
        }
        static url(e, t, n) {
            let r = e => String(e).padStart(3, `0`);
            return `https://audio.qurancdn.com/wbw/${r(e)}_${r(t)}_${r(n)}.mp3`
        }
        get playing() {
            return this.current
        }
        async play(surah, ayah, position) {
            const key = e.key(surah, ayah, position), previousKey = this.currentKey;
            const token = this.token + 1;
            this.stop();
            if (previousKey === key || token !== this.token) return 0;
            const context = this.output.context();
            if (!context || !this.output.ready()) return 0;
            let buffer = this.cache.get(key);
            if (!buffer) {
                buffer = await this.#load(context, e.url(surah, ayah, position), key, token);
                if (!buffer || token !== this.token) return 0;
                if (this.cache.size >= e.MAX_CACHED) {
                    this.cache.delete(this.cache.keys().next().value);
                }
                this.cache.set(key, buffer);
            }
            let source;
            try {
                source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.onended = () => { if (this.source === source) this.finish(); };
            } catch (error) {
                if (source) this.#disconnect(source);
                this.#unavailable(key, error);
                return 0;
            }
            this.source = source;
            this.current = { surah, ayah, position };
            this.currentKey = key;
            this.onChange?.(this.current);
            if (this.source !== source || this.token !== token) return 0;
            try {
                source.start();
            } catch (error) {
                if (this.source === source) this.finish();
                this.#unavailable(key, error);
                return 0;
            }
            return buffer.duration * 1e3;
        }
        async #load(context, url, key, token) {
            const controller = new AbortController();
            this.#pending = controller;
            try {
                const response = await fetch(url, { signal: controller.signal });
                if (token !== this.token) return null;
                if (!response.ok) throw Error(`HTTP ${response.status}`);
                const bytes = await response.arrayBuffer();
                if (token !== this.token) return null;
                return await context.decodeAudioData(bytes);
            } catch (error) {
                if (token === this.token) this.#unavailable(key, error);
                return null;
            } finally {
                if (this.#pending === controller) this.#pending = null;
            }
        }
        #unavailable(key, error) {
            console.warn(`[prompter] word audio unavailable (${key}):`, error);
        }
        #disconnect(source) {
            source.onended = null;
            try { source.disconnect(); } catch {}
        }
        stop() {
            this.token++;
            const pending = this.#pending;
            this.#pending = null;
            pending?.abort();
            const source = this.source;
            if (source) {
                source.onended = null;
                try { source.stop(); } catch {}
            }
            this.finish();
        }
        finish() {
            const source = this.source;
            this.source = null;
            if (source) this.#disconnect(source);
            if (this.current !== null) {
                this.current = null;
                this.currentKey = null;
                this.onChange?.(null);
            }
        }
    };

export { ac as WordAudio };
