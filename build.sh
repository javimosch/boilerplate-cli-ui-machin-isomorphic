#!/usr/bin/env bash
# Build the isomorphic app: one wasm client + one native server binary that serves
# it. Needs machin v0.55.0+ and zig (the C->wasm compiler). The frameworks
# (machweb, flags, reactive) are vendored under src/.
set -euo pipefail
cd "$(dirname "$0")"
MACHIN="${MACHIN:-machin}"
command -v "$MACHIN" >/dev/null 2>&1 || { echo "error: '$MACHIN' not found (set MACHIN=/path/to/machin)"; exit 1; }

# 1. wasm CLIENT: reactive runtime + shared models + the client component.
"$MACHIN" encode src/reactive.src src/models.src src/client.src > client.mfl
"$MACHIN" build client.mfl --target wasm -o app.wasm
echo "built ./app.wasm ($(wc -c < app.wasm) bytes)"

# 2. embed the generic JS host as host_js() (JSON escaping == MFL string escaping).
python3 - <<'PY' > src/host_gen.src
import json
print('func host_js() (s) { s = ' + json.dumps(open('web/host.js').read()) + ' }')
PY

# 3. native SERVER: machweb + flags + shared models + styles + server + the host.
"$MACHIN" encode src/machweb.src src/flags.src src/models.src src/styles.src src/server.src src/host_gen.src > server.mfl
"$MACHIN" build server.mfl -o machin-poll
echo "built ./machin-poll"
echo "run:  ./machin-poll        (then open http://localhost:48096/)"
