// The help layer: READMEs parsed into their levels, extracted from bundles'
// files at the URIs they document, with their index; retrieved by runtime help.
import test from 'brittle'
import { parse, extract, help } from '../lib/help.js'

const B = s => Buffer.from(s)
const README = '# thing\n\nA thing, with `package.json` inside. More here.\n\n| | |\n|---|---|\n| [sub/](sub/) | below |\n\n## Usage\n\nUse it.\n\n## Notes\n\nNone.\n'

test('parse: the title, the one-liner, the summary, the sections, the links', (t) => {
  const r = parse(README)
  t.is(r.title, 'thing')
  t.is(r.oneliner, 'A thing, with `package.json` inside.', 'the first sentence, a full stop in code ignored')
  t.ok(r.summary.startsWith('A thing') && r.summary.includes('[sub/](sub/)') && !r.summary.includes('Usage'), 'up to the first ## heading')
  t.alike(r.sections.map(s => s.title), ['Usage', 'Notes'])
  t.is(r.sections[0].text, 'Use it.')
  t.alike(r.links, ['sub/'])
})

const packages = [
  { pkg: 'haiccing/docs', help: 'mrepo', files: { '/README.md': B('# docs\n\nThe docs package.\n\n[mrepo/](mrepo/)\n'), '/mrepo/README.md': B('# mrepo/\n\nThe mrepo.\n\n[packages/](packages/)\n'), '/mrepo/packages/README.md': B('# /packages\n\nThe packages layer.\n') } },
  { pkg: 'haiccing/app', help: null, files: { '/README.md': B('# app\n\nAn app.\n\n[test/](test/) [gone/](gone/)\n'), '/test/README.md': B('# test/\n\nIts tests.\n'), '/modules/node_modules/x/README.md': B('# x\n\nThird party.\n') } }
]

test('extract: each README at the URI it documents; the index; the packages linked from the layer\'s help', (t) => {
  const files = extract(packages)
  t.alike(Object.keys(files).sort(), ['/README.md', '/index.json', '/packages/README.md', '/packages/haiccing/app/README.md', '/packages/haiccing/app/test/README.md', '/packages/haiccing/docs/README.md'], 'the mrepo folder of the docs package at the root; the others under /packages; no third-party')
  const index = JSON.parse(files['/index.json'].toString())
  t.alike(index['/'], { title: 'mrepo/', oneliner: 'The mrepo.', links: ['/packages'] })
  t.alike(index['/packages'].links, ['/packages/haiccing/docs', '/packages/haiccing/app'], 'each linked package')
  t.alike(index['/packages/haiccing/app'].links, ['/packages/haiccing/app/test'], 'a link to nothing dropped')
  t.alike(index['/packages/haiccing/docs'].links, ['/'], 'its link to its mrepo/: the help root, where that folder went')
})

test('runtime help: the levels, a section, the nearest when nothing is there', async (t) => {
  const files = extract(packages)
  const exec = { read: async uri => { const f = files[uri.slice('/help'.length)]; if (!f) throw new Error('none'); return f } }
  const s = await help(exec, { uri: '/packages/haiccing/app', body: {} })
  t.alike([s.uri, s.oneliner, s.links], ['/packages/haiccing/app', 'An app.', [{ uri: '/packages/haiccing/app/test', oneliner: 'Its tests.' }]], 'the summary level: the one-liner, the links with theirs')
  t.ok(typeof s.summary === 'string')
  t.alike(Object.keys(await help(exec, { uri: '/help/', body: { level: 'oneliner' } })), ['uri', 'title', 'oneliner', 'links'], 'the root, by /help too; one-liners only')
  await t.exception(help(exec, { uri: '/packages/haiccing/app/test/nothing', body: {} }), /no help at .*: nearest \/packages\/haiccing\/app\/test/)
  await t.exception(help({ read: async () => { throw new Error('none') } }, { uri: '/', body: {} }), /no help in this mrepo/)
})
