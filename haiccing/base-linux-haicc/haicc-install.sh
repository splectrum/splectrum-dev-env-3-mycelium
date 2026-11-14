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
# haicc: the command, on Linux. The command itself is an app, run with Bare
# (the package $APP_PACKAGE, its bundle in the sources); this script is the
# first step: what has to work before Bare is on the machine, then the
# app's start.
#   haicc sources link <folder>     its own: a folder linked as a source
#   haicc sources download bare     its own: Bare fetched over https
#   haicc prereq [--check]          its own: what the app needs to start,
#                                   checked; Bare put in place
#   haicc --help                    its own commands said, then the app's
#   haicc <anything else>           the app: <bare> <app's bundle> /run
#                                   <anything else>. Not startable yet:
#                                   what is missing said, exit 3
set -u
here=$(cd "$(dirname "$0")" && pwd)
HAICC_HOME=${HAICC_HOME:-$(cd "$here/.." && pwd)}
export HAICC_HOME
. "$here/haicc-lib.sh"

usage () {
  cat <<'USAGE'
Before anything else, Bare and the sources:
haicc sources link <folder>                     a local folder linked as a
                                                source: Bare's runtime and
                                                the packages come from it
haicc sources download bare                     Bare's runtime fetched over
                                                https, checked against its pin
haicc prereq [--check]                          what the command needs to
                                                start, checked; Bare put in
                                                place from the sources
                                                (--check: only checked)
USAGE
}

# The app, when it can be started: its bundle's path; else nothing.
app () {
  [ -x "$HAICC_BARE" ] || return 0
  in_sources "$HAICC_ORG/$APP_PACKAGE.bundle"
}
# Is every part after the first one of bare, third-party (and one there)?
only_bare () {
  [ $# -gt 0 ] || return 1
  for _w in "$@"; do case "$_w" in bare|third-party) ;; *) return 1 ;; esac; done
}

case "${1:-}" in
  prereq) shift; exec sh "$here/haicc-prereq" "$@" ;;
  sources)
    case "${2:-}" in
      link) shift; exec sh "$here/haicc-sources" "$@" ;;
      download) if (shift 2; only_bare "$@"); then shift; exec sh "$here/haicc-sources" "$@"; fi ;;
    esac ;;
  ''|help|--help|-h)
    usage
    bundle=$(app)
    if [ -n "$bundle" ]; then echo; echo "Then:"; exec "$HAICC_BARE" "$bundle" /run --help; fi
    echo
    echo "Then, once haicc prereq says all is there: haicc --help says the rest."
    exit 0 ;;
esac
bundle=$(app)
if [ -z "$bundle" ]; then
  sh "$here/haicc-prereq" --check | grep '^missing' >&2
  fail "a prerequisite is missing: haicc prereq" 3
fi
exec "$HAICC_BARE" "$bundle" /run "$@"
HAICC_INSTALL_FILE_END
cat > "$home/bin/haicc-lib.sh" <<'HAICC_INSTALL_FILE_END'
# haicc-lib.sh: what the haicc scripts share; sourced, never run.
#   HAICC_HOME   haicc's own folder: bin/, pins, sources.list, sources/, bare/
# The pins (the pinned Bare, the organisation, the app) come from
# $HAICC_HOME/pins.
HAICC_HOME=${HAICC_HOME:-$(cd "$(dirname "$0")/.." && pwd)}
. "$HAICC_HOME/pins"
HAICC_LIST=$HAICC_HOME/sources.list
HAICC_BARE=$HAICC_HOME/bare/bin/bare

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
# haicc prereq: what the command needs to start, checked, and put in place
# where it is missing. Nothing is fetched: Bare is unpacked from the sources.
#   haicc prereq           checked; Bare put in place from the sources
#   haicc prereq --check   checked only, nothing changed
# A line a prerequisite: ok, or missing with how to get it. Exit 0 when all
# are there, 3 when one is missing.
#   platform   this machine's, the one the pinned Bare is for
#   tools      what the scripts use: tar, sha512sum
#   sources    a folder registered that holds the app: its bundle, with its
#              organisation's manifest
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

# sources
app=$(in_sources "$HAICC_ORG/$APP_PACKAGE.bundle")
if [ -n "$app" ] && [ -f "$(dirname "$app")/manifest.json" ]; then ok "sources: $(dirname "$(dirname "$app")")"
else miss "sources: no folder registered holds $HAICC_ORG/$APP_PACKAGE.bundle (haicc sources link <folder>)"; fi

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
cat > "$home/bin/haicc-sources" <<'HAICC_INSTALL_FILE_END'
#!/bin/sh
# haicc sources, the part that has to work before Bare is on the machine:
# where Bare's runtime and the app come from. The other actions (the list,
# unlink, https, no-https, the download of packages) are the app's.
#   haicc sources link <folder>       a local folder linked as a source (not
#                                     copied): our packages (<org>/<package>
#                                     .bundle, <org>/manifest.json, addons/)
#                                     and the third-party components
#   haicc sources download bare       Bare's runtime fetched over https into
#                                     haicc's own sources folder, checked
#                                     against its pin; that folder linked
#                                     (third-party: the same)
# The list is the app's too: $HAICC_HOME/sources.list, a line a source,
# folder:<path> or github:<org>. This is the only script that reaches the
# network.
set -u
. "$(dirname "$0")/haicc-lib.sh"
own=$HAICC_HOME/sources

register () {
  sources | grep -Fxq "$1" && return 0
  printf '%s\n' "$1" >> "$HAICC_LIST"
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

cmd=${1:-}
[ $# -gt 0 ] && shift
case "$cmd" in
  link)
    [ $# -eq 1 ] || fail "haicc sources link <folder>" 2
    [ -d "$1" ] || fail "no folder: $1" 2
    register "folder:$(cd "$1" && pwd)"
    sources ;;
  download)
    [ $# -gt 0 ] || fail "haicc sources download bare" 2
    for what in "$@"; do
      case "$what" in
        bare|third-party) ;;
        *) fail "haicc sources download bare" 2 ;;
      esac
    done
    download_bare; register "folder:$own" ;;
  *)
    fail "haicc sources link <folder>, haicc sources download bare" 2 ;;
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
# Ours: the organisation, and the app the command is: its package, run
# with Bare from its bundle in the sources.
HAICC_ORG=haiccing
APP_PACKAGE=base-app-haicc
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
