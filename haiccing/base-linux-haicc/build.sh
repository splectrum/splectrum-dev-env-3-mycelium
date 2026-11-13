#!/bin/sh
# build.sh: the installer written, haicc-install.sh, from bin/ and pins.
# One file that carries the scripts inside itself, so an install is one
# download or one copy. Run after any change to bin/ or pins; the test
# checks the installer is the one this writes.
#   sh build.sh [<out>]        (default: haicc-install.sh beside this)
set -eu
here=$(cd "$(dirname "$0")" && pwd)
out=${1:-$here/haicc-install.sh}
end=HAICC_INSTALL_FILE_END
for f in "$here"/bin/* "$here/pins"; do
  if grep -Fxq "$end" "$f"; then echo "build.sh: $f holds the line $end" >&2; exit 1; fi
done
{
  cat <<'HEAD'
#!/bin/sh
# haicc-install.sh: installs the haicc command on this machine. Generated
# (haiccing/base-linux-haicc: build.sh); not edited.
#   sh haicc-install.sh [--home=<folder>] [--bin=<folder>]
#     --home   haicc's own folder: its scripts, its pins, its sources list,
#              later its sources, Bare and the work folder
#              ($HAICC_HOME, else ~/.haicc)
#     --bin    where the command is registered, a folder on the PATH
#              (/usr/local/bin when it can be written, else ~/.local/bin)
# It carries the scripts and the pins only. Nothing is fetched: the sources
# and Bare come next (haicc sources ..., haicc prereq). Run again, it
# replaces the scripts and the pins and keeps everything else.
set -eu
home=${HAICC_HOME:-$HOME/.haicc}
bin=
for a in "$@"; do
  case "$a" in
    --home=*) home=${a#--home=} ;;
    --bin=*) bin=${a#--bin=} ;;
    *) echo "sh haicc-install.sh [--home=<folder>] [--bin=<folder>]" >&2; exit 2 ;;
  esac
done
if [ -z "$bin" ]; then
  if [ -d /usr/local/bin ] && [ -w /usr/local/bin ]; then bin=/usr/local/bin; else bin=$HOME/.local/bin; fi
fi
mkdir -p "$home/bin" "$bin"
home=$(cd "$home" && pwd)
bin=$(cd "$bin" && pwd)
HEAD
  for f in "$here"/bin/*; do
    n=$(basename "$f")
    [ "$n" = README.md ] && continue
    printf "cat > \"\$home/bin/%s\" <<'%s'\n" "$n" "$end"
    cat "$f"
    printf '%s\n' "$end"
  done
  printf "cat > \"\$home/pins\" <<'%s'\n" "$end"
  cat "$here/pins"
  printf '%s\n' "$end"
  cat <<'TAIL'
chmod +x "$home/bin/haicc"
. "$home/pins"
# https the backup, by default (haicc sources no-https: not)
[ -f "$home/sources.list" ] || printf 'github:%s\n' "$HAICC_ORG" > "$home/sources.list"
# The command, registered: a small script on the PATH that names haicc's folder.
q () { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
printf '#!/bin/sh\nHAICC_HOME=%s exec sh %s "$@"\n' "$(q "$home")" "$(q "$home/bin/haicc")" > "$bin/haicc"
chmod +x "$bin/haicc"
echo "haicc installed: $bin/haicc (its folder: $home)"
case ":$PATH:" in
  *":$bin:"*) ;;
  *) echo "note: $bin is not on your PATH" ;;
esac
TAIL
} > "$out.part"
mv "$out.part" "$out"
echo "written: $out"
