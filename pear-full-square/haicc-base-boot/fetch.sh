#!/bin/sh
# The repositories a work folder needs, fetched into its haiccing/ from the
# sources listed in haiccing/sources (in order; the first having one wins):
#   folder <path>    a folder of repositories side by side (plain copies)
#   github <org>     GitHub's archives (curl and tar)
# A repository already there is kept as it is. Each fetch is said as it
# happens (with its source): in the log of the command that fetched.
#   sh fetch.sh <haiccing> [--requires] [--refresh] <repository>...
#     --requires   accepted, nothing more fetched: packages are self-contained
#     --refresh    fetched again even when there, replacing it (the platform's
#                  pair, at every root boot)
#   sh fetch.sh <haiccing> --list
#     what each source holds, one line a repository: <repository> <kind> <where>
#     (a folder: its folders with a package.json; github: the organisation's
#     repositories, through GitHub's API)
set -u
. "$(cd "$(dirname "$0")" && pwd)/lib/download.sh"
haiccing=$(cd "$1" && pwd); shift
refresh=0; list=0
while :; do case ${1:-} in --requires) shift ;; --refresh) refresh=1; shift ;; --list) list=1; shift ;; *) break ;; esac; done
sources=$haiccing/sources
[ -f "$sources" ] || { echo "no $sources: where the repositories come from (e.g. 'github haiccing')"; exit 1; }

# What the sources hold.
if [ $list = 1 ]; then
  grep -v '^[[:space:]]*#' "$sources" | grep -v '^[[:space:]]*$' | while read -r kind where; do
    case $kind in
      folder) for d in "$where"/*/; do [ -f "$d/package.json" ] && echo "$(basename "$d") folder $where"; done ;;
      github)
        if json=$(curl -fsSL --retry 3 --connect-timeout 20 "https://api.github.com/orgs/$where/repos?per_page=100" 2>/dev/null); then
          printf '%s\n' "$json" | sed -n 's/^ *"name": *"\([^"]*\)",*$/\1/p' | sort | sed "s|\$| github $where|"
        else echo "github $where: could not be listed (GitHub's API did not answer)" >&2; fi ;;
      *) echo "haiccing/sources: unknown source '$kind'" >&2 ;;
    esac
  done
  exit 0
fi

fetch_one () {
  r=$1
  lost=0
  [ $refresh = 0 ] && [ -f "$haiccing/$r/package.json" ] && return 0
  grep -v '^[[:space:]]*#' "$sources" | grep -v '^[[:space:]]*$' > "$haiccing/sources.$$.tmp"
  while read -r kind where; do
    tmp=$haiccing/$r.$$.fetching; rm -rf "$tmp"
    case $kind in
      folder)
        [ -f "$where/$r/package.json" ] || continue
        echo "  copying $r from $where..."
        cp -a "$where/$r" "$tmp" && rm -rf "$tmp/.git" ;;
      github)
        mkdir -p "$tmp.d"
        echo "  fetching $r from GitHub ($where)..."
        download "https://github.com/$where/$r/archive/refs/heads/main.tar.gz" "$tmp.tgz"; got=$?
        if [ $got = 0 ]; then
          echo "  unpacking $r..."
          tar -xzf "$tmp.tgz" -C "$tmp.d" && [ -f "$tmp.d/$r-main/package.json" ] && mv "$tmp.d/$r-main" "$tmp"
        elif [ $got = 2 ]; then lost=1; fi
        rm -f "$tmp.tgz"
        rm -rf "$tmp.d"
        [ -d "$tmp" ] || continue ;;
      *) echo "haiccing/sources: unknown source '$kind'"; continue ;;
    esac
    rm -rf "$haiccing/$r" && mv "$tmp" "$haiccing/$r" && { echo "  fetched $r ($kind $where)"; rm -f "$haiccing/sources.$$.tmp"; return 0; }
  done < "$haiccing/sources.$$.tmp"
  rm -f "$haiccing/sources.$$.tmp"
  if [ $lost = 1 ]; then echo "  $r: the connection failed; check it and run this again"; return 1; fi
  echo "  $r: in none of the sources ($(grep -v '^[[:space:]]*#' "$sources" | tr '\n' ';' | sed 's/;$//'))"
  return 1
}

seen=
visit () {
  case " $seen " in *" $1 "*) return 0 ;; esac
  seen="$seen $1"
  fetch_one "$1" || return 1
  # (--requires: nothing to walk: packages are self-contained, no requires.)
  return 0
}
code=0
for r in "$@"; do visit "$r" || code=1; done
exit $code
