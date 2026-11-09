#!/bin/sh
# Every module's own tests (its test script, run on Bare directly: brittle
# over test/*.test.js, as each module's package.json says), from the
# repository's root, installed (sh tools/install.sh). Prints one JSON line:
# the modules passed, failed, and those without a test script.
set -u
root=$(pwd)
PATH=$root/tools:$PATH; export PATH
passed=''; failed=''; none=''
for d in pear-full-square/*/ splectral/*/; do
  m=${d%/}
  [ -f "$m/package.json" ] || continue
  if ! grep -q '"test"' "$m/package.json"; then none="$none\"$m\","; continue; fi
  if (cd "$m" && timeout 600 "$root/tools/bare" "$root/node_modules/brittle/cmd.js" test/*.test.js >/dev/null 2>&1); then passed="$passed\"$m\","; else failed="$failed\"$m\","; fi
done
printf '{"passed":[%s],"failed":[%s],"noTest":[%s]}\n' "${passed%,}" "${failed%,}" "${none%,}"
