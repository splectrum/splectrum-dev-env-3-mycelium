#!/bin/sh
# A release of HAICC's platform, for the local agent (a machine with push
# access to github.com/haiccing and `gh`), with the human's word. From this
# repository at the commit to publish, installed (sh tools/install.sh).
#   sh tools/publish.sh <folder> --key-dir=<folder> [--push]
# 1. The boot's, HAICC's and mycelium's packages written as bundles, signed with the
#    publisher's key (<key-dir>/publisher.secret; make one with
#    tools/setup/keygen.js), as one source (<folder>/source).
# 2. The setup built from it (<folder>/haicc-setup.sh): Bare, the source,
#    boot.json (the publisher's public key).
# 3. Checked as a user would: a fresh folder, Node.js off the PATH (a PATH
#    of links to the system's tools, node, nodejs, npm, npx and corepack
#    left out, wherever they are installed): the setup run (the level's
#    main thread started), then `haicc status`, a message sent (`haicc
#    message`) and seen taken in by the level's repository, then `haicc stop`.
# 4. With --push only: the setup and the manifest published as a release of
#    haiccing/base-package-boot. Its tag: setup-<12 hex of the packages'
#    identities in the manifest (each package's id and addons)>: the same
#    packages, the same tag (published once); any package changed, a new one.
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
"$dev/tools/bare" "$dev/tools/package-writer/cli.js" --out="$folder/out" --only=boot,haicc,mycelium --sign-key="$keys/publisher.secret" --quiet > "$folder/written.json" || { echo "a package's tests failed: nothing written (see $folder/written.json)"; exit 1; }
echo "== 2. the setup"
"$dev/tools/bare" "$dev/tools/setup/build.js" --source="$folder/out/source" --out="$folder/out" --public-key="$keys/publisher.public"
echo "== 3. checked: a fresh folder, Node.js off the PATH"
# The system's tools, as links, without Node.js wherever it is installed.
nonode="$folder/no-node-bin"
rm -rf "$nonode"; mkdir -p "$nonode"
for d in /usr/local/sbin /usr/local/bin /usr/sbin /usr/bin /sbin /bin; do
  [ -d "$d" ] || continue
  for f in "$d"/*; do
    n=$(basename "$f")
    case $n in node|nodejs|npm|npx|corepack) continue ;; esac
    [ -e "$nonode/$n" ] || ln -s "$f" "$nonode/$n"
  done
done
(cd / && env -i PATH="$nonode" HOME="$HOME" sh -c 'command -v node >/dev/null && { echo "node still on the PATH"; exit 1; }; exit 0')
(cd / && env -i PATH="$nonode" HOME="$HOME" sh "$folder/out/haicc-setup.sh" "$folder/check")
bundle=$(ls "$folder/check/haicc/packages/haiccing/base-package-haicc.bundle")
(cd / && env -i PATH="$nonode" "$folder/check/setup/bare" "$bundle" status)
# A message, from the terminal to the level's repository: dispatched by the
# main thread, taken in (seen in its log).
(cd / && env -i PATH="$nonode" "$folder/check/setup/bare" "$bundle" message /level/main/hello '{"text":"hello"}')
i=0; until grep -q '"main":"received"' "$folder/check/log/main.log" 2>/dev/null; do i=$((i+1)); [ $i -gt 50 ] && { echo "the message was not taken in"; "$folder/check/setup/bare" "$bundle" stop; exit 1; }; sleep 0.2; done
echo "the message: taken in by the level's repository"
# The level's main thread, started by the boot: stopped, the check leaves nothing running.
(cd / && env -i PATH="$nonode" "$folder/check/setup/bare" "$bundle" stop)
rm -rf "$nonode"
# The tag: the packages' identities (ids and addons), not the build's.
tag=$("$dev/tools/bare" "$dev/tools/setup/tag.js" "$folder/out/source/manifest.json")
[ -n "$tag" ] || { echo "no tag: the manifest could not be read"; exit 1; }
if [ $push = 1 ]; then
  echo "== 4. publishing $tag to haiccing/base-package-boot"
  # Is it there already? Not found goes on; any other failure stops.
  if view=$(gh release view "$tag" -R haiccing/base-package-boot --json tagName 2>&1); then echo "release $tag: there already (these packages are published)"
  elif ! printf '%s' "$view" | grep -qi 'not found'; then echo "could not check for release $tag: $view"; exit 1
  else gh release create "$tag" "$folder/out/haicc-setup.sh" "$folder/out/source/manifest.json" -R haiccing/base-package-boot --title "Setup $tag" --notes "HAICC's setup: sh haicc-setup.sh <work folder>. Written from splectrum/dev-env-3-mycelium $commit." --latest && echo "release $tag: published"; fi
else
  echo "== not published ($tag): --push to publish, with the human's word"
fi
