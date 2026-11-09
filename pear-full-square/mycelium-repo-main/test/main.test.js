import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const main = (...args) => spawnSync(Bare.argv[0], [join(here, 'main.js'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

test('version: the module and its version', (t) => {
  const r = main('version')
  t.is(r.status, 0)
  t.is(JSON.parse(String(r.stdout)).name, 'mycelium-repo-main')
})

test('a bad call: exit 2', (t) => {
  t.is(main().status, 2)
  t.is(main('nothing').status, 2)
})
