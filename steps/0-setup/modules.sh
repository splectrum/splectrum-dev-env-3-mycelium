#!/bin/sh
# Every module's own tests (npm test in each module folder that has one),
# from the repository's root, installed (npm ci). Prints one JSON line:
# the modules passed, failed, and those without a test script.
set -u
PATH=$(pwd)/tools:$PATH; export PATH
passed=''; failed=''; none=''
for d in pear-full-square/*/ splectral/*/; do
  m=${d%/}
  [ -f "$m/package.json" ] || continue
  if ! grep -q '"test"' "$m/package.json"; then none="$none\"$m\","; continue; fi
  if (cd "$m" && timeout 600 npm test >/dev/null 2>&1); then passed="$passed\"$m\","; else failed="$failed\"$m\","; fi
done
printf '{"passed":[%s],"failed":[%s],"noTest":[%s]}\n' "${passed%,}" "${failed%,}" "${none%,}"
