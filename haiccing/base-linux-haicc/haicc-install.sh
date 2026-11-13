#!/bin/sh
# haicc-install.sh: installs the haicc command on this machine. Generated
# (haiccing/base-linux-haicc: build.sh); not edited.
#   sh haicc-install.sh [--home=<folder>] [--bin=<folder>]
#     --home   haicc's own folder: its scripts, its pins, its sources list,
#              later its sources, Bare and the work folder
#              ($HAICC_HOME, else ~/.haicc)
#     --bin    where the command is registered, a folder on the PATH
#              (/usr/local/bin when it can be written, else ~/.local/bin)
# It carries the scripts and the pins only. Nothing is fetched: the sources
# and Bare come next (haicc sources ..., haicc prereq). Run again, it
# replaces the scripts and the pins and keeps everything else.
set -eu
home=${HAICC_HOME:-$HOME/.haicc}
bin=
for a in "$@"; do
  case "$a" in
    --home=*) home=${a#--home=} ;;
    --bin=*) bin=${a#--bin=} ;;
    *) echo "sh haicc-install.sh [--home=<folder>] [--bin=<folder>]" >&2; exit 2 ;;
  esac
done
if [ -z "$bin" ]; then
  if [ -d /usr/local/bin ] && [ -w /usr/local/bin ]; then bin=/usr/local/bin; else bin=$HOME/.local/bin; fi
fi
mkdir -p "$home/bin" "$bin"
home=$(cd "$home" && pwd)
bin=$(cd "$bin" && pwd)
cat > "$home/bin/haicc" <<'HAICC_INSTALL_FILE_END'
#!/bin/sh
# haicc: the command. It only dispatches.
#   haicc <URI> <protocol>/<action> <argument>...   an mrepo command: a URI
#       starts with / (the local root), so a first part starting with / is a
#       command for the mrepos; it goes to the boot mrepo's inbox
#       (haicc-request)
#   haicc <name> <argument>...                      a script command: the
#       script haicc-<name> beside this one (boot, prereq, sources)
set -u
here=$(cd "$(dirname "$0")" && pwd)
HAICC_HOME=${HAICC_HOME:-$(cd "$here/.." && pwd)}
export HAICC_HOME

usage () {
  cat <<'USAGE'
haicc <URI> <protocol>/<action> <argument>...   a command for the mrepos:
                                                go to this node position and
                                                execute the command that
                                                follows
haicc sources                                   the sources registered
haicc sources link <folder>                     a local folder linked as a source
haicc sources unlink <folder>
haicc sources download [<what>...]              fetched over https: bare,
                                                third-party, <org>, <org>/<package>
haicc sources https | no-https                  https as the backup, or not
haicc prereq [--check]                          what a boot needs, checked and
                                                put in place (--check: only checked)
haicc boot                                      the boot mrepo, at the root

  haicc / boot/deploy host base-component-haicc
  haicc /host service/initialise
  haicc /host service/start
USAGE
}

