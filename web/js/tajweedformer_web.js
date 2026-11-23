// web/js/tajweedformer_web.js
// 100% Offline Standalone WebAssembly TajweedFormer Engine for Natlu Web.

window.TajweedWebBridge = {
  wasmModule: null,
  modelPtr: null,
  streamPtr: null,
  audioBufPtr: null,
  audioBufCap: 0,
  idsBufPtr: null,
  tokens: [],
  onTranscription: null,
  isInitializing: false,
  isReady: false,

  async init(key) {
    if (this.isReady) return true;
    if (this.isInitializing) return false;
    this.isInitializing = true;

    try {
      console.log('TajweedWebBridge: Initializing offline WebAssembly engine...');

      // Dynamically locate where this script / assets are hosted
      let basePath = 'assets/packages/quran_tajweedformer/assets/web/';
      const currentScript = document.currentScript;
      if (currentScript && currentScript.src) {
        basePath = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
      } else {
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
          const s = scripts[i].src;
          if (s && s.includes('tajweedformer_web.js')) {
            basePath = s.substring(0, s.lastIndexOf('/') + 1);
            break;
          }
        }
      }

      console.log(`TajweedWebBridge: Using base path: ${basePath}`);

      // Load the standalone ES module compiled with Emscripten
      const { default: createTajweedFormer } = await import(basePath + 'tajweedformer.mjs');
      this.wasmModule = await createTajweedFormer({
        locateFile: (path) => basePath + path
      });

      const M = this.wasmModule;
      console.log(`TajweedWebBridge: WASM engine loaded! Version: ${M.UTF8ToString(M._zft_version())}`);

      // Prepare virtual filesystem inside WebAssembly
      try { M.FS.mkdir('/model'); } catch (_) {}
      try { M.FS.mkdir('/model/c16_l64'); } catch (_) {}

      // Model files to fetch from Flutter assets
      const modelFiles = [
        'tokens.txt',
        'calibration.json',
        'layers.zfw',
        'frontend.zfw',
        'c16_l64/frames.zfw',
        'c16_l64/model_engine2.onnx',
        'c16_l64/model_engine2.onnx.zfg',
        'c16_l64/model_engine2.onnx.zfg.bin'
      ];

      for (const rel of modelFiles) {
        let resp = await fetch(`assets/assets/model/${rel}`);
        if (!resp.ok) {
          resp = await fetch(`assets/model/${rel}`);
        }
        if (!resp.ok) {
          console.warn(`Could not load asset ${rel}: HTTP ${resp.status}`);
          continue;
        }
        const buf = new Uint8Array(await resp.arrayBuffer());
        M.FS.writeFile(`/model/${rel}`, buf);
      }

      // Parse tokens.txt for fast character mapping
      try {
        const tokensText = M.FS.readFile('/model/tokens.txt', { encoding: 'utf8' });
        this.tokens = tokensText.trim().split('\n').map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[0] === '<blk>' ? '' : (parts[0] === '|' ? ' ' : parts[0]);
        });
      } catch (e) {
        console.warn('Could not read tokens.txt from FS:', e);
      }

      // Open TajweedFormer V4 model
      const modelDirPtr = M.stringToNewUTF8('/model');
      const contextPtr = M.stringToNewUTF8('c16_l64');
      this.modelPtr = M._zft_model_open(modelDirPtr, contextPtr, 0, 16000);
      M._free(modelDirPtr);
      M._free(contextPtr);

      if (!this.modelPtr) {
        const err = M.UTF8ToString(M._zft_error());
        throw new Error(`_zft_model_open failed: ${err}`);
      }

      // Allocate reusable buffers
      this.audioBufCap = 16000 * 2; // 2 seconds float buffer
      this.audioBufPtr = M._malloc(this.audioBufCap * 4);
      this.idsBufPtr = M._malloc(512 * 4); // max 512 token IDs

      this.isReady = true;
      this.isInitializing = false;
      console.log('TajweedWebBridge: Offline WebAssembly engine ready!');
      return true;
    } catch (err) {
      this.isInitializing = false;
      console.error('TajweedWebBridge WASM initialization error:', err);
      return false;
    }
  },

  startSession(callback) {
    this.onTranscription = callback;
    if (!this.isReady || !this.modelPtr) return false;
    const M = this.wasmModule;

    if (this.streamPtr) {
      M._zft_stream_destroy(this.streamPtr);
      this.streamPtr = null;
    }

    this.streamPtr = M._zft_stream_create(this.modelPtr);
    return !!this.streamPtr;
  },

  pushAudio(float32Array) {
    if (!this.streamPtr || !this.isReady) return false;
    const M = this.wasmModule;

    const n = float32Array.length;
    if (n > this.audioBufCap) {
      M._free(this.audioBufPtr);
      this.audioBufCap = n * 2;
      this.audioBufPtr = M._malloc(this.audioBufCap * 4);
    }

    // Copy Float32 samples into WASM HEAP
    M.HEAPF32.set(float32Array, this.audioBufPtr >> 2);

    const pushed = M._zft_stream_push_audio(this.streamPtr, this.audioBufPtr, n);
    if (pushed < 0) {
      console.error('push_audio error:', M.UTF8ToString(M._zft_stream_error(this.streamPtr)));
      return false;
    }

    // Decode greedy tokens
    const maxTokens = 512;
    const nTokens = M._zft_stream_greedy(this.streamPtr, this.idsBufPtr, maxTokens);
    if (nTokens > 0) {
      const ids = new Int32Array(M.HEAP32.buffer, this.idsBufPtr, nTokens);
      let text = '';
      for (let i = 0; i < nTokens; i++) {
        const id = ids[i];
        if (id >= 0 && id < this.tokens.length) {
          text += this.tokens[id];
        }
      }
      if (this.onTranscription) {
        this.onTranscription(text.trim(), false);
      }
    }
    return true;
  },

  reset() {
    if (this.streamPtr) {
      this.wasmModule._zft_stream_reset(this.streamPtr);
    }
  },

  destroy() {
    if (this.streamPtr) {
      this.wasmModule._zft_stream_destroy(this.streamPtr);
      this.streamPtr = null;
    }
    this.onTranscription = null;
  }
};
