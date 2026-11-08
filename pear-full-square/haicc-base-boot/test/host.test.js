import test from 'brittle'
import { existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath, pathToFileURL } from 'bare-url'
import { CHECKS, atLeast } from '../lib/host.js'

const here = dirname(dirname(fileURLToPath(import.meta.url)))
const reconcile = join(dirname(here), 'haicc-reconcile', 'index.js')

test('the host checks: each observes, says, and has a fix or a hint', (t) => {
  for (const c of CHECKS) {
    const a = c.observe()
    t.is(typeof c.met(a), 'boolean', c.name)
    t.is(typeof c.detail(a), 'string', c.name)
    t.ok(c.fix || c.hint, c.name)
  }
  t.ok(atLeast('2.43.0', '2.25') && !atLeast('2.20.1', '2.25') && atLeast('2.25', '2.25'))
})

// The boot's copy and haicc-reconcile's machine kinds: the same verdict on
// this host, each check (the copy is the boot's own: this keeps them agreeing).
test('the boot\'s host checks agree with haicc-reconcile\'s', { skip: existsSync(reconcile) ? false : 'haicc-reconcile is not beside the boot' }, async (t) => {
  const { providers } = await import(pathToFileURL(reconcile).href)
  const pairs = { git: ['git', { atLeast: '2.25' }], 'docker-installed': ['docker-installed', {}], 'docker-running': ['docker-running', {}], 'docker-group': ['docker-group', {}], 'docker-native': ['docker', { native: true }] }
  for (const c of CHECKS) {
    const [kind, want] = pairs[c.name]
    const p = providers[kind]
    const r = { name: c.name, kind, want }
    const theirs = p.compare(r, await p.observe(r)).status === 'met'
    t.is(c.met(c.observe()), theirs, `${c.name}: the boot says ${c.met(c.observe())}, haicc-reconcile ${theirs}`)
  }
})
