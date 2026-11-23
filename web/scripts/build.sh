#!/bin/bash
set -e

# Always run from repository root
cd "$(dirname "$0")/../.."

echo "=== [1/5] Preparing Asset Placeholders for Web ==="
mkdir -p assets/model
touch assets/model/zipformer_p_arabic_v3.int8.onnx

echo "=== [2/5] Installing Flutter & Building Web App ==="
if ! command -v flutter &> /dev/null; then
    echo "Installing Flutter SDK (Stable)..."
    git config --global --add safe.directory "*" || true
    git clone https://github.com/flutter/flutter.git -b stable --depth 1 "$HOME/flutter"
    export PATH="$HOME/flutter/bin:$PATH"
    git config --global --add safe.directory "$HOME/flutter" || true
    flutter config --no-analytics
fi

flutter pub get
flutter build web --release --base-href "/" --pwa-strategy=none --no-web-resources-cdn --no-tree-shake-icons --dart-define=RECITATION_MODEL_URL="/download-model?model=zipformer_p_arabic_v3.int8.onnx"

echo "=== [3/5] Configuring Custom Service Worker & Local CanvasKit ==="
# Neutralize Flutter's default unregistering service worker stub to protect custom sw.js
echo "// Neutralized to protect custom sw.js" > build/web/flutter_service_worker.js

# Ensure local CanvasKit is used (works 100% offline without CDN dependencies)
node -e "const fs = require('fs'); const p = 'build/web/flutter_bootstrap.js'; if (fs.existsSync(p)) { let s = fs.readFileSync(p, 'utf8'); s = s.replace(/serviceWorkerSettings:\s*\{[\s\S]*?\}\s*,?/g, ''); s = s.replace('if (!window._flutter) {\n  window._flutter = {};\n}\n_flutter.buildConfig', 'var _flutter = window._flutter = window._flutter || {};\n_flutter.buildConfig'); s = s.replace(/\"builds\":/, '\"useLocalCanvasKit\":true,\"builds\":'); s = s.replace(/_flutter\.loader\.load\(\);?/, '_flutter.loader.load({config:{canvasKitBaseUrl:\"canvaskit/\"}});'); fs.writeFileSync(p, s, 'utf8'); }"

# Downlevel JS for broad device and mobile browser compatibility
for f in "build/web/flutter_bootstrap.js" "build/web/flutter.js"; do
  [ -f "$f" ] && npx --yes esbuild "$f" --target=es2018 --outfile="$f" --allow-overwrite 2>/dev/null || true
done
for f in "build/web/js/sherpa-onnx-wasm-main-asr.js"; do
  [ -f "$f" ] && npx --yes esbuild "$f" --target=es2020 --outfile="$f" --allow-overwrite 2>/dev/null || true
done

echo "=== [4/5] Stamping Service Worker Cache Version ==="
node web/scripts/update_cache_version.js

echo "=== [5/5] Setting Up Cloudflare Pages Artifacts ==="
cp web/cloudflare/_headers build/web/_headers 2>/dev/null || true
cp web/cloudflare/_redirects build/web/_redirects 2>/dev/null || true

# Provide all Cloudflare Pages Functions & .well-known files to root and output dir
mkdir -p functions build/web/functions build/web/.well-known
cp -R web/cloudflare/functions/* functions/ 2>/dev/null || true
cp -R web/cloudflare/functions/* build/web/functions/ 2>/dev/null || true
cp -R web/.well-known/* build/web/.well-known/ 2>/dev/null || true
cp web/cloudflare/wrangler.toml build/web/wrangler.toml 2>/dev/null || true
cp web/wasm/sherpa-onnx-wasm-main-asr.wasm build/web/sherpa-onnx-wasm-main-asr.wasm 2>/dev/null || true
rm -rf build/web/scripts build/web/cloudflare build/web/assets/packages/sherpa_onnx_web build/web/assets/assets/pages.tar.xz 2>/dev/null || true

echo "=== Build Complete! Deploy directory: build/web ==="
