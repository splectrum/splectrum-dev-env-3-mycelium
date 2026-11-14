import test from 'brittle'
import * as json from '../index.js'

test('a value to bytes and back', (t) => {
  const v = { to: '/level/main', body: { n: 1, s: 'é', list: [true, null] } }
  const bytes = json.encode(v)
  t.is(bytes.toString(), JSON.stringify(v) + '\n', 'one line')
  t.alike(json.decode(bytes), v)
  t.is(json.extension, 'json')
})
