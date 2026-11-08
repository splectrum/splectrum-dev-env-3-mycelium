#!/bin/sh
# The package writer into a scratch folder (every package's tests first:
# nothing written if one fails). Prints one JSON line: ok, the packages
# written with their hashes, the failed runs.
set -u
out=$(mktemp -d)
tools/bare tools/package-writer/cli.js --out="$out" --quiet > "$out.json"
code=$?
node -e 'const r = JSON.parse(require("fs").readFileSync(process.argv[1])); console.log(JSON.stringify({ ok: r.ok, written: r.written.map(w => ({ package: w.package, hash: w.hash.slice(0, 12) })), failed: r.failed }))' "$out.json"
rm -rf "$out" "$out.json"
exit $code
