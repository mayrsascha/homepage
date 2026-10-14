#!/bin/bash
# Simulates the Netlify build image: node on PATH, but no cwebp/avifenc.
# --force makes generate.ts take the encoding path even though the stamp
# matches: locally it must fall back to the committed image files, and on
# CI/Netlify it must refuse (stale photos would deploy silently).
set -euo pipefail
NODE_BIN="$(dirname "$(which node)")"
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$NODE_BIN"
for tool in cwebp avifenc; do
  if command -v "$tool" > /dev/null 2>&1; then echo "ERROR: $tool still visible on PATH"; exit 1; fi
done
echo "cwebp and avifenc hidden, as on Netlify"

out="$(env -u CI -u NETLIFY node scripts/generate.ts --force)"
notes="$(grep -c '^NOTE: .* not available — using committed' <<< "$out" || true)"
if [ "$notes" -ne 8 ]; then echo "FAIL: expected 8 fallback notes, got $notes"; echo "$out"; exit 1; fi
echo "OK: without the encoders, all 8 images fall back to the committed files"

if CI=1 node scripts/generate.ts --force > /dev/null 2>&1; then
  echo "FAIL: on CI the stale-image guard didn't stop the build"; exit 1
fi
echo "OK: on CI the build refuses to use images that weren't re-encoded"
