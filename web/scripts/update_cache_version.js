const fs = require('fs');
const path = require('path');

// Resolve project root (two levels up from web/scripts/)
const rootDir = path.resolve(__dirname, '..', '..');

let ver = 'v' + Math.floor(Date.now() / 1000);
try {
  const pubPath = path.join(rootDir, 'pubspec.yaml');
  if (fs.existsSync(pubPath)) {
    const pub = fs.readFileSync(pubPath, 'utf8');
    const m = pub.match(/version:\s*([^\s]+)/);
    if (m) {
      const parts = m[1].split('+');
      ver = (parts[1] ? 'v' + parts[1] : parts[0]) + '-' + Math.floor(Date.now() / 1000);
    }
  }
} catch (e) {
  console.warn('[CacheVersion] Could not read pubspec.yaml, using timestamp version:', ver);
}

const files = [
  'web/sw.js',
  'build/web/sw.js'
];

let updatedCount = 0;
for (const relPath of files) {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const newContent = content.replace(
      /const CACHE_NAME = 'recite-quran-pwa-[^']*';/,
      `const CACHE_NAME = 'recite-quran-pwa-${ver}';`
    );
    if (newContent !== content) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      updatedCount++;
    }
  }
}

console.log(`[CacheVersion] Successfully stamped ${updatedCount} Service Worker file(s) with CACHE_NAME: ${ver}`);

