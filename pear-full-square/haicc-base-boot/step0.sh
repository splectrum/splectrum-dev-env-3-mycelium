#!/bin/sh
# Step 0: what HAICC needs to run, before anything of it runs (./requirements).
#   sh step0.sh check <runtime>    each: found, required, ok, and what to do when not
# <runtime>: Bare's runtime as the setup placed it (<work>/bare/bare). Nothing to
# fix here: the runtime comes with the setup (no download), and a host
# that is not Linux x86-64 cannot run it. Exit 0 when all is met, 1 when not.
set -u
here=$(cd "$(dirname "$0")" && pwd)
op=${1:-check}; runtime=${2:-}

probe () {
  found=-; ok=no; todo=
  case $1 in
    os)
      found="$(uname -s | tr A-Z a-z)-$(uname -m)"
      [ "$found" = "$2" ] && ok=yes || todo="none: HAICC runs on Linux x86-64 only, for now" ;;
    bare)
      if [ -z "$runtime" ] || [ ! -f "$runtime" ]; then found='not there'; todo='set up from a setup (it carries the runtime)'
      else
        [ -x "$runtime" ] || chmod +x "$runtime" 2>/dev/null
        if v=$("$runtime" --version 2>/dev/null); then found="$v"; ok=yes
        else found='does not run'; todo="Bare's runtime does not run on this host (its C library?)"; fi
      fi ;;
  esac
}

rows () { grep -v '^#' "$here/requirements" | grep -v '^[[:space:]]*$'; }

check () {
  printf '%-14s %-24s %-14s %-4s %s\n' prerequisite found required ok 'to do'
  rows | while read -r name required; do
    probe "$name" "$required"
    printf '%-14s %-24s %-14s %-4s %s\n' "$name" "$found" "$required" "$ok" "${todo:-}"
  done
  rows | { w=0; while read -r name required; do probe "$name" "$required"; [ $ok = yes ] || w=1; done; exit $w; }
}

case $op in
  check) check ;;
  *) sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
