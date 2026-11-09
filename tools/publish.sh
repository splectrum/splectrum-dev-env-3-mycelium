#!/bin/sh
# A release of HAICC's platform, for the local agent (a machine with push
# access to github.com/haiccing and `gh`), with the human's word. From this
# repository at the commit to publish, installed (npm install).
#   sh tools/publish.sh <folder> --key-dir=<folder> [--push]
# 1. The boot and HAICC's packages written as bundles, signed with the
#    publisher's key (<key-dir>/publisher.secret; make one with
#    tools/setup/keygen.js), as one source (<folder>/source).
# 2. The setup built from it (<folder>/haicc-setup.sh): Bare, the source,
#    boot.json (the publisher's public key).
# 3. Checked as a user would: a fresh folder, Node.js off the PATH: the
#    setup run, then `haicc status`.
# 4. With --push only: the setup and the manifest published as a release of
#    haiccing/base-package-boot (tag setup-<the boot bundle's hash, 12>).
set -eu
dev=$(cd "$(dirname "$0")/.." && pwd)
[ $# -ge 2 ] || { echo "usage: sh tools/publish.sh <folder> --key-dir=<folder> [--push]"; exit 2; }
folder=$(mkdir -p "$1" && cd "$1" && pwd)
keys=""; push=0
for a in "$@"; do case $a in --key-dir=*) keys=${a#--key-dir=} ;; --push) push=1 ;; esac; done
[ -n "$keys" ] && [ -f "$keys/publisher.secret" ] && [ -f "$keys/publisher.public" ] || { echo "no publisher key in --key-dir (tools/setup/keygen.js makes one)"; exit 2; }
[ -z "$(git -C "$dev" status --porcelain -- pear-full-square tools packages.json package.json package-lock.json)" ] || { echo "uncommitted changes in $dev: commit first"; exit 2; }
commit=$(git -C "$dev" rev-parse --short HEAD)
rm -rf "$folder/out" "$folder/check"
mkdir -p "$folder/out"
echo "== 1. the packages, from $commit, signed"
"$dev/tools/bare" "$dev/tools/package-writer/cli.js" --out="$folder/out" --only=boot,haicc --sign-key="$keys/publisher.secret" --quiet > "$folder/written.json" || { echo "a package's tests failed: nothing written (see $folder/written.json)"; exit 1; }
echo "== 2. the setup"
"$dev/tools/bare" "$dev/tools/setup/build.js" --source="$folder/out/source" --out="$folder/out" --public-key="$keys/publisher.public"
echo "== 3. checked: a fresh folder, Node.js off the PATH"
(cd / && env -i PATH=/usr/local/sbin:/usr/sbin:/sbin:/bin:/usr/bin HOME="$HOME" sh "$folder/out/haicc-setup.sh" "$folder/check")
bundle=$(ls "$folder/check/haicc/packages/haiccing/base-package-haicc.bundle")
(cd / && env -i PATH=/usr/bin:/bin "$folder/check/setup/bare" "$bundle" status)
boot=$(sed -n 's/^echo "\([0-9a-f]\{64\}\) .*/\1/p' "$folder/out/haicc-setup.sh" | head -1)
tag=setup-$(echo "$boot" | cut -c1-12)
if [ $push = 1 ]; then
  echo "== 4. publishing $tag to haiccing/base-package-boot"
  if gh release view "$tag" -R haiccing/base-package-boot >/dev/null 2>&1; then echo "release $tag: there already"
  else gh release create "$tag" "$folder/out/haicc-setup.sh" "$folder/out/source/manifest.json" -R haiccing/base-package-boot --title "Setup $tag" --notes "HAICC's setup: sh haicc-setup.sh <work folder>. Written from splectrum/dev-env-3-mycelium $commit." --latest && echo "release $tag: published"; fi
else
  echo "== not published ($tag): --push to publish, with the human's word"
fi
