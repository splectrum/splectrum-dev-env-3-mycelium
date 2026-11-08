import test from 'brittle'
import { mkdtempSync, statSync, readdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { vault } from '../vault.js'

test('the vault stand-in: a key per node, born here, owner-only, stable', (t) => {
  const dir = join(mkdtempSync(join(tmpdir(), 'vault-')), 'v')
  const v = vault(dir)
  t.is(v.has('s', 'master'), false)
  const k = v.keyFor('s', 'master')
  t.ok(/^[0-9a-f]{64}$/.test(k))
  t.is(v.keyFor('s', 'master'), k)
  t.not(v.keyFor('s', 'node-1'), k)
  t.is(statSync(dir).mode & 0o777, 0o700)
  for (const f of readdirSync(dir)) t.is(statSync(join(dir, f)).mode & 0o777, 0o600)
})
