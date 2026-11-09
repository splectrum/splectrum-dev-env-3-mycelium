#!/bin/sh
# HAICC's setup: the platform's bundles (their addons by hash) and the
# publisher's signed manifest, packed behind this script; Bare's runtime
# ensured, pinned (fetched from npm's registry and checked, or carried by
# an air-gapped setup). It unpacks into <work>/setup, ensures Bare, checks
# the boot bundle's hash, and hands over to the boot:
#   sh haicc-setup.sh <work folder>
set -eu
[ $# -eq 1 ] || { echo "usage: sh haicc-setup.sh <work folder>"; exit 2; }
work=$1
mkdir -p "$work"
work=$(cd "$work" && pwd)
[ -e "$work/setup" ] && { echo "set up already: $work/setup (a new folder for a new setup)"; exit 1; }
mkdir "$work/setup"
line=$(awk '/^__PAYLOAD__$/ { print NR + 1; exit }' "$0")
tail -n +"$line" "$0" | tar -xzf - -C "$work/setup"
@ENSUREBARE@
bareurl="@BAREURL@"
[ -f "$work/setup/bare-runtime.tgz" ] && bareurl="file://$work/setup/bare-runtime.tgz"
ensure_bare "$bareurl" "@BARESRI@" "$work/setup/bare-runtime"
rm -f "$work/setup/bare-runtime.tgz"
ln -s bare-runtime/bin/bare "$work/setup/bare"
echo "@BOOTSHA@  $work/setup/@BOOT@" | sha256sum -c --quiet - || { echo "the boot bundle is not as released: $work/setup"; exit 1; }
exec "$work/setup/bare" "$work/setup/@BOOT@" boot --work="$work"
__PAYLOAD__
