#!/bin/sh
# Try the boot's release from the command line: run from ~, its work folder
# ~/haicc-try (the boot mrepo, the store, the Bare it puts in place); the
# boot starts its runtime, which deploys the host inside it (main/host); the
# records followed in the terminal, one a line, as they move (kept as
# boot-output.jsonl), until Ctrl-C; then a pause to inspect it, then its
# runtimes stopped and everything cleaned up (also when stopped later with Ctrl-C).
#   sh haicc-try.sh [--yes]          (a copy in ~; --yes: no question asked)
# The release and its sources: the development repository's sources/ (built
# by tools/boot-release.js); its clone at HAICC_DEV, else
# ~/splectrum-dev-env-3-mycelium.
set -u
dev=${HAICC_DEV:-$HOME/splectrum-dev-env-3-mycelium}
sources=$dev/sources
release=$sources/haiccing/base-package-boot-linux-x64
try=$HOME/haicc-try

[ -x "$release" ] || { echo "no release at $release (build it: tools/bare tools/boot-release.js in $dev)"; exit 2; }
[ -e "$try" ] && { echo "$try is there already: remove it first"; exit 2; }

cleanup () {
  # its runtimes first (the boot's, the host's: started from inside the try's
  # folder): stopped by SIGTERM, waited for until their processes ended
  if pgrep -f -- "$try/" >/dev/null 2>&1; then
    pkill -TERM -f -- "$try/"
    i=0; while pgrep -f -- "$try/" >/dev/null 2>&1 && [ $i -lt 100 ]; do sleep 0.1; i=$((i+1)); done
    echo "stopped: its runtimes"
  fi
  # only the try's own folder, never anything else
  case "$try" in "$HOME"/haicc-try) rm -rf -- "$try" ;; esac
  echo "cleaned up: $try removed"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

cd "$HOME" || exit 1
echo "== the boot: $release"
echo "   work folder: $try"
echo "   its records follow, one a line (Ctrl-C: stop following)"
# The boot in the foreground (its question, if any, asked here), following
# the records until Ctrl-C; Ctrl-C ends the following, not this script.
out=$HOME/.haicc-try-output.jsonl
trap 'true' INT
{ trap 'true' INT; "$release" --work="$try" --sources=folder:"$sources" --follow "$@"; echo $? > "$out.code"; } | tee "$out"
trap 'exit 130' INT
code=$(cat "$out.code" 2>/dev/null || echo '?')
# (the records kept in the work folder, if there is one)
[ -d "$try" ] && mv "$out" "$try/boot-output.jsonl" || rm -f "$out"
rm -f "$out.code"
echo
echo "== exit code: $code"
if [ -d "$try" ]; then
  echo "== what it left in $try:"; ls -la "$try"
  echo "== the boot mrepo: $try/mrepos/boot"; ls -A "$try/mrepos/boot"
  [ -d "$try/mrepos/boot/main/host" ] && { echo "== the host, inside it: $try/mrepos/boot/main/host"; ls -A "$try/mrepos/boot/main/host"; }
  echo "== its runtimes:"; pgrep -af -- "$try/" || echo "(none running)"
fi
echo
printf 'press any key to clean up '
if [ -t 0 ]; then
  old=$(stty -g); stty -icanon -echo min 1; dd bs=1 count=1 >/dev/null 2>&1; stty "$old"
else
  read -r _ || true
fi
echo
