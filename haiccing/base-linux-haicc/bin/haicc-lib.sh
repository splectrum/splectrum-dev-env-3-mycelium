# haicc-lib.sh: what the haicc scripts share; sourced, never run.
#   HAICC_HOME   haicc's own folder: bin/, pins, sources.list, sources/, bare/
#   HAICC_WORK   the work folder: the boot mrepo and its package store
#                ($HAICC_HOME/work unless given)
# The pins (the pinned Bare, the organisation, the root mrepo) come from
# $HAICC_HOME/pins.
HAICC_HOME=${HAICC_HOME:-$(cd "$(dirname "$0")/.." && pwd)}
HAICC_WORK=${HAICC_WORK:-$HAICC_HOME/work}
. "$HAICC_HOME/pins"
HAICC_LIST=$HAICC_HOME/sources.list
HAICC_BARE=$HAICC_HOME/bare/bin/bare
# the boot mrepo: the root, where every command goes in
HAICC_ROOT=$HAICC_WORK/mrepos/$ROOT_NAME

fail () { printf 'haicc: %s\n' "$1" >&2; exit "${2:-1}"; }

# The sources registered, one a line: the folders first, in the order they
# were linked (folder:<path>), then https, the backup (github:<org>).
sources () {
  [ -f "$HAICC_LIST" ] || return 0
  grep '^folder:' "$HAICC_LIST" || true
  grep -v '^folder:' "$HAICC_LIST" || true
}
# The folders among them, in order.
folders () { sources | sed -n 's/^folder://p'; }
# A file (relative to a source) in the first folder that holds it: its path.
in_sources () {
  folders | while IFS= read -r _d; do
    if [ -f "$_d/$1" ]; then printf '%s\n' "$_d/$1"; break; fi
  done
}
sha512_of () { sha512sum "$1" | cut -d' ' -f1; }
# This machine's platform, as Bare names it.
platform () {
  _s=$(uname -s | tr 'A-Z' 'a-z'); _m=$(uname -m)
  case "$_m" in x86_64|amd64) _m=x64 ;; aarch64|arm64) _m=arm64 ;; esac
  printf '%s-%s\n' "$_s" "$_m"
}
