#!/bin/sh
# HAICC's cold shutdown, for a work folder: run as <work>/shutdown (the
# stub). Everything HAICC made removed, back to the setup: every swarm (its
# nodes' shutdown, its folder), swarms.json, packages/ and ./haicc. Kept:
# haiccing/ (./boot sets it up again), log/ (the record), bare/ (Bare's
# runtime, as the setup placed it). Asked first (--yes agrees).
#   ./shutdown [--yes]
set -u
here=$(cd "$(dirname "$0")" && pwd)
haiccing=$(cd "$here/../../../.." && pwd)
work=$(dirname "$haiccing")
# The root's HAICC does it (it logs itself).
if [ -x "$work/haicc" ]; then HAICC_SHUTDOWN_AS=${HAICC_AS:-./shutdown}; export HAICC_SHUTDOWN_AS; exec "$work/haicc" shutdown --cold "$@"; fi
# No ./haicc: a root never finished; nothing of HAICC runs here. Its own
# files removed, in plain shell (said; to the log too).
mkdir -p "$work/log"
log=$(ls "$work/log" | grep -E '^[0-9]{8}T[0-9]{6}Z\.log$' | sort | tail -1)
if [ -z "$log" ] || [ "$(wc -c < "$work/log/$log")" -ge 10240 ]; then log=$(date -u +%Y%m%dT%H%M%SZ).log; fi
log=$work/log/$log
t0=$(cut -d' ' -f1 /proc/uptime)   # how long: a clock that never steps back
echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) ${HAICC_AS:-./shutdown} $*  (in $(pwd))" | tee -a "$log"
{
  echo "The work folder, cold: no ./haicc here (the root never finished booting); removing what is left: packages/, swarms.json"
  rm -rf "$work/packages" "$work/swarms.json" && echo "  removed packages/, swarms.json"
  echo "Kept: haiccing/, log/, bare/; ./boot sets it up again"
} 2>&1 | tee -a "$log"
echo "== exit 0, $(awk -v a="$t0" -v b="$(cut -d' ' -f1 /proc/uptime)" 'BEGIN { printf "%.1f", b - a }') s" | tee -a "$log"
