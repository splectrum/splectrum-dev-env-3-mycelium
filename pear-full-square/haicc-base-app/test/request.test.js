// A command sent: its record in the mrepo's inbox folder, value by value;
// its response waited for in the outbox folder.
import test from 'brittle'
import { mkdtempSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'bare-fs'
import { tmpdir } from 'bare-os'
import { join } from 'bare-path'
import { request, Failure } from '../index.js'

// An mrepo's folder, its two boxes; answer(): the first record in its inbox
// answered in its outbox, as a runtime would (the envelope read, returned).
function mrepo () {
  const root = mkdtempSync(join(tmpdir(), 'haicc-app-'))
  mkdirSync(join(root, 'inbox')); mkdirSync(join(root, 'outbox'))
  const answer = (result, after = 50) => new Promise(resolve => {
    const t = setInterval(() => {
      const files = readdirSync(join(root, 'inbox'))
      if (!files.length) return
      clearInterval(t)
      const envelope = JSON.parse(readFileSync(join(root, 'inbox', files[0]), 'utf8'))
      setTimeout(() => {
        writeFileSync(join(root, 'outbox', files[0]), JSON.stringify({ topic: '/outbox', key: envelope.key, timestamp: 'now', headers: {}, value: { ...envelope.value, value: { command: envelope.value.value, ...result } } }) + '\n')
        resolve({ files, envelope })
      }, after)
    }, 20)
  })
  return { root, answer, remove: () => rmSync(root, { recursive: true, force: true }) }
}

test('request: the record written, value by value; its response read as stored', async (t) => {
  const m = mrepo()
  try {
    const answered = m.answer({ output: { ok: 1 } })
    const r = await request(m.root, ['boot/deploy', 'host', 'a "b" c'], { uri: 'local/boot', reply: '/haicc/terminal', timeout: 5, every: 20 })
    const { files, envelope } = await answered
    t.alike(files, [`${r.key}.json`], 'one document in the inbox folder, named by its key; nothing half written beside it')
    t.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r.key), 'its key a GUID')
    t.alike(Object.keys(envelope), ['topic', 'key', 'timestamp', 'headers', 'value'], 'an envelope: a record')
    t.is(envelope.topic, '/local/boot/inbox', "addressed to the mrepo's inbox, by its unique URI")
    t.is(envelope.key, r.key, 'its key the request\'s')
    t.alike(envelope.headers, {}, 'its headers empty')
    t.ok(!isNaN(Date.parse(envelope.timestamp)), 'its timestamp a time')
    const core = envelope.value
    t.alike(Object.keys(core), ['topic', 'key', 'timestamp', 'headers', 'value'], 'its value the core: a record')
    t.is(core.topic, '/haicc/terminal', 'the core addressed back: where the completed form is to arrive')
    t.is(core.key, r.key, 'the same key')
    t.alike(core.headers, {}, 'its headers empty')
    t.alike(core.value, ['boot/deploy', 'host', 'a "b" c'], 'its value the command: the parts as given, unnamed')
    t.is(r.text, readFileSync(join(m.root, 'outbox', `${r.key}.json`), 'utf8'), 'the response: the document in the outbox folder under the same key, as stored')
    t.alike(JSON.parse(r.text).value.value.output, { ok: 1 })
  } finally { m.remove() }
})

test('request: no response in time: exit 4, the key said; the request stays', async (t) => {
  const m = mrepo()
  try {
    let failure = null
    try { await request(m.root, ['help/get'], { uri: 'local/boot', reply: '/haicc/terminal', timeout: 0.2, every: 20 }) } catch (err) { failure = err }
    t.ok(failure instanceof Failure && failure.code === 4, 'exit 4')
    const [file] = readdirSync(join(m.root, 'inbox'))
    t.is(failure.message, `no response in 0.2 s (the request stays: ${file.slice(0, -5)})`, 'said, with its key')
  } finally { m.remove() }
})
