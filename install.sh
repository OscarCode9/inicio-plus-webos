#!/usr/bin/env bash
# Updates the frontend on an already configured TV; never roots or changes boot.
set -euo pipefail
cd "$(dirname "$0")"
DEVICE="${DEVICE:-inicio-root}"
python3 scripts/build_inicio.py
mkdir -p build/packages
ares-package build/inicio-active -o build/packages
VERSION="$(python3 -c 'import json; print(json.load(open("app/appinfo.json"))["version"])')"
ares-install -d "$DEVICE" "build/packages/com.gathin.tvhome_${VERSION}_all.ipk"
ares-launch -d "$DEVICE" com.gathin.tvhome
