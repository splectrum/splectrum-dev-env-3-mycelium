#!/bin/sh
# Put a request into an instance's pending/default, as one commit, with
# request intake (layer/request, mycelium-layer).
#   test-run/request.sh <repo> <request-dir>
# The request dir (e.g. test-run/requests/report-runs) becomes
# pending/<its name>/; a request already there is refused. Kick the
# instance afterwards.
set -eu
repo=$1
req=$2
src=$(cd "$(dirname "$0")/.." && pwd)
node --input-type=module -e "
import { intake } from '$src/mycelium-layer/index.js'
import { openInstance } from '$src/test-run/instance.js'
const [repo, folder, name, code] = process.argv.slice(1)
const instance = await openInstance(repo, { code })
try {
  await intake({ backend: instance.backend, folder, name,
    author: { name: 'test-run', email: 'test-run@localhost' } })
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
} finally {
  await instance.close()
}" "$repo" "$req" "$(basename "$req")" "$src"
echo "requested $(basename "$req")"
