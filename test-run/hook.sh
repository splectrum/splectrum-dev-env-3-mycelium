#!/bin/sh
# The kick: run the pending requests with the deployed machinery.
#   <repo>/hooks/execute [capability-branch]   (default: capability/test)
# Extracts the deployed tree and runs its execute.js, which uses the modules
# deployed next to it. The repository is the one this kick sits in: a bare
# repository (no working tree), or, for runs kept before instances were
# bare, the top of a checkout; or an instance on the p2p layer, a folder
# holding a p2p-store (store/). Hooks are not part of a bundle: seed.sh and
# inflate.sh install the kick from the deployed tree.
#
# A native instance's tree is extracted with git, from the environment. A
# p2p instance's is extracted with the p2p layer, from the environment too:
# p2p-mrepo as installed where the instance runs, named by MREPO_TOOLS or
# by the instance's hooks/tools (seed.sh writes it); and its machinery runs
# on Bare (RUNTIME overrides the runtime).
set -eu
repo=$(cd "$(dirname "$0")/.." && pwd)
[ "$(basename "$repo")" = .git ] && repo=$(dirname "$repo")
cap=${1:-capability/test}
code=$(mktemp -d)
trap 'rm -rf "$code"' EXIT
if [ -d "$repo/store" ]; then
  tools=${MREPO_TOOLS:-$(cat "$repo/hooks/tools")}
  node "$tools/p2p-mrepo/cli.js" extract "$repo/store" "$cap" "$code/tree" >/dev/null
  code=$code/tree
  runtime=${RUNTIME:-bare}
else
  git -C "$repo" archive "$cap" | tar -x -C "$code"
  runtime=${RUNTIME:-node}
fi
$runtime "$code/execute.js" "$repo" "$cap"
