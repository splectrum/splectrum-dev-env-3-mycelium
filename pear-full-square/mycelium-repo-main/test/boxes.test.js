import test from 'brittle'
import { mkdtempSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { outbox, inbox, received, dispatch, takeIn } from '../lib/boxes.js'

test('the dispatcher: by prefix into a repository\'s inbox, its URI translated; any other held', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boxes-'))
  try {
    const out = outbox(work)
    const a = out.add({ to: '/level/main/hello', from: null, body: { text: 'hi' } })
    const b = out.add({ to: '/level', from: null, body: 1 })
    const c = out.add({ to: '/elsewhere/main', from: null, body: 2 })
    const said = []
    const held = new Set()
    const to = { level: inbox(work, 'level') }
    dispatch({ from: out, to, held, say: e => said.push(e) })
    t.alike(to.level.list(), [a, b], 'delivered, in order, under the same names')
    t.alike(to.level.read(a), { to: '/main/hello', from: null, body: { text: 'hi' } }, 'the URI the repository\'s own')
    t.is(to.level.read(b).to, '/', 'the repository itself: its root')
    t.alike(out.list(), [c], 'no repository for it: held in the outbox')
    dispatch({ from: out, to, held, say: e => said.push(e) })
    t.alike(said.map(e => e.main), ['dispatched', 'dispatched', 'held'], 'held said once')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('a repository taking its inbox in: recorded as received', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boxes-'))
  try {
    const box = inbox(work, 'level')
    const a = box.add({ to: '/main/x', from: null, body: 3 })
    const said = []
    takeIn({ from: box, to: received(work, 'level'), say: e => said.push(e) })
    t.alike(box.list(), [])
    t.alike(received(work, 'level').read(a).body, 3)
    t.alike(said, [{ main: 'received', message: a, to: '/main/x', from: null }])
  } finally { rmSync(work, { recursive: true, force: true }) }
})
