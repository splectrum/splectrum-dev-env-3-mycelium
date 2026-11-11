#!/bin/sh
# Try the boot's release from the command line, as a test that ends by
# itself: run from ~, its work folder ~/haicc-try. The boot puts everything
# in place and starts its runtime, which deploys the host inside it
# (main/host); the records follow in the terminal, one a line, until every
# request is done (the boot's --until-done; not in time: failed); then what
# was left is shown, the runtimes stopped, ~/haicc-try removed, and the exit
# code says passed (0) or failed. No key, no Ctrl-C needed; the same with or
# without a terminal.
#   sh haicc-try.sh [--yes] [--pause] [--until-done=<seconds>]
#     --yes     no question asked (Bare put in place if none is installed)
#     --pause   wait for a key before cleaning up (to inspect ~/haicc-try)
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

# The boot's arguments: ours taken out (--pause); --until-done unless given.
pause=no; until=--until-done; pass=''
for a in "$@"; do
  case "$a" in
    --pause) pause=yes ;;
    --until-done*) until=$a ;;
    *) pass="$pass $a" ;;
  esac
done

cleanup () {
  # its runtimes first (the boot's, the host's: Bare running a bundle inside
  # the try's folder; the pattern [/]bin/bare never matches this script's
  # shell): stopped by SIGTERM, waited for until their processes ended
  pat="[/]bin/bare $try/"
  if pgrep -f -- "$pat" >/dev/null 2>&1; then
    pkill -TERM -f -- "$pat"
    i=0; while pgrep -f -- "$pat" >/dev/null 2>&1 && [ $i -lt 100 ]; do sleep 0.1; i=$((i+1)); done
    echo "== stopped: its runtimes"
  fi
  # only the try's own folder, never anything else
  case "$try" in "$HOME"/haicc-try) rm -rf -- "$try" ;; esac
  echo "== cleaned up: $try removed"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

cd "$HOME" || exit 1
echo "== the boot: $release"
echo "   work folder: $try"
echo "   its records follow, one a line, until every request is done"
out=$HOME/.haicc-try-output.jsonl
# shellcheck disable=SC2086
{ "$release" --work="$try" --sources=folder:"$sources" "$until" $pass; echo $? > "$out.code"; } | tee "$out"
code=$(cat "$out.code" 2>/dev/null || echo 1)
[ -d "$try" ] && mv "$out" "$try/boot-output.jsonl" || rm -f "$out"
rm -f "$out.code"
echo
if [ -d "$try" ]; then
  echo "== what it left in $try:"; ls -la "$try"
  echo "== the boot mrepo: $try/mrepos/boot"; ls -A "$try/mrepos/boot"
  [ -d "$try/mrepos/boot/main/host" ] && { echo "== the host, inside it: $try/mrepos/boot/main/host"; ls -A "$try/mrepos/boot/main/host"; }
  echo "== its runtimes:"; pgrep -af -- "[/]bin/bare $try/" || echo "(none running)"
fi
case "$code" in
  0) echo "== passed: every request done" ;;
  4) echo "== failed: not every request done in time" ;;
  *) echo "== failed: the boot's exit code $code" ;;
esac
if [ "$pause" = yes ]; then
  printf '\npress any key to clean up\n'
  if [ -t 0 ]; then
    old=$(stty -g); stty -icanon -echo min 1; dd bs=1 count=1 >/dev/null 2>&1; stty "$old"
  else
    read -r _ || true
  fi
fi
exit "$code"
