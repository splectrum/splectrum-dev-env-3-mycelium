#!/bin/sh
# HAICC's cold boot, stage 1, for a work folder: run as <work>/boot
# (the stub). Only what HAICC needs to run:
#   ./boot [--yes] [--verbose|--debug]
# 1. step 0: Linux x86-64, and Bare's runtime (carried by the setup, at
#    <work>/bare/) running here; else it stops;
# 2. the platform's pair, base-package-haicc and base-package-pkgm, copied
#    whole into <work>/packages/ (hard links: no space taken twice);
#    <work>/haicc written (it runs HAICC on Bare);
# 3. then ./haicc boot (stage 2: the host's other prerequisites; the pair
#    refreshed from the sources and deployed; haiccing/install).
# The work folder: haicc, haiccing/, packages/, bare/ (Bare's runtime), log/. What it prints goes to the log as well, in
# <work>/log/: files of 10 KB, each named by its first command's start
# (UTC), so they list in time order; a header line (the real start) and a
# close line (the exit, the duration) each. No hidden folders. No secrets.
set -u
here=$(cd "$(dirname "$0")" && pwd)
haiccing=$(cd "$here/../../../.." && pwd)
work=$(dirname "$haiccing")
logdir=$work/log
mkdir -p "$logdir"
# Its output, to the log too (the exit code kept through the pipe).
if [ -z "${HAICC_BOOT_LOGGING:-}" ]; then
  export HAICC_BOOT_LOGGING=1
  # The current log file (the newest), or a new one named by now.
  log=$(ls "$logdir" | grep -E '^[0-9]{8}T[0-9]{6}Z\.log$' | sort | tail -1)
  if [ -z "$log" ] || [ "$(wc -c < "$logdir/$log")" -ge 10240 ]; then log=$(date -u +%Y%m%dT%H%M%SZ).log; fi
  log=$logdir/$log
  # How long: from the machine's uptime, a clock that never steps back.
  t0=$(cut -d' ' -f1 /proc/uptime)
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) ${HAICC_AS:-./boot} $*  (in $(pwd))" | tee -a "$log"
  { sh "$0" "$@" 2>&1; echo $? > "$logdir/boot.exit"; } | tee -a "$log"
  code=$(cat "$logdir/boot.exit" 2>/dev/null || echo 1); rm -f "$logdir/boot.exit"
  echo "== exit $code, $(awk -v a="$t0" -v b="$(cut -d' ' -f1 /proc/uptime)" 'BEGIN { printf "%.1f", b - a }') s" | tee -a "$log"
  [ "$code" = 0 ] || exit "$code"
  # 3. Stage 2: HAICC itself (it logs itself).
  exec "$work/haicc" boot "$@"
fi
export HAICC_WORK=$work
echo "haicc-base-boot $(cat "$here/VERSION"): stage 1, the work folder $work"

# 1. Step 0: Linux x86-64; Bare's runtime, as the setup placed it (bare/), runs here.
runtime=$work/bare/bare
echo "Checking what HAICC needs to run..."
if ! sh "$here/step0.sh" check "$runtime"; then
  echo
  echo "HAICC cannot run here: what is marked 'no' above."
  exit 1
fi
PATH=$work/bare:$PATH; export PATH

# 2. The platform's pair, copied whole into packages/ (hard links): HAICC and
# the package manager, as haiccing/ has them (the setup's bootstrap, or what
# the root's last boot refreshed). The warm boot deploys them properly.
for p in base-package-haicc base-package-pkgm; do
  [ -f "$haiccing/$p/package.json" ] || { echo "  $p: not in $haiccing (the platform is a pair)"; exit 1; }
  mkdir -p "$work/packages" && rm -rf "$work/packages/$p.new" && cp -al "$haiccing/$p" "$work/packages/$p.new" && rm -rf "$work/packages/$p.new/.git" && rm -rf "$work/packages/$p" && mv "$work/packages/$p.new" "$work/packages/$p" || { echo "  could not copy $p into $work/packages"; exit 1; }
  echo "  copied $p ($(sed -n 's/.*"hash": *"\([0-9a-f]\{12\}\).*/\1/p' "$work/packages/$p/package.json" | head -1)) into $work/packages"
done
cat > "$work/haicc.new" <<EOS
#!/bin/sh
# HAICC for this work folder (written by ./boot): ./haicc <command>
work=\$(cd "\$(dirname "\$0")" && pwd)
HAICC_WORK=\$work; HAICC_AS=\$0; export HAICC_WORK HAICC_AS
PATH=\$work/bare:\$PATH; export PATH
exec bare "\$work/packages/base-package-haicc/modules/pear-full-square/haicc-base-boot/haicc.js" "\$@"
EOS
chmod 755 "$work/haicc.new" && mv "$work/haicc.new" "$work/haicc"
echo "  written $work/haicc"
echo "Stage 1 done. Now the host's prerequisites (./haicc boot)."
