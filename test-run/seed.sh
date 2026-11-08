#!/bin/sh
# Seed a test-run instance repository, with repo/seed (mycelium-repo).
#   test-run/seed.sh <new-repo-dir> [request-dir]...
# Run from the dev repository's root, from a committed state. Creates:
#   main             a readme only (the instance's own data starts empty)
#   capability/test  every module (mycelium-*, p2p-*) and the run machinery
#   pending/default  a request per tests file (test/commands*.txt) of each module
#                    (mycelium-*, p2p-*),
#                    then the given request dirs (e.g. test-run/requests/report-runs)
#   execute/main     from main
# as a bare repository (no working tree), with the kick hooks/execute, which
# runs execute.js as deployed.
# The machinery comes from its pinned version: see deploy.sh.
set -eu
dir=$1
shift
src=$(pwd)
[ -e "$dir" ] && { echo "exists: $dir" >&2; exit 2; }
[ -z "$(git -C "$src" status --porcelain -- . ":!steps/*/*/record/*")" ] || { echo "dev tree has uncommitted changes; commit first" >&2; exit 2; }
source_commit=$(git -C "$src" rev-parse --short HEAD)
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

# The template (repo/seed): main with a readme, and pending/default with a
# request per tests file (test/commands.txt is test-<module>,
# test/commands-<variant>.txt is test-<module>-<variant>) and the given ones.
t=$stage/template
mkdir -p "$t/main" "$t/pending/default/pending"
printf '# Test-run instance\n\nSeeded from dev repository commit %s.\n' "$source_commit" > "$t/main/readme.md"
for tests in $(cd "$src" && ls mycelium-*/test/commands*.txt p2p-*/test/commands*.txt 2>/dev/null); do
  module=${tests%%/*}
  variant=$(basename "$tests" .txt | sed -n 's/^commands-//p')
  name=test-$module${variant:+-$variant}
  mkdir "$t/pending/default/pending/$name"
  printf '# Request: %s\n\nRun %s.\n\nRun: %s in %s\n' "$name" "$tests" "$tests" "$module" \
    > "$t/pending/default/pending/$name/request.md"
done
for req in "$@"; do cp -r "$src/$req" "$t/pending/default/pending/$(basename "$req")"; done

# Seeded (main, pending/default, execute/main), then the capability layer
# deployed.
# ENGINE=hyperdrive: the instance is a repository on the p2p layer, `repo`
# in a p2p-store at <dir>/store (p2p-mrepo), and the kick finds the p2p
# layer it needs to extract its tree through hooks/tools (this dev
# repository); otherwise a native bare repository.
if [ "${ENGINE:-native}" = hyperdrive ]; then
  mkdir -p "$dir/hooks"
  node "$src/p2p-mrepo/cli.js" create "$dir/store" >/dev/null
  printf '%s\n' "$src" > "$dir/hooks/tools"
fi
node --input-type=module -e "
import { seed } from '$src/mycelium-repo/index.js'
import { openInstance } from '$src/test-run/instance.js'
const [dir, template, source, code] = process.argv.slice(1)
const instance = await openInstance(dir, { code })
await seed({ backend: instance.backend, template, source,
  author: { name: 'test-run', email: 'test-run@localhost' } })
await instance.close()" "$dir" "$t" "dev commit $source_commit" "$src"
"$src/test-run/deploy.sh" "$dir" >/dev/null

# The kick, as deployed: every instance carries its own.
node --input-type=module -e "
import { openRepo } from '$src/mycelium-git/index.js'
import { openInstance } from '$src/test-run/instance.js'
const [dir, code] = process.argv.slice(1)
const instance = await openInstance(dir, { code })
process.stdout.write(await openRepo(instance.backend).read('/capability/test/hook.sh'))
await instance.close()" "$dir" "$src" > "$dir/hooks/execute"
chmod +x "$dir/hooks/execute"
echo "seeded $dir"
