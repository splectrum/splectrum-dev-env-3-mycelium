#!/bin/sh
# Record a step's part: run its cases and write its record. For every step
# from step 1 (step 0 has its own, with the probes' module versions).
#   steps/record.sh <step-folder> <part> <case-name>=<command> ...
# Run from the dev repository's root, committed (the unit names the
# commit). Each case runs from the repository's root and prints one JSON
# line last; <step>/<part>/record/results.jsonl gets one line per case
# ({ case, command, exit, ms, result }), record/unit.json the invocation,
# the states by commit, the environment and the nondeterministic inputs.
set -eu
step=$1
part=$2
shift 2
root=$(pwd)
rec=$root/steps/$step/$part/record
mkdir -p "$rec"
results=$rec/results.jsonl
: > "$results"
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
for c in "$@"; do
  name=${c%%=*}
  cmd=${c#*=}
  t0=$(date +%s%3N)
  set +e
  out=$(cd "$root" && sh -c "$cmd" 2>"$rec/$name.stderr")
  code=$?
  set -e
  t1=$(date +%s%3N)
  [ -s "$rec/$name.stderr" ] || rm -f "$rec/$name.stderr"
  line=$(printf '%s\n' "$out" | tail -1)
  printf '%s' "$line" | node -e 'JSON.parse(require("fs").readFileSync(0, "utf8"))' 2>/dev/null || line=null
  printf '{"case":"%s","command":"%s","exit":%s,"ms":%s,"result":%s}\n' \
    "$name" "$(printf '%s' "$cmd" | sed 's/\\/\\\\/g; s/"/\\"/g')" "$code" "$((t1 - t0))" "$line" >> "$results"
done
dev=$(git rev-parse HEAD)$( [ -z "$(git status --porcelain -- . ":!steps/$step/$part/record")" ] || echo '+uncommitted')
cat > "$rec/unit.json" <<JSON
{
  "invocation": "steps/record.sh $step $part $(printf '%s ' "$@" | sed 's/\\/\\\\/g; s/"/\\"/g')",
  "state": { "dev": "$dev", "pendingDefault": "$(git rev-parse --short origin/pending/default)" },
  "environment": {
    "node": "$(node --version)",
    "bare": "$(bare --version)",
    "git": "$(git --version)",
    "os": "$(uname -sr)",
    "docker": "$(docker info --format '{{.ServerVersion}}' 2>/dev/null | grep . || echo none)"
  },
  "nondeterministic": { "started": "$started", "finished": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
}
JSON
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' "$rec/unit.json"
echo "recorded $step/$part"
