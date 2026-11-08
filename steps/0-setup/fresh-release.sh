#!/bin/sh
# The full sets from a fresh release, Node.js off the PATH (docs/rules.md 25):
# the packages written into <scratch>, the setup built from them, a work
# folder set up and booted from them (--sources=folder:), each package's
# full set booted. From the repository's root, installed; Docker running.
#   sh steps/0-setup/fresh-release.sh <scratch folder>
set -u
dev=$(pwd); s=$1; O=$s/pkgs; W=$s/work
rm -rf "$O" "$W"; mkdir -p "$O"
tools/bare tools/package-writer/cli.js --out="$O" --quiet > "$s/written.json" || { echo "the package writer failed"; exit 1; }
for r in "$O"/base-*; do (cd "$r" && git init -q && git add -A && git -c user.email=dev@local -c user.name=dev commit -qm written); done
sh pear-full-square/haicc-base-boot/release.sh "$O/base-package-haicc" "$O/haicc-setup.sh" "$dev/node_modules/bare-runtime-linux-x64/bin/bare"
PATH=/usr/local/sbin:/usr/sbin:/sbin:/bin:/usr/bin; export PATH
command -v node >/dev/null && { echo "node still on the PATH"; exit 2; }
cd /tmp
sh "$O/haicc-setup.sh" "$W" --sources=folder:"$O" > "$s/setup.log" 2>&1; echo "setup exit=$?"
"$W/boot" --yes > "$s/boot.log" 2>&1; echo "boot exit=$?"
cd "$W"
for p in base-package-haicc base-swarm-three-nodes base-demo-liveness base-demo-other-host; do
  ./haicc boot $p/test --yes > "$s/$p.log" 2>&1
  echo "$p exit=$? $(grep -E 'Passed:|FAILED:' "$s/$p.log" | tail -1)"
done
echo "left: $(docker ps -aq | wc -l) containers, $(docker network ls -q --filter driver=bridge | wc -l) bridge networks (1 is Docker's own)"
