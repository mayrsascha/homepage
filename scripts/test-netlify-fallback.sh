#!/bin/bash
# Simulates the Netlify build image: node on PATH, but no cwebp/avifenc, so
# generate.mjs must fall back to the committed image files.
set -euo pipefail
NODE_BIN="$(dirname "$(which node)")"
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$NODE_BIN"
for tool in cwebp avifenc; do
  if command -v "$tool" > /dev/null 2>&1; then echo "ERROR: $tool still visible on PATH"; exit 1; fi
done
echo "cwebp and avifenc hidden, as on Netlify"
node scripts/generate.mjs
