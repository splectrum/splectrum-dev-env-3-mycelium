#!/bin/sh
# A package brought to the package template: an explicit step, a package
# at a time (haiccing/package-docs-template, "From the template"). From the
# template's own repository, at the commit it is at:
#   - the generic tests' folders, into the package's test/ (written over);
#   - test-reports/README.md (the package's reports stay its own);
#   - the pin: package.json's template, that repository and commit.
# The package's own tests, its sets and its READMEs are not touched: its
# test/README.md links to each test's folder, its README to test-reports/,
# by hand. Then its pre-release: tools/bare tools/package-test.js.
#   sh tools/package-template.sh <package>...
#   PACKAGES   where the repositories' clones are kept (the folder beside
#              this repository by default); the template's is cloned when
#              not there, and brought up to its main
# One line a package: the commit it is pinned to.
set -eu
dev=$(cd "$(dirname "$0")/.." && pwd)
[ $# -ge 1 ] || { echo 'sh tools/package-template.sh <package>...' >&2; exit 2; }
home=${PACKAGES:-$(dirname "$dev")}
repo=haiccing/package-docs-template
tpl=$home/package-docs-template
[ -d "$tpl/.git" ] || git clone -q --depth 1 "https://github.com/$repo" "$tpl"
git -C "$tpl" pull -q --ff-only origin main 2>/dev/null || true
[ -z "$(git -C "$tpl" status --porcelain)" ] || { echo "the template's clone has changes of its own: $tpl" >&2; exit 2; }
commit=$(git -C "$tpl" rev-parse HEAD)
generic="help code mrepo package modules help-in-situ mrepo-in-situ"
for p in "$@"; do
  dir=$dev/haiccing/$p
  [ -f "$dir/package.json" ] || { echo "$p: no package here" >&2; exit 2; }
  [ "$p" != package-docs-template ] || { echo "$p: the template itself" >&2; exit 2; }
  mkdir -p "$dir/test" "$dir/test-reports"
  for t in $generic; do
    rm -rf "${dir:?}/test/$t"
    cp -a "$tpl/test/$t" "$dir/test/$t"
  done
  cp "$tpl/test-reports/README.md" "$dir/test-reports/README.md"
  "$dev/tools/bare" -e "
    import { readFileSync, writeFileSync } from 'bare-fs'
    const f = '$dir/package.json'
    const pj = JSON.parse(readFileSync(f, 'utf8'))
    const out = {}
    for (const [k, v] of Object.entries(pj)) { if (k === 'template') continue; if (k === 'scripts') out.template = { repository: '$repo', commit: '$commit' }; out[k] = v }
    if (!out.template) out.template = { repository: '$repo', commit: '$commit' }
    writeFileSync(f, JSON.stringify(out, null, 2) + '\n')
  "
  echo "$p: $commit"
done
