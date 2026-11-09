#!/bin/sh
# This repository's dependencies, from its lockfile, without Node.js or npm:
# package-lock.json replayed into node_modules as `npm ci` would. Bare's
# runtime ensured first (the lockfile's pinned tarball, checked:
# tools/ensure-bare.sh); then Bare, with no addon (its core: JSON, console),
# turns the lockfile into a list, and the shell installs it: each package
# from the registry fetched with curl, checked against its sha512, unpacked
# with tar into its lockfile path; the git dependency fetched at its commit;
# workspaces linked; other platforms' optional packages skipped; a package
# already there at its version kept. npm is needed only to change the
# dependencies (resolve versions, write a new package-lock.json).
#   sh tools/install.sh
set -eu
dev=$(cd "$(dirname "$0")/.." && pwd)
. "$dev/tools/ensure-bare.sh"
entry=$(sed -n '/"node_modules\/bare-runtime-linux-x64": {/,/^    }/p' "$dev/package-lock.json")
url=$(printf '%s\n' "$entry" | sed -n 's/.*"resolved": "\(.*\)".*/\1/p' | head -1)
sri=$(printf '%s\n' "$entry" | sed -n 's/.*"integrity": "\(.*\)".*/\1/p' | head -1)
[ -n "$url" ] && [ -n "$sri" ] || { echo "no bare-runtime-linux-x64 in package-lock.json"; exit 1; }
ensure_bare "$url" "$sri" "$dev/node_modules/bare-runtime-linux-x64"
bare=$dev/node_modules/bare-runtime-linux-x64/bin/bare

# The lockfile as a list, one package a line: kind path url-or-target sri version.
list=$("$bare" -e "
const l = $(cat "$dev/package-lock.json")
for (const [path, e] of Object.entries(l.packages)) {
  if (!path.startsWith('node_modules/')) continue
  if (e.link) { console.log(['link', path, e.resolved].join(' ')); continue }
  if ((e.os && !e.os.includes(Bare.platform)) || (e.cpu && !e.cpu.includes(Bare.arch))) continue
  console.log([String(e.resolved).startsWith('git+') ? 'git' : 'tar', path, e.resolved, e.integrity || '-', e.version].join(' '))
}")

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
fetched=0; kept=0; linked=0
hex () { printf '%s' "${1#*-}" | base64 -d | od -An -v -tx1 | tr -d ' \n'; }
printf '%s\n' "$list" | {
  while read -r kind path src sri version; do
    dest=$dev/$path
    case $kind in
      link)
        target=$(realpath -m --relative-to="$(dirname "$dest")" "$dev/$src")
        if [ "$(readlink "$dest" 2>/dev/null || true)" != "$target" ]; then
          mkdir -p "$(dirname "$dest")"; rm -rf "$dest"; ln -s "$target" "$dest"; linked=$((linked + 1))
        fi ;;
      git)
        repo=${src#git+}; commit=${repo##*#}; repo=${repo%#*}
        repo=$(printf '%s' "$repo" | sed 's#^ssh://git@github.com/#https://github.com/#')
        if [ "$(cat "$dest/git-commit" 2>/dev/null || true)" = "$commit" ]; then kept=$((kept + 1)); continue; fi
        rm -rf "$dest"; mkdir -p "$dest"
        git -C "$dest" init -q
        git -C "$dest" fetch -q --depth 1 "$repo" "$commit"
        git -C "$dest" -c advice.detachedHead=false checkout -q FETCH_HEAD
        rm -rf "$dest/.git"; printf '%s\n' "$commit" > "$dest/git-commit"
        fetched=$((fetched + 1)); echo "fetched $path (git ${commit%"${commit#????????????}"})" ;;
      tar)
        if [ -f "$dest/package.json" ] && grep -q "\"version\": *\"$version\"" "$dest/package.json"; then kept=$((kept + 1)); continue; fi
        curl -fsSL --retry 3 --connect-timeout 20 -o "$tmp/p.tgz" "$src" || { echo "could not fetch $path: $src"; exit 1; }
        case $sri in
          sha512-*) [ "$(sha512sum "$tmp/p.tgz" | cut -d' ' -f1)" = "$(hex "$sri")" ] || { echo "not as locked (sha512): $path"; exit 1; } ;;
          sha1-*) [ "$(sha1sum "$tmp/p.tgz" | cut -d' ' -f1)" = "$(hex "$sri")" ] || { echo "not as locked (sha1): $path"; exit 1; } ;;
          *) echo "no integrity for $path"; exit 1 ;;
        esac
        rm -rf "$dest"; mkdir -p "$dest"
        tar -xzf "$tmp/p.tgz" -C "$dest" --strip-components=1
        fetched=$((fetched + 1)); echo "fetched $path $version" ;;
    esac
  done
  echo "installed: $fetched fetched, $kept kept, $linked linked"
}
