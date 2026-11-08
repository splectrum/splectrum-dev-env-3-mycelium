#!/bin/sh
# The haiccing repositories, written by the package writer (tools/package-writer)
# from this repository and pushed: the packages, the demos, the swarms. For a machine
# with push access to github.com/haiccing (the local agent); this
# repository at the commit to publish, installed (npm install at its root:
# the third-party code and Bare's runtime are taken from its node_modules; the
# package writer runs on Bare: tools/bare).
#   sh tools/publish.sh <folder for the haiccing clones> [--no-push]
# Each repository cloned into <folder> if not there (its LICENSE kept),
# written (each self-contained, all tested first: nothing is written if a
# test fails), committed when changed, pushed.
# Then the setup (haicc-setup.sh, base-package-haicc's release) built into
# <folder>; uploaded as a GitHub release of base-package-haicc when `gh` is
# there and base-package-haicc changed (tag: its hash), else said.
set -eu
dev=$(cd "$(dirname "$0")/.." && pwd)
folder=$(mkdir -p "$1" && cd "$1" && pwd)
push=1; [ "${2:-}" = --no-push ] && push=0
repos="base-package-haicc base-package-pkgm base-swarm-three-nodes base-demo-liveness base-demo-other-host"
commit=$(git -C "$dev" rev-parse --short HEAD)
[ -z "$(git -C "$dev" status --porcelain -- pear-full-square splectral haiccing tools packages.json package.json package-lock.json)" ] || { echo "uncommitted changes in $dev: commit first"; exit 2; }
for r in $repos; do
  [ -d "$folder/$r/.git" ] || git clone -q "https://github.com/haiccing/$r" "$folder/$r"
done
"$dev/tools/bare" "$dev/tools/package-writer/cli.js" --out="$folder" --quiet > "$folder/written.json" || { echo "a package's tests failed: nothing written (see $folder/written.json)"; exit 1; }
for r in $repos; do
  cd "$folder/$r"
  git add -A
  if git diff --cached --quiet; then
    # Committed by an earlier --no-push: still to go out.
    if [ $push = 1 ] && [ -n "$(git rev-list '@{u}..HEAD')" ]; then git push -q origin HEAD; echo "$r: $(git log --oneline -1), pushed (committed earlier)"; else echo "$r: unchanged"; fi
    continue
  fi
  hash=$(sed -n 's/.*"hash": *"\([0-9a-f]\{12\}\).*/\1/p' package.json | head -1)
  git commit -q -m "Written by the package writer from dev-env-3-mycelium $commit (hash $hash)"
  [ $push = 1 ] && git push -q origin HEAD
  echo "$r: $(git log --oneline -1)$([ $push = 1 ] && echo ', pushed')"
done
cd "$folder"
sh "$dev/pear-full-square/haicc-base-boot/release.sh" "$folder/base-package-haicc" "$folder/haicc-setup.sh" "$dev/node_modules/bare-runtime-linux-x64/bin/bare"
tag=setup-$(sed -n 's/.*"hash": *"\([0-9a-f]\{12\}\).*/\1/p' "$folder/base-package-haicc/package.json" | head -1)
if [ $push = 1 ] && command -v gh >/dev/null 2>&1; then
  if gh release view "$tag" -R haiccing/base-package-haicc >/dev/null 2>&1; then echo "release $tag: there already"
  else gh release create "$tag" "$folder/haicc-setup.sh" -R haiccing/base-package-haicc --title "Setup $tag" --notes "The setup: sh haicc-setup.sh <work folder>, then <work folder>/boot. Written from dev-env-3-mycelium $commit." --latest && echo "release $tag: published"; fi
else
  echo "release $tag: built ($folder/haicc-setup.sh), not uploaded$([ $push = 1 ] && echo ' (no gh)')"
fi
