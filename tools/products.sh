#!/bin/sh
# A module's product repository kept updated from here (rules.md: once
# validated, its folder's history split and plain-merged into the product
# repository's main, never force-pushed, the commit messages linking the
# two commits; product repositories created by the human).
#   sh tools/products.sh <module>...           from this repository's main
# For each module (pear-full-square/<module>): its folder's history split
# (git subtree split), the product's main fetched, a merge commit made: its
# parents the product's head and the split, its tree the split's with the
# product's LICENSE kept; pushed to the product's main (a fast-forward of
# it). A first merge from this repository joins the histories. One line a
# module: its split, the product's commit. Glue only (docs/rules.md 30).
set -eu
dev=$(cd "$(dirname "$0")/.." && pwd)
cd "$dev"
from=$(git rev-parse main)
for m in "$@"; do
  [ -d "pear-full-square/$m" ] || { echo "$m: no module here"; exit 2; }
  url="https://github.com/pear-full-square/$m"
  split=$(git subtree split -q --prefix="pear-full-square/$m" "$from")
  git fetch -q "$url" "main:refs/product/$m"
  head=$(git rev-parse "refs/product/$m")
  if git merge-base --is-ancestor "$split" "$head"; then echo "$m: up to date (split $split in $head)"; continue; fi
  first=""; git merge-base "$head" "$split" >/dev/null 2>&1 || first=" (first merge)"
  index=$(mktemp); rm -f "$index"
  GIT_INDEX_FILE=$index git read-tree "$split"
  license=$(git ls-tree "$head" LICENSE | awk '{print $3}')
  if [ -n "$license" ] && [ -z "$(git ls-tree "$split" LICENSE)" ]; then
    GIT_INDEX_FILE=$index git update-index --add --cacheinfo "100644,$license,LICENSE"
  fi
  tree=$(GIT_INDEX_FILE=$index git write-tree); rm -f "$index"
  msg="Merge splectrum-dev-env-3-mycelium: pear-full-square/$m$first

From splectrum/splectrum-dev-env-3-mycelium@$from, its folder
pear-full-square/$m split as $split."
  commit=$(git commit-tree "$tree" -p "$head" -p "$split" -m "$msg")
  git push -q "$url" "$commit:refs/heads/main"
  echo "$m: split $split, product $commit"
done
