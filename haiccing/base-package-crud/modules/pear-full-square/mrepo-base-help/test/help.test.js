// The help layer: READMEs parsed into their levels, extracted from bundles'
// files at the URIs they document, with their index; retrieved by help get.
import test from 'brittle'
import { parse, extract, check } from '../internal/extract/index.js'
import { get as help } from '../external/get/index.js'

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
  t.alike(Object.keys(files).sort(), ['/README.md', '/index.json', '/packages/README.md', '/packages/haiccing/app/README.md', '/packages/haiccing/app/test/README.md', '/packages/haiccing/docs/README.md', '/problems.json'], 'the mrepo folder of the docs package at the root; the others under /packages; no third-party')
  const index = JSON.parse(files['/index.json'].toString())
  t.alike(index['/'], { title: 'mrepo/', oneliner: 'The mrepo.', links: ['/packages'] })
  t.alike(index['/packages'].links, ['/packages/haiccing/docs', '/packages/haiccing/app'], 'each linked package')
  t.alike(index['/packages/haiccing/app'].links, ['/packages/haiccing/app/test'], 'a link to nothing dropped')
  t.alike(index['/packages/haiccing/docs'].links, ['/'], 'its link to its mrepo/: the help root, where that folder went')
})

test('help get: the levels, a section, the nearest when nothing is there', async (t) => {
  const files = extract(packages)
  const exec = { read: async uri => { const f = files[uri.slice('/help'.length)]; if (!f) throw new Error('none'); return f } }
  const s = await help(exec, { uri: ['main', '.'], args: ['packages/haiccing/app'] })
  t.alike([s.uri, s.oneliner, s.links], ['packages/haiccing/app', 'An app.', [{ uri: 'packages/haiccing/app/test', oneliner: 'Its tests.' }]], 'the subject its first argument, from the mrepo\'s root; the summary level: the one-liner, the links with theirs')
  t.ok(typeof s.summary === 'string')
  t.alike(Object.keys(await help(exec, { uri: ['main', '.'], args: ['help', 'oneliner'] })), ['uri', 'title', 'oneliner', 'links'], 'the root, by help too; one-liners only')
  const root = await help(exec, { uri: ['main', '.'], args: ['oneliner'] })
  t.alike([root.uri, root.links], ['.', [{ uri: 'packages', oneliner: root.links[0].oneliner }]], 'a level first: no subject, the mrepo itself; its URI .')
  t.is((await help(exec, { uri: ['main', '.'] })).uri, '.', 'no argument at all: the mrepo itself, the summary')
  t.is((await help(exec, { uri: ['main', '.'], args: ['.', 'detail'] })).uri, '.', '. written out')
  t.is((await help(exec, { uri: ['main', '.'], args: ['./packages'] })).uri, 'packages', './ in front')
  await t.exception(help(exec, { uri: ['main', '.'], args: ['/packages'] }), /not a relative URI: \/packages/)
  await t.exception(help(exec, { uri: ['main', '.'], args: ['packages/haiccing/app/test/nothing'] }), /no help at packages\/haiccing\/app\/test\/nothing: nearest packages\/haiccing\/app\/test/)
  await t.exception(help(exec, { uri: ['main', '.'], args: ['packages/haiccing/app', 'no', 'such', 'section'] }), /no section "no such section" at packages\/haiccing\/app/)
  await t.exception(help({ read: async () => { throw new Error('none') } }, { uri: ['main', '.'] }), /no help extracted in this mrepo yet \(help\/extract\)/)
})

test('the rules: a README against them, and a tree with a broken link, an unlinked folder, an unreached README', (t) => {
  const bad = '# bad\n\nA one-liner far too long (with parentheses), going on and on and on and on and on and on and on and on and on, see ' + 'docs' + '/design/x.md\n\n## A title much too long here\n'
  t.alike(check(bad).map(([c]) => c).sort(), ['oneliner', 'oneliner', 'oneliner', 'sections', 'transient'].sort(), 'its length, its parentheses, not one sentence; a long section title; a reference to the development repository')
  t.alike(check(README), [], 'a good one: none')
  const out = extract([{ pkg: 'o/p', help: null, paths: ['/README.md', '/a/README.md', '/b/README.md', '/c/x/README.md'], files: {
    '/README.md': B('# p\n\nThe package.\n\n[a/](a/) [nowhere/](nowhere/)\n'),
    '/a/README.md': B('# a\n\nThe a part.\n'),
    '/b/README.md': B('# b\n\nThe b part.\n'),
    '/c/x/README.md': B('# x\n\nThe x part.\n')
  } }])
  const problems = JSON.parse(out['/problems.json'].toString()).map(p => `${p.uri} ${p.check}`).sort()
  t.alike(problems, ['/packages/o/p cascade', '/packages/o/p cascade', '/packages/o/p links', '/packages/o/p/b reached', '/packages/o/p/c/x reached'].sort(), 'the link to nothing; b and c/x not linked, not reached')
})

test('parse: a heading inside a code block is not a section', (t) => {
  const r = parse('# x\n\nThe x.\n\n```markdown\n## not one\n```\n\n## One\n\nText.\n')
  t.alike(r.sections.map(s => s.title), ['One'])
  t.ok(r.summary.includes('## not one'), 'it stays in the summary')
})