case "${1:-}" in
  /*) exec sh "$here/haicc-request" "$@" ;;
  ''|help|--help|-h) usage; exit 0 ;;
esac
name=$1; shift
case "$name" in
  *[!a-z0-9-]*|-*) echo "haicc: no command '$name' (haicc --help)" >&2; exit 2 ;;
esac
[ -f "$here/haicc-$name" ] || { echo "haicc: no command '$name' (haicc --help)" >&2; exit 2; }
exec sh "$here/haicc-$name" "$@"
HAICC_INSTALL_FILE_END
cat > "$home/bin/haicc-boot" <<'HAICC_INSTALL_FILE_END'
#!/bin/sh
# haicc boot: the boot mrepo put in place at the root, its runtime started.
# The boot package's bundle, from the sources, run with the Bare put in
# place: it builds the boot mrepo the first time, places its packages and
# starts its runtime (already there: kept, its runtime started again where
# it was stopped). Nothing is deployed by it: commands come next
# (haicc / boot/deploy host base-component-haicc).
# The prerequisites are checked first, never fetched or fixed here: one
# missing stops it (exit 3), pointing to haicc prereq.
#   haicc boot
# What the boot prints: its request, completed (a record), then its
# runtime's status. Exit: the boot's own.
set -u
. "$(dirname "$0")/haicc-lib.sh"
[ $# -eq 0 ] || fail "haicc boot (no arguments)" 2

if ! out=$(sh "$(dirname "$0")/haicc-prereq" --check); then
  printf '%s\n' "$out" | grep '^missing' >&2
  fail "a prerequisite is missing: haicc prereq" 3
fi
bundle=$(in_sources "$HAICC_ORG/$BOOT_PACKAGE.bundle")
# the sources, in order, as the boot takes them
set --
while IFS= read -r s; do
  [ -n "$s" ] && set -- "$@" "--sources=$s"
done <<LIST
$(sources)
LIST
exec "$HAICC_BARE" "$bundle" "--work=$HAICC_WORK" "$@" --no-follow
HAICC_INSTALL_FILE_END
cat > "$home/bin/haicc-lib.sh" <<'HAICC_INSTALL_FILE_END'
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
HAICC_INSTALL_FILE_END
cat > "$home/bin/haicc-prereq" <<'HAICC_INSTALL_FILE_END'
#!/bin/sh
# haicc prereq: what a boot needs, checked, and put in place where it is
# missing. Nothing is fetched: Bare is unpacked from the sources.
#   haicc prereq           checked; Bare put in place from the sources
#   haicc prereq --check   checked only, nothing changed
# A line a prerequisite: ok, or missing with how to get it. Exit 0 when all
# are there, 3 when one is missing.
#   platform   this machine's, the one the pinned Bare is for
#   tools      what the scripts use: tar, sha512sum
#   work       the work folder: can be made and written
#   sources    a folder registered that holds the boot package
#   bare       the pinned Bare, in haicc's folder, as pinned (its tarball's
#              sha512 recorded beside it)
set -u
. "$(dirname "$0")/haicc-lib.sh"
check=no
for a in "$@"; do
  case "$a" in --check) check=yes ;; *) fail "haicc prereq [--check]" 2 ;; esac
done
missing=0
ok () { printf 'ok       %s\n' "$1"; }
miss () { printf 'missing  %s\n' "$1"; missing=1; }

# platform
if [ "$(platform)" = "$BARE_PLATFORM" ]; then ok "platform: $BARE_PLATFORM"
else miss "platform: this is $(platform), the pinned Bare is for $BARE_PLATFORM"; fi

# tools
for t in tar sha512sum; do
  if command -v "$t" >/dev/null 2>&1; then ok "tool: $t"; else miss "tool: $t (install it)"; fi
done

# work
if [ "$check" = yes ]; then
  w=$HAICC_WORK; while [ ! -e "$w" ] && [ "$w" != / ] && [ "$w" != . ]; do w=$(dirname "$w"); done
  if [ -d "$w" ] && [ -w "$w" ]; then ok "work: $HAICC_WORK"; else miss "work: $HAICC_WORK cannot be written"; fi
elif mkdir -p "$HAICC_WORK" 2>/dev/null && [ -w "$HAICC_WORK" ]; then ok "work: $HAICC_WORK"
else miss "work: $HAICC_WORK cannot be written"; fi

# sources
boot=$(in_sources "$HAICC_ORG/$BOOT_PACKAGE.bundle")
if [ -n "$boot" ] && [ -f "$(dirname "$boot")/manifest.json" ]; then ok "sources: $(dirname "$(dirname "$boot")")"
else miss "sources: no folder registered holds $HAICC_ORG/$BOOT_PACKAGE.bundle (haicc sources link <folder>)"; fi

# bare
if [ -x "$HAICC_BARE" ] && [ -f "$HAICC_HOME/bare/tarball.sha512" ] && [ "$(cat "$HAICC_HOME/bare/tarball.sha512")" = "$BARE_SHA512" ]; then
  ok "bare: $BARE_VERSION, as pinned"
else
  tarball=$(in_sources "$BARE_FILE")
  if [ -z "$tarball" ]; then miss "bare: $BARE_FILE in no source (haicc sources download bare, or link a folder that has it)"
  elif [ "$(sha512_of "$tarball")" != "$BARE_SHA512" ]; then miss "bare: $tarball is not as pinned (sha512)"
  elif [ "$check" = yes ]; then miss "bare: not put in place yet (haicc prereq)"
  else
    rm -rf "$HAICC_HOME/bare"
    mkdir -p "$HAICC_HOME/bare"
    if tar -xzf "$tarball" -C "$HAICC_HOME/bare" --strip-components=1 && [ -f "$HAICC_BARE" ]; then
      chmod +x "$HAICC_BARE"
      printf '%s\n' "$BARE_SHA512" > "$HAICC_HOME/bare/tarball.sha512"
      ok "bare: $BARE_VERSION, put in place from $tarball"
    else
      rm -rf "$HAICC_HOME/bare"
      miss "bare: $tarball could not be unpacked"
    fi
  fi
fi

[ "$missing" -eq 0 ] || exit 3
HAICC_INSTALL_FILE_END
cat > "$home/bin/haicc-request" <<'HAICC_INSTALL_FILE_END'
#!/bin/sh
# haicc <URI> <protocol>/<action> <argument>...: a command for the mrepos.
# Go to this node position and execute the command that follows. A record is
# written into the boot mrepo's inbox folder, its response waited for in its
# outbox folder and printed.
# There is no mrepo context at the command line, so one rule of its own:
#   at the root    the command is written plain:
#                    haicc / boot/deploy host x   ->  boot/deploy host x
#                  (the mrepo joins the name to the position: /host)
#   anywhere else  the haicc command is written as it is; the boot mrepo
#                  resolves the position:
#                    haicc /host service/start    ->  haicc /host service/start
# The parts go as typed, unnamed; the mrepo interprets them.
# Prints the command's output (JSON) and exits 0; its error on stderr, exit 1.
#   HAICC_TIMEOUT   seconds to wait for the response (120); none in time:
#                   exit 4 (the request stays; its key is said)
#   HAICC_RECORD=1  the whole response record printed, not its output alone
set -u
. "$(dirname "$0")/haicc-lib.sh"
[ $# -ge 2 ] || fail "haicc <URI> <protocol>/<action> <argument>... (a command follows the URI)" 2
[ -d "$HAICC_ROOT/inbox" ] || fail "no boot mrepo at $HAICC_WORK (haicc boot)" 3

uri=$1; shift
if [ "$uri" = / ]; then :; else set -- haicc "$uri" "$@"; fi

# A part as a JSON string.
tab=$(printf '\t')
json_string () {
  case "$1" in *"
"*) fail "an argument with a line break cannot be sent" 2 ;; esac
  printf '"%s"' "$(printf '%s' "$1" | tr -d '\001-\010\013\014\016-\037' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e "s/$tab/\\\\t/g")"
}
parts=''
for p in "$@"; do
  parts="$parts${parts:+,}$(json_string "$p")"
done

if [ -r /proc/sys/kernel/random/uuid ]; then key=$(cat /proc/sys/kernel/random/uuid)
elif command -v uuidgen >/dev/null 2>&1; then key=$(uuidgen | tr 'A-Z' 'a-z')
else fail "no way to make a key (no /proc/sys/kernel/random/uuid, no uuidgen)" 3; fi
now=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

# The record: the command, in its core (where the completed form goes back:
# the terminal), in an envelope addressed to the root's inbox. Written
# whole, then renamed into place: the runtime never sees half of one.
file=$HAICC_ROOT/inbox/$key.json
printf '{"topic":"/%s/inbox","key":"%s","timestamp":"%s","headers":{},"value":{"topic":"/haicc/terminal","key":"%s","timestamp":"%s","headers":{},"value":[%s]}}\n' \
  "$ROOT_URI" "$key" "$now" "$key" "$now" "$parts" > "$file.part" || fail "could not write into $HAICC_ROOT/inbox" 3
mv "$file.part" "$file"

# Its response: the completed form, in the outbox folder under the same key.
back=$HAICC_ROOT/outbox/$key.json
limit=${HAICC_TIMEOUT:-120}
waited=0
while [ ! -f "$back" ]; do
  [ "$waited" -lt $((limit * 5)) ] || fail "no response in $limit s (the request stays: $key)" 4
  sleep 0.2 2>/dev/null || sleep 1
  waited=$((waited + 1))
done
if [ "${HAICC_RECORD:-}" = 1 ]; then cat "$back"; fi
awk -f "$(dirname "$0")/haicc-response.awk" -v quiet="${HAICC_RECORD:-}" "$back"
HAICC_INSTALL_FILE_END
cat > "$home/bin/haicc-response.awk" <<'HAICC_INSTALL_FILE_END'
# haicc-response.awk: a response record read, its completed form's output or
# error found. The record is JSON: an envelope around a core around the form,
# so the form's own keys are three objects deep. Its output is printed as it
# is (JSON), exit 0; its error, a string, on stderr, exit 1; neither: exit 5.
# A scanner, not a parser: it follows strings and depth, nothing more.
#   awk -f haicc-response.awk [-v quiet=1] <record.json>     (quiet: the
#       output not printed, only the exit code and the error)
{ s = s $0 "\n" }
END {
  n = length(s); depth = 0; instr = 0; esc = 0; expect = 0; readkey = 0; gotkey = 0; cap = 0
  key = ""; cur = ""; val = ""
  for (i = 1; i <= n; i++) {
    c = substr(s, i, 1)
    if (instr) {
      if (cap) val = val c
      if (esc) { esc = 0; if (readkey) cur = cur c; continue }
      if (c == "\\") { esc = 1; if (readkey) cur = cur c; continue }
      if (c == "\"") { instr = 0; if (readkey) { key = cur; readkey = 0; gotkey = 1 }; continue }
      if (readkey) cur = cur c
      continue
    }
    if (c == "\"") {
      instr = 1
      if (cap) val = val c
      else if (depth == 3 && expect) { readkey = 1; cur = ""; expect = 0 }
      continue
    }
    if (cap) {
      if (depth == 3 && (c == "," || c == "}")) { out[key] = val; has[key] = 1; cap = 0; val = "" }
      else val = val c
    }
    if (c == "{" || c == "[") {
      depth++
      # a new object three deep: the form is the last of them
      if (c == "{" && depth == 3) { expect = 1; delete has["output"]; delete has["error"] }
    } else if (c == "}" || c == "]") depth--
    else if (c == "," && depth == 3) expect = 1
    else if (c == ":" && depth == 3 && gotkey) {
      gotkey = 0
      if (key == "output" || key == "error") { cap = 1; val = "" }
    }
  }
  if ("error" in has) {
    e = out["error"]
    gsub(/^[ \t\n]+|[ \t\n]+$/, "", e)
    sub(/^"/, "", e); sub(/"$/, "", e)
    gsub(/\\"/, "\"", e); gsub(/\\n/, " ", e); gsub(/\\\\/, "\\", e)
    print "haicc: " e > "/dev/stderr"
    exit 1
  }
  if ("output" in has) {
    o = out["output"]
    gsub(/^[ \t\n]+|[ \t\n]+$/, "", o)
    if (!quiet) print o
    exit 0
  }
  print "haicc: the response holds no completed form" > "/dev/stderr"
  exit 5
}
HAICC_INSTALL_FILE_END
cat > "$home/bin/haicc-sources" <<'HAICC_INSTALL_FILE_END'
#!/bin/sh
# haicc sources: where packages and third-party components come from.
#   haicc sources                     the sources registered, in order
#   haicc sources link <folder>       a local folder linked as a source (not
#                                     copied): our packages (<org>/<package>
#                                     .bundle, <org>/manifest.json, addons/)
#                                     and the third-party components
#   haicc sources unlink <folder>
#   haicc sources download [<what>...]  fetched over https into haicc's own
#                                     sources folder, each checked against
#                                     its pin: bare, third-party, <org>,
#                                     <org>/<package>; nothing named: all
#   haicc sources https | no-https    https as the backup for what is not in
#                                     the folders (the default), or not
# This is the only haicc command that reaches the network.
set -u
. "$(dirname "$0")/haicc-lib.sh"
own=$HAICC_HOME/sources

register () {
  sources | grep -Fxq "$1" && return 0
  printf '%s\n' "$1" >> "$HAICC_LIST"
}
unregister () {
  [ -f "$HAICC_LIST" ] || return 0
  grep -Fxv "$1" "$HAICC_LIST" > "$HAICC_LIST.part" || true
  mv "$HAICC_LIST.part" "$HAICC_LIST"
}

download_bare () {
  command -v curl >/dev/null 2>&1 || fail "curl is needed to download" 3
  to=$own/$BARE_FILE
  if [ -f "$to" ] && [ "$(sha512_of "$to")" = "$BARE_SHA512" ]; then echo "bare: there, as pinned ($BARE_VERSION)"; return 0; fi
  mkdir -p "$(dirname "$to")"
  echo "bare: fetching $BARE_URL"
  curl -fsSL --retry 3 --connect-timeout 20 -o "$to.part" "$BARE_URL" || { rm -f "$to.part"; fail "could not fetch Bare's runtime: $BARE_URL" 3; }
  [ "$(sha512_of "$to.part")" = "$BARE_SHA512" ] || { rm -f "$to.part"; fail "Bare's runtime is not as pinned (sha512): $BARE_URL" 3; }
  mv "$to.part" "$to"
  echo "bare: downloaded, as pinned ($BARE_VERSION)"
}

cmd=${1:-list}
[ $# -gt 0 ] && shift
case "$cmd" in
  list)
    sources ;;
  link)
    [ $# -eq 1 ] || fail "haicc sources link <folder>" 2
    [ -d "$1" ] || fail "no folder: $1" 2
    register "folder:$(cd "$1" && pwd)"
    sources ;;
  unlink)
    [ $# -eq 1 ] || fail "haicc sources unlink <folder>" 2
    if [ -d "$1" ]; then unregister "folder:$(cd "$1" && pwd)"; else unregister "folder:$1"; fi
    sources ;;
  https)
    register "github:$HAICC_ORG"; sources ;;
  no-https)
    unregister "github:$HAICC_ORG"; sources ;;
  download)
    [ $# -gt 0 ] || set -- third-party "$HAICC_ORG"
    missed=0
    for what in "$@"; do
      case "$what" in
        bare|third-party)
          download_bare; register "folder:$own" ;;
        "$HAICC_ORG"|"$HAICC_ORG"/*)
          # Our packages are not published anywhere yet (release and
          # sourcing: signed bundles and their manifest, to come).
          echo "haicc: $what: not published yet; link a sources folder (haicc sources link <folder>)" >&2
          missed=1 ;;
        *)
          echo "haicc: nothing to download for '$what' (bare, third-party, $HAICC_ORG, $HAICC_ORG/<package>)" >&2
          missed=1 ;;
      esac
    done
    [ "$missed" -eq 0 ] || exit 3 ;;
  *)
    fail "haicc sources [link <folder> | unlink <folder> | download [<what>...] | https | no-https]" 2 ;;
esac
HAICC_INSTALL_FILE_END
cat > "$home/pins" <<'HAICC_INSTALL_FILE_END'
# pins: what the haicc scripts are pinned to; sourced by them.
# Bare's runtime, third party: written by the development repository's
# tools/release.js from its lockfile, the Bare the packages are built with.
BARE_VERSION=1.36.0
BARE_PLATFORM=linux-x64
BARE_FILE=holepunchto/bare-runtime-linux-x64-1.36.0.tgz
BARE_URL=https://registry.npmjs.org/bare-runtime-linux-x64/-/bare-runtime-linux-x64-1.36.0.tgz
BARE_SHA512=3c1cb0a7b58e3408eeaac29ce153ea966af7dc88f8ba06cd3ddff1c3693020ee8ec6c5a1453dedd8790786fc928dac6aed1e850f26de73f7ef796d04701a4a41
# Ours: the organisation, the boot package, the root mrepo (the boot mrepo:
# its name, its unique URI).
HAICC_ORG=haiccing
BOOT_PACKAGE=base-package-boot
ROOT_NAME=boot
ROOT_URI=local/boot
HAICC_INSTALL_FILE_END
chmod +x "$home/bin/haicc"
. "$home/pins"
# https the backup, by default (haicc sources no-https: not)
[ -f "$home/sources.list" ] || printf 'github:%s\n' "$HAICC_ORG" > "$home/sources.list"
# The command, registered: a small script on the PATH that names haicc's folder.
q () { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
printf '#!/bin/sh\nHAICC_HOME=%s exec sh %s "$@"\n' "$(q "$home")" "$(q "$home/bin/haicc")" > "$bin/haicc"
chmod +x "$bin/haicc"
echo "haicc installed: $bin/haicc (its folder: $home)"
case ":$PATH:" in
  *":$bin:"*) ;;
  *) echo "note: $bin is not on your PATH" ;;
esac
