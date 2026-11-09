import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const haicc = (...args) => spawnSync(Bare.argv[0], [join(here, 'haicc.js'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

test('version: the module and its version, as one JSON line', (t) => {
  const r = haicc('version')
  t.is(r.status, 0)
  const v = JSON.parse(String(r.stdout))
  t.is(v.name, 'haicc-base-cli')
  t.ok(/^\d+\.\d+\.\d+$/.test(v.version))
})

test('a bad call: exit 2, said on stderr', (t) => {
  t.is(haicc().status, 2)
  t.is(haicc('nothing-such').status, 2)
  t.ok(String(haicc('nothing-such').stderr).includes("no command 'nothing-such'"))
})
