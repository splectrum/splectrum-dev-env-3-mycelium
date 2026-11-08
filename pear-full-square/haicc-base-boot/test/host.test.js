import test from 'brittle'
import { CHECKS, atLeast } from '../lib/host.js'

test('the host checks: each observes, says, and has a fix or a hint', (t) => {
  for (const c of CHECKS) {
    const a = c.observe()
    t.is(typeof c.met(a), 'boolean', c.name)
    t.is(typeof c.detail(a), 'string', c.name)
    t.ok(c.fix || c.hint, c.name)
  }
  t.ok(atLeast('2.43.0', '2.25') && !atLeast('2.20.1', '2.25') && atLeast('2.25', '2.25'))
})
