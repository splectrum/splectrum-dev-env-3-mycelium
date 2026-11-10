import test from 'brittle'
import { mkdtempSync, rmSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { inbox, outbox, dispatch, record } from '../index.js'

test('the boxes: folders in the host\'s repository folder', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boxes-'))
  try {
    inbox(work).add(record('/inbox', 1))
    outbox(work).add(record('/outbox', 2, { mrepo: { to: '/inbox' } }))
    t.ok(existsSync(join(work, 'mrepos', 'host', 'inbox')), '/inbox: <work>/mrepos/host/inbox')
    t.ok(existsSync(join(work, 'mrepos', 'host', 'outbox')), '/outbox: <work>/mrepos/host/outbox')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the dispatcher: a record to /inbox POSTed there, its topic rewritten; to the outside left; any other held', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boxes-'))
  try {
    const a = outbox(work).add(record('/outbox', { text: 'hi' }, { mrepo: { to: '/inbox' } }))
    const b = outbox(work).add(record('/outbox', 'answer', { mrepo: { to: null, re: 'x' } }))
    const c = outbox(work).add(record('/outbox', 2, { mrepo: { to: '/elsewhere/inbox' } }))
    const said = []
    const held = new Set()
    dispatch({ work, held, say: e => said.push(e) })
    t.alike(inbox(work).list(), [a], 'delivered under the same name')
    const rec = inbox(work).read(a)
    t.is(rec.topic, '/inbox', 'its topic where it lives now')
    t.alike(rec.headers.mrepo, { from: '/outbox' })
    t.alike(rec.value, { text: 'hi' }, 'its value unchanged')
    t.alike(outbox(work).list(), [b, c], 'the answer left for its input, the other held')
    dispatch({ work, held, say: e => said.push(e) })
    t.alike(said.map(e => e.runtime), ['dispatched', 'held'], 'held said once')
  } finally { rmSync(work, { recursive: true, force: true }) }
})
