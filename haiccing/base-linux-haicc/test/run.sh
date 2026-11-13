#!/bin/sh
# The haicc command, tested end to end as it is installed: from the installer
# to a started host and its teardown, in a temporary folder, removed after.
# It leaves nothing running.
#   sh test/run.sh [--keep]
#     --keep    the temporary folder and its runtimes left as they are, to
#               inspect (its path printed)
#   SOURCES     the sources folder it links: the packages' bundles and
#               Bare's tarball (the development repository's sources/, built
#               by tools/release.js); else ../../../sources from here;
#               without one: skipped
# One line a check (ok, not ok), the count last; exit 0 passed, 1 failed.
set -u
here=$(cd "$(dirname "$0")" && pwd)
pkg=$(cd "$here/.." && pwd)
keep=no
[ "${1:-}" = --keep ] && keep=yes
. "$pkg/pins"
SOURCES=${SOURCES:-$pkg/../../sources}
for f in "$HAICC_ORG/$BOOT_PACKAGE.bundle" "$HAICC_ORG/base-component-haicc.bundle" "$HAICC_ORG/manifest.json" "$BARE_FILE"; do
  [ -f "$SOURCES/$f" ] || { echo "skipped: no $f in $SOURCES (SOURCES: a sources folder)"; exit 0; }
done
SOURCES=$(cd "$SOURCES" && pwd)

n=0; failed=0
ok () { n=$((n + 1)); echo "ok $n - $1"; }
no () { n=$((n + 1)); failed=$((failed + 1)); echo "not ok $n - $1"; [ -z "${2:-}" ] || echo "  # $2"; }
is () { if [ "$1" = "$2" ]; then ok "$3"; else no "$3" "got: $1; expected: $2"; fi; }
has () { case "$1" in *"$2"*) ok "$3" ;; *) no "$3" "got: $1; expected in it: $2" ;; esac; }

T=$(mktemp -d "${TMPDIR:-/tmp}/haicc-test.XXXXXX")
running () { pgrep -f -- "[/]bin/bare $T/" 2>/dev/null; }
cleanup () {
  if [ "$keep" = yes ]; then echo "kept: $T"; return; fi
  for pid in $(running); do kill "$pid" 2>/dev/null; done
  i=0; while [ -n "$(running)" ] && [ "$i" -lt 100 ]; do sleep 0.1 2>/dev/null || sleep 1; i=$((i + 1)); done
  for pid in $(running); do kill -9 "$pid" 2>/dev/null; done
  case "$T" in */haicc-test.*) rm -rf "$T" ;; esac
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# 1. the installer: the one build.sh writes; installed
sh "$pkg/build.sh" "$T/built.sh" >/dev/null
if cmp -s "$T/built.sh" "$pkg/haicc-install.sh"; then ok "the installer is the one build.sh writes"; else no "the installer is the one build.sh writes" "run: sh build.sh"; fi
out=$(sh "$pkg/haicc-install.sh" --home="$T/home" --bin="$T/bin" 2>&1)
is $? 0 "installed: sh haicc-install.sh --home --bin"
[ -x "$T/bin/haicc" ] && [ -f "$T/home/pins" ] && ok "the command registered in the bin folder, its scripts and pins in its own" || no "the command registered" "$out"
PATH=$T/bin:$PATH; export PATH
unset HAICC_HOME HAICC_WORK HAICC_RECORD 2>/dev/null
HAICC_TIMEOUT=180; export HAICC_TIMEOUT

# 2. the dispatcher
out=$(haicc --help); is $? 0 "haicc --help"
has "$out" "haicc sources link <folder>" "its usage: the script commands and the form of an mrepo command"
haicc nosuch >/dev/null 2>&1; is $? 2 "no such script command: exit 2"
out=$(haicc / 2>&1); is $? 2 "a URI with no command after it: exit 2"

# 3. nothing there yet: the prerequisites say what is missing; no boot
is "$(haicc sources)" "github:$HAICC_ORG" "the sources at first: https, the backup, by default"
out=$(haicc prereq --check); is $? 3 "haicc prereq --check, nothing linked: exit 3"
has "$out" "missing  sources:" "the sources missing, said"
has "$out" "missing  bare:" "Bare missing, said"
out=$(haicc boot 2>&1); is $? 3 "haicc boot without its prerequisites: exit 3, pointing to haicc prereq"
[ ! -e "$T/home/work/mrepos" ] && ok "nothing written" || no "nothing written"
out=$(haicc /host service/start 2>&1); is $? 3 "an mrepo command before the boot: exit 3"
has "$out" "no boot mrepo" "said: no boot mrepo (haicc boot)"

# 4. the sources
out=$(haicc sources link "$SOURCES")
is "$out" "folder:$SOURCES
github:$HAICC_ORG" "haicc sources link <folder>: the folder first, https the backup after it"
is "$(haicc sources no-https)" "folder:$SOURCES" "haicc sources no-https: the backup off"
haicc sources https >/dev/null; haicc sources link "$SOURCES" >/dev/null
is "$(haicc sources | wc -l | tr -d ' ')" 2 "https back on; a folder linked twice is listed once"
haicc sources link "$T/nowhere" >/dev/null 2>&1; is $? 2 "a folder that is not there: not linked"
out=$(haicc sources download "$HAICC_ORG" 2>&1); is $? 3 "haicc sources download $HAICC_ORG: our packages are not published yet, exit 3"
has "$out" "not published yet" "said"
haicc sources download nosuch >/dev/null 2>&1; is $? 3 "nothing to download by that name: exit 3"

