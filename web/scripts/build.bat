@echo off
setlocal
cd /d "%~dp0\..\.."

echo === [1/5] Preparing Asset Placeholders for Web ===
if not exist assets\model mkdir assets\model
type nul > assets\model\zipformer_p_arabic_v3.int8.onnx

echo === [2/5] Building Flutter Web App ===
call flutter pub get
call flutter build web --release --base-href "/" --pwa-strategy=none --no-web-resources-cdn --no-tree-shake-icons --dart-define=RECITATION_MODEL_URL="/download-model?model=zipformer_p_arabic_v3.int8.onnx"

echo === [3/5] Configuring Custom Service Worker and Local CanvasKit ===
echo // Neutralized to protect custom sw.js > build\web\flutter_service_worker.js

node -e "const fs = require('fs'); const p = 'build/web/flutter_bootstrap.js'; if (fs.existsSync(p)) { let s = fs.readFileSync(p, 'utf8'); s = s.replace(/serviceWorkerSettings:\s*\{[\s\S]*?\}\s*,?/g, ''); s = s.replace('if (!window._flutter) {\n  window._flutter = {};\n}\n_flutter.buildConfig', 'var _flutter = window._flutter = window._flutter || {};\n_flutter.buildConfig'); s = s.replace(/\"builds\":/, '\"useLocalCanvasKit\":true,\"builds\":'); s = s.replace(/_flutter\.loader\.load\(\);?/, '_flutter.loader.load({config:{canvasKitBaseUrl:\"canvaskit/\"}});'); fs.writeFileSync(p, s, 'utf8'); }"

echo === [4/5] Stamping Service Worker Cache Version ===
node web\scripts\update_cache_version.js

echo === [5/5] Setting Up Cloudflare Pages Artifacts ===
if exist web\cloudflare\_headers copy /Y web\cloudflare\_headers build\web\_headers >nul
if exist web\cloudflare\_redirects copy /Y web\cloudflare\_redirects build\web\_redirects >nul
if not exist functions mkdir functions
if not exist build\web\functions mkdir build\web\functions
if exist web\cloudflare\functions xcopy /E /I /Y web\cloudflare\functions functions >nul
if exist web\cloudflare\functions xcopy /E /I /Y web\cloudflare\functions build\web\functions >nul
if exist web\.well-known xcopy /E /I /Y web\.well-known build\web\.well-known >nul
if exist web\cloudflare\wrangler.toml copy /Y web\cloudflare\wrangler.toml build\web\wrangler.toml >nul
if exist web\wasm\sherpa-onnx-wasm-main-asr.wasm copy /Y web\wasm\sherpa-onnx-wasm-main-asr.wasm build\web\sherpa-onnx-wasm-main-asr.wasm >nul
if exist build\web\assets\packages\sherpa_onnx_web rmdir /s /q build\web\assets\packages\sherpa_onnx_web
if exist build\web\assets\assets\pages.tar.xz del /f /q build\web\assets\assets\pages.tar.xz
if exist build\web\scripts rmdir /s /q build\web\scripts
if exist build\web\cloudflare rmdir /s /q build\web\cloudflare

echo === Build Complete! Output directory: build\web ===
