#!/bin/bash
set -e

cd "$(dirname "$0")/../.."

echo "========================================================"
echo "  Building and Deploying Natlu to natlu.pages.dev"
echo "========================================================"

echo ""
echo "[1/2] Running production build..."
bash web/scripts/build.sh

echo ""
echo "[2/2] Deploying build/web to Cloudflare Pages project: natlu ..."
npx --yes wrangler pages deploy build/web --project-name=natlu

echo ""
echo "========================================================"
echo "  Deployment Succeeded!"
echo "  Live URL: https://natlu.pages.dev"
echo "========================================================"

