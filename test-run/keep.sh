#!/bin/sh
# Keep a run: bundle an instance repository, with all its branches, for
# later review. The bundle is the full self-contained record of the run,
# for a native instance and for one on the p2p layer alike.
#   test-run/keep.sh <repo> <bundle-file>
set -eu
repo=$1
out=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")
if [ -d "$repo/store" ]; then
  # An instance on the p2p layer: every branch, as a bundle (writeBundle,
  # mycelium-git), checked by git as any bundle is.
  src=$(cd "$(dirname "$0")/.." && pwd)
  node "$src/p2p-mrepo/cli.js" export "$repo/store" "$out" >/dev/null
  check=$(mktemp -d)
  git init -q --bare "$check"
  git -C "$check" bundle verify -q "$out" 2>/dev/null
  rm -rf "$check"
else
  git -C "$repo" worktree prune
  git -C "$repo" bundle create -q "$out" --all
  git -C "$repo" bundle verify -q "$out" 2>/dev/null
fi
echo "kept $out"
