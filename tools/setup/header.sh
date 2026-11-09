#!/bin/sh
# HAICC's setup: Bare, the platform's bundles (their addons by hash), the
# publisher's signed manifest, packed behind this script. It unpacks into
# <work>/setup, checks the boot bundle's hash, and hands over to the boot:
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
echo "@BOOTSHA@  $work/setup/base-package-boot.bundle" | sha256sum -c --quiet - || { echo "the boot bundle is not as released: $work/setup"; exit 1; }
exec "$work/setup/bare" "$work/setup/base-package-boot.bundle" boot --work="$work"
__PAYLOAD__
