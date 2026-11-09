import test from 'brittle'
import { mkdtempSync, rmSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { inbox, outbox, dispatch, takeIn } from '../lib/boxes.js'

test('the boxes: folders in the level\'s view', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boxes-'))
  try {
    inbox(work).add({ from: null, body: 1 })
    outbox(work).add({ to: '/inbox', body: 2 })
    t.ok(existsSync(join(work, 'haicc', 'inbox')), '/inbox: <work>/haicc/inbox')
    t.ok(existsSync(join(work, 'haicc', 'outbox')), '/outbox: <work>/haicc/outbox')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the dispatcher: a message to /inbox PUT there; any other held', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boxes-'))
  try {
    const a = outbox(work).add({ to: '/inbox', body: { text: 'hi' } })
    const b = outbox(work).add({ to: '/inbox', body: 1 })
    const c = outbox(work).add({ to: '/elsewhere/inbox', body: 2 })
    const said = []
    const held = new Set()
    dispatch({ work, held, say: e => said.push(e) })
    t.alike(inbox(work).list(), [a, b], 'delivered, in order, under the same names')
    t.alike(inbox(work).read(a), { from: '/outbox', body: { text: 'hi' } })
    t.alike(outbox(work).list(), [c], 'no root for it yet: held in the outbox')
    dispatch({ work, held, say: e => said.push(e) })
    t.alike(said.map(e => e.main), ['dispatched', 'dispatched', 'held'], 'held said once')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the repository taking its inbox in: said, taken out', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boxes-'))
  try {
    const a = inbox(work).add({ from: null, body: 3 })
    const said = []
    takeIn({ work, say: e => said.push(e) })
    t.alike(inbox(work).list(), [])
    t.alike(said, [{ main: 'received', message: a, from: null, body: 3 }])
  } finally { rmSync(work, { recursive: true, force: true }) }
})
