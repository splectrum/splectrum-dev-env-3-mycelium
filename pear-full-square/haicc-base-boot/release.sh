#!/bin/sh
# The setup: a release of base-package-haicc as one self-extracting file
# (sh and tar only), extracting a work folder: ./boot and ./shutdown (the
# cold pair, naming this setup), bare/ (Bare's runtime: carried by the setup,
# not by the package's git; pinned by its sha256, checked once extracted;
# stripped of its debug information: the root and the nodes' containers run
# it alike),
# haiccing/sources, and the platform's pair as a bootstrap:
# haiccing/base-package-haicc/ and haiccing/base-package-pkgm/ (beside it, as
# written); the root's boot refreshes both from the sources.
#   sh release.sh <base-package-haicc, as written> <out file> [<Bare's runtime>]
# The runtime: the one named, else the `bare` on the PATH (in a work folder,
# the one it runs on, stripped already); stripped here when `strip` is
# there (stripping a stripped one changes nothing).
set -eu
pkg=$(cd "$1" && pwd)
out=$2
runtime=${3:-$(command -v bare || true)}
[ -n "$runtime" ] && [ -f "$runtime" ] || { echo "release.sh: no Bare runtime (name it, or have bare on the PATH)"; exit 1; }
name=$(basename "$pkg")
version=$(cat "$pkg/modules/pear-full-square/haicc-base-boot/VERSION")
hash=$(sed -n 's/.*"hash": *"\([0-9a-f]\{12\}\).*/\1/p' "$pkg/package.json" | head -1)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/haiccing"
pkgm=$(dirname "$pkg")/base-package-pkgm
[ -f "$pkgm/package.json" ] || { echo "release.sh: no base-package-pkgm beside $pkg (the platform is a pair)"; exit 1; }
cp -a "$pkg" "$tmp/haiccing/$name" && rm -rf "$tmp/haiccing/$name/.git"
cp -a "$pkgm" "$tmp/haiccing/base-package-pkgm" && rm -rf "$tmp/haiccing/base-package-pkgm/.git"
mkdir "$tmp/bare"
# Said in the setup: the published version, and whether stripped here.
if command -v strip >/dev/null 2>&1 && strip -o "$tmp/bare/bare" "$runtime" 2>/dev/null; then how=stripped; else cp "$runtime" "$tmp/bare/bare"; how='as given'; fi
chmod 755 "$tmp/bare/bare"
runtime_version=$("$tmp/bare/bare" --version)
runtime_sum=$(sha256sum "$tmp/bare/bare" | cut -d' ' -f1)
# The work folder's cold pair, at its top: ./boot (set up from haiccing/,
# then ./haicc boot) and ./shutdown (everything removed back to haiccing/).
cat > "$tmp/boot" <<EOS
#!/bin/sh
# This work folder's cold boot: the setup $name. Run it as ./boot.
HAICC_AS=\$0; export HAICC_AS
exec sh "\$(cd "\$(dirname "\$0")" && pwd)/haiccing/$name/modules/pear-full-square/haicc-base-boot/boot.sh" "\$@"
EOS
cat > "$tmp/shutdown" <<EOS
#!/bin/sh
# This work folder's cold shutdown: the setup $name. Run it as ./shutdown.
HAICC_AS=\$0; export HAICC_AS
exec sh "\$(cd "\$(dirname "\$0")" && pwd)/haiccing/$name/modules/pear-full-square/haicc-base-boot/shutdown.sh" "\$@"
EOS
chmod 755 "$tmp/boot" "$tmp/shutdown"
cat > "$tmp/haiccing/sources" <<EOS
# Where this work folder's repositories come from, in order (the first
# having one wins): folder <path> (plain copies), github <org> (archives).
github haiccing
EOS
cat > "$out" <<EOS
#!/bin/sh
# haicc-setup: the setup $name ($hash, boot $version, Bare $runtime_version, $how), self-extracting.
#   sh haicc-setup.sh [<work folder>] [--sources=folder:<path>|github:<org>]...
# Extracts <work folder>/: boot, shutdown, bare/ (Bare's runtime), haiccing/ (sources, $name, base-package-pkgm); then:
#   <work folder>/boot
set -eu
work=.; sources=
for a in "\$@"; do
  case \$a in
    --sources=*) sources="\$sources\$(printf '%s' "\${a#--sources=}" | sed 's/:/ /')
" ;;
    -*) sed -n '2,6p' "\$0" | sed 's/^# \\{0,1\\}//'; exit 2 ;;
    *) work=\$a ;;
  esac
done
mkdir -p "\$work"; work=\$(cd "\$work" && pwd)
# Logged from the start: what it says, to <work folder>/log/ too (the
# current file, or a new one named by now; a header and a close line, as
# every haicc command's).
mkdir -p "\$work/log"
log=\$(ls "\$work/log" | grep -E '^[0-9]{8}T[0-9]{6}Z\\.log\$' | sort | tail -1)
if [ -z "\$log" ] || [ "\$(wc -c < "\$work/log/\$log")" -ge 10240 ]; then log=\$(date -u +%Y%m%dT%H%M%SZ).log; fi
log=\$work/log/\$log
t0=\$(cut -d' ' -f1 /proc/uptime)
echo "== \$(date -u +%Y-%m-%dT%H:%M:%SZ) sh \$0 \$*  (in \$(pwd))" | tee -a "\$log"
say () { echo "\$*"; echo "\$*" >> "\$log"; }
end () { echo "== exit \$1, \$(awk -v a="\$t0" -v b="\$(cut -d' ' -f1 /proc/uptime)" 'BEGIN { printf "%.1f", b - a }') s" | tee -a "\$log"; exit "\$1"; }
say "haicc-setup: $name $hash (boot $version, Bare $runtime_version)"
if [ -e "\$work/haiccing/$name/package.json" ]; then
  there=\$(sed -n 's/.*"hash": *"\\([0-9a-f]\\{12\\}\\).*/\\1/p' "\$work/haiccing/$name/package.json" | head -1)
  boot=\$(cat "\$work/haiccing/$name/modules/pear-full-square/haicc-base-boot/VERSION" 2>/dev/null || echo '?')
  if [ "\$there" = "$hash" ]; then say "already set up with this setup: \$work/haiccing (next: \$work/boot)"; end 0; fi
  say "already set up with another setup: \$work/haiccing has $name \$there (boot \$boot), this one is $hash (boot $version)."
  say "Nothing changed. For this setup, use a new folder: sh haicc-setup.sh <new folder>"
  end 1
fi
line=\$(awk '/^__PAYLOAD__\$/ { print NR + 1; exit }' "\$0")
tail -n +"\$line" "\$0" | tar -xzf - -C "\$work"
# Bare's runtime, as this setup pinned it.
[ "\$(sha256sum "\$work/bare/bare" | cut -d' ' -f1)" = "$runtime_sum" ] || { say "Bare's runtime in \$work/bare is not the one this setup carries (sha256): the setup file is damaged; download it again"; end 1; }
if [ -n "\$sources" ]; then { echo "# Where this work folder's repositories come from, in order."; printf '%s' "\$sources"; } > "\$work/haiccing/sources"; fi
say "set up: \$work/haiccing ($name $hash); sources: \$(grep -v '^#' "\$work/haiccing/sources" | tr '\\n' ';' | sed 's/;\$//')"
say "next: \$work/boot"
end 0
__PAYLOAD__
EOS
tar -czf - -C "$tmp" haiccing bare boot shutdown >> "$out"
chmod 755 "$out"
echo "$out: $name $hash, Bare $runtime_version ($how), $(wc -c < "$out") bytes"
