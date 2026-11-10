// The test's entry: bare test/start/run.js. The package's run.js run as a
// process; its exit code is the outcome.
import { spawnSync } from '../../modules/node_modules/bare-subprocess/index.js'
import os from '../../modules/node_modules/bare-os/index.js'

const r = spawnSync(os.execPath(), [new URL('../../run.js', import.meta.url).pathname, '--work=.'], { stdio: 'inherit' })
Bare.exitCode = r.status === 0 ? 0 : 1
