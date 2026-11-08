#!/bin/sh
# Build the test repository as a p2p-mrepo repository: mycelium-git's native
# fixture (fixed authors and dates, stable oids) at <dir>.git, imported into
# the p2p-store at <dir> with the given runtime.
#   sh test/fixture.sh <dir> <node|bare>     (from p2p-mrepo/)
set -eu
dir=$1
runtime=$2
rm -rf "$dir" "$dir.git"
sh ../mycelium-git/test/fixture.sh "$dir.git"
$runtime cli.js import "$dir" "$dir.git" > /dev/null
