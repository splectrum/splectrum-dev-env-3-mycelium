import test from 'brittle'
import { isSegment, validate, sameName, isUri, parse, format, join, parent, split } from '../index.js'

test('isSegment', (t) => {
  for (const s of ['main', 'a-1', '0', 'phase-1', 'request.md', 'a.tar.gz']) t.ok(isSegment(s), s)
  for (const s of ['', 'Main', 'a_b', 'a b', 'é', '.gitignore', 'a.', 'a..b', '.', '..', 'README.md', null]) {
    t.ok(!isSegment(s), String(s))
  }
})

test('validate: canonical URIs pass unchanged', (t) => {
  for (const u of ['/', '/main', '/overlay/config/x-1']) t.is(validate(u), u)
})

test('validate: accepted deviations are fixed', (t) => {
  t.is(validate(''), '/')
  t.is(validate('//'), '/')
  t.is(validate('/main/'), '/main')
  t.is(validate('/main//x/'), '/main/x')
  t.is(validate('///a///b///'), '/a/b')
  t.is(validate('/Main/README.md'), '/main/readme.md')
})

test('validate: broken rules throw', (t) => {
  t.is(validate('/pending/default/pending/r1/request.md'), '/pending/default/pending/r1/request.md')
  for (const bad of ['main', 'main/x', '/a?b', '/a#b', 'git:/a', '/a b', '/é', '/.git', '/a/..', '/a.']) {
    t.exception(() => validate(bad), undefined)
  }
  t.exception.all(() => validate(42), /must be a string/)  // a TypeError: brittle's exception rethrows native errors, .all expects them
})

test('validate: star steps', (t) => {
  t.is(validate('/main/*/a//', { star: true }), '/main/*/a')
  t.exception(() => validate('/main/*'), /bad segment '\*'/)
  t.exception(() => validate('/main/*x', { star: true }), /bad segment '\*x'/)
})

test('sameName', (t) => {
  t.ok(sameName('README.md', 'readme.md'))
  t.ok(sameName('readme.md', 'readme.md'))
  t.ok(!sameName('README.md', 'readme'))
})

test('isUri: canonical only', (t) => {
  t.ok(isUri('/main/x'))
  t.ok(!isUri('/main/'))
  t.ok(!isUri('main/x'))
})

test('parse', (t) => {
  t.alike(parse('/'), [])
  t.alike(parse('/main'), ['main'])
  t.alike(parse('/overlay/config/x-1'), ['overlay', 'config', 'x-1'])
  t.exception(() => parse('/main/'), /not canonical: \/main\/ \(canonical: \/main\)/)
  t.exception(() => parse('main'), /not absolute/)
  t.exception(() => parse('/README.md'), /not canonical: \/README.md \(canonical: \/readme.md\)/)
})

test('format', (t) => {
  t.is(format([]), '/')
  t.is(format(['main', 'x']), '/main/x')
})

test('join', (t) => {
  t.is(join('/', 'main'), '/main')
  t.is(join('/main', 'a/b', 'c'), '/main/a/b/c')
})

test('parent', (t) => {
  t.is(parent('/main/a'), '/main')
  t.is(parent('/main'), '/')
  t.exception(() => parent('/'))
})

test('split', (t) => {
  const branches = ['main', 'pending/default', 'overlay/config', 'capability/test']
  t.alike(split('/main', branches), { branch: 'main', path: '/' })
  t.alike(split('/main/a/b', branches), { branch: 'main', path: '/a/b' })
  t.alike(split('/overlay/config/x', branches), { branch: 'overlay/config', path: '/x' })
  t.alike(split('/pending/default/pending/phase-1', branches), { branch: 'pending/default', path: '/pending/phase-1' })
  t.exception(() => split('/overlay', branches), /no branch/)
  t.exception(() => split('/other/x', branches), /no branch/)
  t.exception(() => split('/a/b', ['a', 'a/b']), /overlap/)
  t.alike(split('/main/x', new Set(['main'])), { branch: 'main', path: '/x' })
})
