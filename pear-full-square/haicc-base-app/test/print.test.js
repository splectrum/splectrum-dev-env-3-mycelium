// A response record printed: unpacked across lines, nothing of it changed;
// its completed form's output or error found.
import test from 'brittle'
import { unpack, outcome } from '../index.js'

const form = { command: ['haicc', '/host', 'service/start'], protocol: 'haicc', action: 'goto', uri: '/host', args: ['service/start'], remote: { at: '/host', folder: 'main/host', key: '0c1d4c6e-6a52-4e0a-9b4a-0d7c2f0e2f11' }, output: { service: 'started', state: 'started' } }
const core = { topic: '/haicc/terminal', key: 'f949ad01-34db-4dd9-a5bc-bf438a21028c', timestamp: '2026-11-13T02:02:29.000Z', headers: {}, value: form }
const stored = v => JSON.stringify({ topic: '/outbox', key: core.key, timestamp: '2026-11-13T02:02:31.745Z', headers: {}, value: v }) + '\n'
// packed again: line breaks, indentation and the space after an opened
// object's keys taken off
const packed = text => text.split('\n').map(l => l.replace(/^ */, '').replace(/([^\\])": /g, '$1":')).join('')

test('unpack: what fits stays as stored, what does not is opened, an entry a line', (t) => {
  const text = stored(core)
  t.is(unpack(text), `{
  "topic": "/outbox",
  "key": "f949ad01-34db-4dd9-a5bc-bf438a21028c",
  "timestamp": "2026-11-13T02:02:31.745Z",
  "headers": {},
  "value": {
    "topic": "/haicc/terminal",
    "key": "f949ad01-34db-4dd9-a5bc-bf438a21028c",
    "timestamp": "2026-11-13T02:02:29.000Z",
    "headers": {},
    "value": {
      "command": ["haicc","/host","service/start"],
      "protocol": "haicc",
      "action": "goto",
      "uri": "/host",
      "args": ["service/start"],
      "remote": {
        "at": "/host",
        "folder": "main/host",
        "key": "0c1d4c6e-6a52-4e0a-9b4a-0d7c2f0e2f11"
      },
      "output": {"service":"started","state":"started"}
    }
  }
}`, 'the record at 80 columns')
  t.is(unpack(text, 1000), text.trim(), 'a record that fits the width: left on one line')
  t.is(unpack('{}\n'), '{}', 'an empty object')
  t.is(unpack(''), '', 'nothing: nothing')
})

test('unpack: nothing of a record changed, at any width', (t) => {
  const tricky = { ...form, output: { text: 'a "quoted" word, a brace } and a bracket ] in a string, a backslash \\ and a colon ": inside', list: [1, 2.5, true, null, [], {}, [[['deep']]]], long: Array.from({ length: 40 }, (_, i) => `item-${i}`), empty: '' } }
  for (const v of [core, { ...core, value: tricky }, { ...core, value: { ...form, output: undefined, error: 'no section "x" at /packages' } }, ['a', 'list']]) {
    for (const width of [1, 20, 40, 80, 200]) {
      const text = stored(v)
      if (packed(unpack(text, width)) !== text.trim()) t.fail(`changed at width ${width}: ${text}`)
    }
  }
  t.pass('unpacked and packed again: every record as stored')
})

test('outcome: the completed form three deep, its output or its error; neither: none', (t) => {
  t.alike(outcome(stored(core)), { output: { service: 'started', state: 'started' } }, 'an output')
  t.alike(outcome(stored({ ...core, value: { ...form, output: undefined, error: 'deployed already: /host' } })), { error: 'deployed already: /host' }, 'an error')
  t.alike(outcome(stored({ ...core, value: { ...form, error: 'two\nlines' } })), { error: 'two lines' }, 'an error over lines: on one, and it wins over an output')
  t.alike(outcome(stored({ ...core, value: { ...form, output: null } })), { output: null }, 'an output of null is an output')
  t.is(outcome(stored({ ...core, value: { ...form, output: undefined } })), null, 'a form not completed: none')
  t.is(outcome(stored(core.value)), null, 'no core around the form: none')
  t.is(outcome('not json'), null, 'not a record: none')
})