# 5. the prerequisites: Bare unpacked from the sources, as pinned
out=$(haicc prereq --check); is $? 3 "haicc prereq --check: Bare not in place yet, nothing changed"
[ ! -e "$T/home/bare" ] && ok "nothing put in place by a check" || no "nothing put in place by a check"
out=$(haicc prereq); is $? 0 "haicc prereq: all there"
has "$out" "ok       bare: $BARE_VERSION, put in place from $SOURCES/$BARE_FILE" "Bare put in place from the sources"
is "$("$T/home/bare/bin/bare" --version 2>/dev/null)" "v$BARE_VERSION" "the pinned Bare, running"
is "$(cat "$T/home/bare/tarball.sha512")" "$BARE_SHA512" "its tarball's sha512 recorded: the pin"
out=$(haicc prereq --check); is $? 0 "haicc prereq --check: all there now"
has "$out" "ok       bare: $BARE_VERSION, as pinned" "Bare there, as pinned: kept"

# 6. the boot: the boot mrepo at the root, its runtime started, nothing deployed
out=$(haicc boot 2>&1); is $? 0 "haicc boot"
has "$out" '"protocol":"boot","action":"deploy","uri":"/boot"' "its request printed, completed: boot deploy /boot"
has "$out" '"repository":"boot"' "its runtime started"
[ -d "$T/home/work/mrepos/boot/inbox" ] && ok "the boot mrepo in the work folder" || no "the boot mrepo in the work folder"
[ ! -e "$T/home/work/mrepos/boot/main/host" ] && ok "nothing deployed by the boot" || no "nothing deployed by the boot"
is "$(running | wc -l | tr -d ' ')" 1 "one runtime running: the boot mrepo's"

# 7. commands: the host deployed at the root; passed through to it
out=$(haicc / boot/deploy host base-component-haicc 2>&1); is $? 0 "haicc / boot/deploy host base-component-haicc"
has "$out" '"deployed":"/host","mrepo":"local/host","package":"haiccing/base-component-haicc"' "its output: the haicc mrepo deployed at /host, its unique URI local/host"
out=$(haicc / boot/deploy host base-component-haicc 2>&1); is $? 1 "deployed again: exit 1"
is "$out" "haicc: deployed already: /host" "its error on stderr: /host is there already"
out=$(haicc /host boot/deploy node-1 base-package-runtime 2>&1); is $? 1 "the host booted: its boot protocol behind the service's door"
is "$out" "haicc: not now: boot deploy (the service is booted, not started)" "said"
is "$(haicc /host service/initialise 2>&1)" '{"service":"initialised"}' "haicc /host service/initialise: passed through to the haicc mrepo"
is "$(haicc /host service/start 2>&1)" '{"service":"started"}' "haicc /host service/start"

# 8. a node inside the host; commands chained through both
out=$(haicc /host boot/deploy node-1 base-package-runtime 2>&1); is $? 0 "haicc /host boot/deploy node-1: executed by the haicc mrepo"
has "$out" '"deployed":"/node-1","mrepo":"local/node-1"' "the node deployed inside it"
[ -d "$T/home/work/mrepos/boot/main/host/main/node-1/inbox" ] && ok "in the shadow of its main: main/host/main/node-1" || no "in the shadow of its main"
is "$(running | wc -l | tr -d ' ')" 3 "three runtimes running: the boot mrepo's, the host's, the node's"
out=$(haicc /host haicc /node-1 help/get /packages oneliner 2>&1); is $? 0 "haicc /host haicc /node-1 help/get /packages: chained through two shortcuts"
has "$out" '"uri":"/packages"' "answered by the node"
case "$out" in *base-package-boot*) no "the node's packages, not the host's" "$out" ;; *) ok "the node's packages, not the host's" ;; esac
out=$(haicc /host/node-1 help/get 2>&1); is $? 1 "a URI running through a shortcut: exit 1"
has "$out" "/host is a shortcut: a URI does not run through it" "said, with the way across"
out=$(haicc / help/get /packages 'no "such" section' 2>&1); is $? 1 "an argument with spaces and quotes: sent whole"
has "$out" 'no section "no "such" section" at /packages' "and back in the error"
out=$(HAICC_RECORD=1 haicc /host help/get / oneliner 2>&1); is $? 0 "HAICC_RECORD=1: the whole record"
has "$out" '"topic":"/haicc/terminal"' "printed: the core addressed back to the terminal"

# 9. torn down: the node, then the host
is "$(haicc /host boot/teardown node-1 2>&1)" '{"tornDown":"/node-1"}' "haicc /host boot/teardown node-1"
is "$(haicc / boot/teardown host 2>&1)" '{"tornDown":"/host"}' "haicc / boot/teardown host: at the root, about the shortcut as an item"
[ ! -e "$T/home/work/mrepos/boot/main/host" ] && ok "the host's folder removed" || no "the host's folder removed"
is "$(running | wc -l | tr -d ' ')" 1 "one runtime left: the boot mrepo's"

# 10. the boot again: there already, kept
out=$(haicc boot 2>&1); is $? 0 "haicc boot again"
has "$out" '"already":true' "already built: kept"
is "$(running | wc -l | tr -d ' ')" 1 "still one runtime"

if [ "$keep" != yes ]; then
  cleanup; trap - EXIT
  [ -z "$(running)" ] && ok "nothing left running" || no "nothing left running"
  [ ! -e "$T" ] && ok "its folder removed" || no "its folder removed"
fi
echo "# checks = $((n - failed))/$n pass"
if [ "$failed" -eq 0 ]; then echo "# ok"; exit 0; else echo "# not ok"; exit 1; fi
