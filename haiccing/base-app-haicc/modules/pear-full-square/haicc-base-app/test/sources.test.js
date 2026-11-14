// The sources registered: the list's file read and written, and the haicc
// sources command's actions.
import test from 'brittle'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'bare-fs'
import { tmpdir } from 'bare-os'
import { join } from 'bare-path'
import { sources, sourcesCommand, LIST, Failure } from '../index.js'

const home = () => mkdtempSync(join(tmpdir(), 'haicc-app-'))

test('sources: the folders first, in the order linked, then https; a file in the first folder that holds it', (t) => {
  const h = home()
  try {
    const s = sources(h)
    t.alike(s.list(), [], 'no list yet: none')
    t.is(s.find('org/x.bundle'), null)
    mkdirSync(join(h, 'a', 'org'), { recursive: true }); mkdirSync(join(h, 'b', 'org'), { recursive: true })
    writeFileSync(join(h, 'b', 'org', 'x.bundle'), 'b'); writeFileSync(join(h, 'b', 'org', 'y.bundle'), 'b'); writeFileSync(join(h, 'a', 'org', 'y.bundle'), 'a')
    writeFileSync(join(h, LIST), `github:org\nfolder:${join(h, 'a')}\nfolder:${join(h, 'b')}\n`)
    t.alike(s.list(), [`folder:${join(h, 'a')}`, `folder:${join(h, 'b')}`, 'github:org'], 'the folders first, https after')
    t.alike(s.folders(), [join(h, 'a'), join(h, 'b')])
    t.is(s.find('org/x.bundle'), join(h, 'b', 'org', 'x.bundle'), 'found in the second folder')
    t.is(s.find('org/y.bundle'), join(h, 'a', 'org', 'y.bundle'), 'in both: the first')
    t.is(s.find('org/z.bundle'), null, 'in none')
    s.register('github:org'); s.register('folder:/c')
    t.alike(s.list(), [`folder:${join(h, 'a')}`, `folder:${join(h, 'b')}`, 'folder:/c', 'github:org'], 'registered once; a new one added')
    s.unregister(`folder:${join(h, 'a')}`)
    t.alike(s.folders(), [join(h, 'b'), '/c'], 'unregistered')
    t.absent(existsSync(join(h, `${LIST}.part`)), 'written aside, renamed')
  } finally { rmSync(h, { recursive: true, force: true }) }
})

test('haicc sources: the list, unlink, https and no-https, download', (t) => {
  const h = home()
  try {
    const said = []
    const run = (...args) => sourcesCommand(h, args, { org: 'haiccing', err: l => said.push(l) })
    const refused = (args, code) => { try { run(...args); return null } catch (err) { return err instanceof Failure && err.code === code ? err.message : `not ${code}: ${err.message}` } }
    mkdirSync(join(h, 'src'))
    writeFileSync(join(h, LIST), `folder:${join(h, 'src')}\ngithub:haiccing\n`)
    t.alike(run(), [`folder:${join(h, 'src')}`, 'github:haiccing'], 'haicc sources: the list')
    t.alike(run('list'), run(), 'haicc sources list: the same')
    t.alike(run('no-https'), [`folder:${join(h, 'src')}`], 'no-https: the backup off, the list said')
    t.is(readFileSync(join(h, LIST), 'utf8'), `folder:${join(h, 'src')}\n`, 'written')
    t.alike(run('https'), [`folder:${join(h, 'src')}`, 'github:haiccing'], 'https: back on')
    t.alike(run('https'), [`folder:${join(h, 'src')}`, 'github:haiccing'], 'twice: listed once')
    t.alike(run('unlink', join(h, 'src')), ['github:haiccing'], 'unlink: a folder that is there')
    writeFileSync(join(h, LIST), 'folder:/gone/away\ngithub:haiccing\n')
    t.alike(run('unlink', '/gone/away'), ['github:haiccing'], 'unlink: a folder that is no longer there, as it was written')
    t.is(refused(['unlink'], 2), 'haicc sources unlink <folder>', 'unlink without a folder: exit 2')
    t.is(refused(['link', '/x'], 2), 'haicc sources [unlink <folder> | download [<what>...] | https | no-https]', 'link is not the app\'s: exit 2, its own actions said')
    t.is(refused(['download', 'haiccing'], 3), '', 'download haiccing: exit 3')
    t.is(said.pop(), 'haicc: haiccing: not published yet; link a sources folder (haicc sources link <folder>)', 'said: not published yet')
    t.is(refused(['download'], 3), '', 'download, nothing named: our packages, the same')
    t.ok(said.pop().includes('haiccing: not published yet'))
    t.is(refused(['download', 'haiccing/base-package-runtime', 'nosuch', 'bare'], 3), '', 'several: each said, exit 3')
    t.alike(said.splice(0), ['haicc: haiccing/base-package-runtime: not published yet; link a sources folder (haicc sources link <folder>)', "haicc: nothing to download for 'nosuch' (bare, haiccing, haiccing/<package>)", 'haicc: bare: fetched on its own, before the app (haicc sources download bare)'])
  } finally { rmSync(h, { recursive: true, force: true }) }
})
