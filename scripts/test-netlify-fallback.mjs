#!/bin/bash
# Simulates Netlify: node on PATH, cwebp NOT
NODE_BIN="$(dirname "$(which node)")"
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$NODE_BIN"
if which cwebp > /dev/null 2>&1; then echo "ERROR: cwebp still visible"; exit 1; fi
echo "cwebp hidden, as on Netlify"
node scripts/generate.mjs