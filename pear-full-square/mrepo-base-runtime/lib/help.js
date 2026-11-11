// The help layer: every README of the packages an mrepo links, extracted at
// the URI it documents, with a generated index, by the runtime as it starts
// (before the mrepo is operational); retrieved by the runtime protocol's
// help action (runtime help <uri>, lib/protocol.js).
//
// Where a README goes (help URIs, the layer's paths):
//   a package's README at <path> in its bundle   /packages/<org>/<package><path>
//   a package whose package.json names a `help` folder (package-docs-mrepo:
//   "mrepo"): the READMEs in that folder        /<path inside it>
//                                               (it documents the mrepo itself)
// The index, /index.json: { "<uri>": { title, oneliner, links: ["<uri>"] } },
// the uri a README's folder ("/" the root); links resolved to help URIs, only
// those that have a README; /packages (the layer's help) linked to each
// package's own.
//
// A README's shape: # title; the one-liner, the first sentence of the first
// paragraph; the summary, everything up to the first ## heading; the
// detail, the ## sections.
//
//   parse(text)                     -> { title, oneliner, summary, sections: [{ title, text }], links: [href] }
//   extract(packages)               packages: [{ pkg, files: { '/<path>': bytes }, help }]
//                                   -> { '/<path>': bytes } (the READMEs and /index.json)
//   extractInto({ repo, writer, dir })  the help layer from the mrepo's
//                                   packages (its packages manifest, their
//                                   bundles in <dir>/packages/): what is there
//                                   replaced; committed when it changed
//                                   -> { readmes, changed }
//   help(exec, { uri, body })       runtime help <uri>, body { level:
//                                   'oneliner' | 'summary' | 'detail', section }
import { posix, join } from 'bare-path'
import { readFileSync, existsSync } from 'bare-fs'
import Bundle from 'bare-bundle'

// The first sentence: up to the first full stop followed by a space or the
// end, outside code spans (`package.json`).
function firstSentence (t) {
  let code = false
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '`') code = !code
    else if (!code && t[i] === '.' && (i + 1 === t.length || t[i + 1] === ' ')) return t.slice(0, i + 1)
  }
  return t
}

export function parse (text) {
  const lines = String(text).replace(/\r/g, '').split('\n')
  const title = (lines.find(l => l.startsWith('# ')) ?? '# ').slice(2).trim()
  const at = lines.findIndex(l => l.startsWith('# '))
  const body = lines.slice(at + 1)
  const first = body.findIndex(l => l.startsWith('## '))
  const summary = (first === -1 ? body : body.slice(0, first)).join('\n').trim()
  const sections = []
  if (first !== -1) {
    let cur = null
    for (const l of body.slice(first)) {
      if (l.startsWith('## ')) { cur = { title: l.slice(3).trim(), lines: [] }; sections.push(cur) } else cur.lines.push(l)
    }
  }
  const para = summary.split(/\n\s*\n/).find(p => p.trim() && !p.trim().startsWith('|') && !p.trim().startsWith('```')) ?? ''
  const flat = para.replace(/\s+/g, ' ').trim()
  const oneliner = firstSentence(flat)
  const links = [...String(text).matchAll(/\]\(([^)\s#]+)\)/g)].map(m => m[1]).filter(h => !/^[a-z]+:/.test(h))
  return { title, oneliner, summary, sections: sections.map(s => ({ title: s.title, text: s.lines.join('\n').trim() })), links }
}

// A bundle path to its help path (null: not extracted).
function placeOf (pkg, help, path) {
  if (help && path.startsWith(`/${help}/`)) return path.slice(help.length + 1)
  return `/packages/${pkg}${path}`
}
const folderOf = p => posix.dirname(p) === '/' ? '/' : posix.dirname(p)

export function extract (packages) {
  const out = {}
  const where = {} // help folder -> { pkg, help, path }
  for (const { pkg, files, help } of packages) {
    for (const path of Object.keys(files).sort()) {
      if (posix.basename(path) !== 'README.md' || path.includes('/node_modules/')) continue
      const to = placeOf(pkg, help, path)
      out[to] = files[path]
      where[folderOf(to)] = { pkg, help, path }
    }
  }
  const index = {}
  for (const [uri, { pkg, help, path }] of Object.entries(where).sort(([a], [b]) => a < b ? -1 : 1)) {
    const r = parse(out[uri === '/' ? '/README.md' : `${uri}/README.md`].toString())
    const links = []
    for (const h of r.links) {
      const target = posix.normalize(posix.join(posix.dirname(path), h))
      const readme = target.endsWith('.md') ? target : posix.join(target, 'README.md')
      const u = folderOf(placeOf(pkg, help, readme))
      if (where[u] && u !== uri && !links.includes(u)) links.push(u)
    }
    index[uri] = { title: r.title, oneliner: r.oneliner, links }
  }
  // The mrepo's own: its packages layer's help leads to each package it
  // links (the root's, when there is none).
  const hub = index['/packages'] ? '/packages' : index['/'] ? '/' : null
  if (hub) for (const { pkg } of packages) { const u = `/packages/${pkg}`; if (index[u] && !index[hub].links.includes(u)) index[hub].links.push(u) }
  out['/index.json'] = Buffer.from(JSON.stringify(index, null, 2) + '\n')
  return out
}

const author = { name: 'mrepo-runtime', email: 'mrepo-runtime@localhost' }
const LAYER = { mode: 'atomic', description: 'Help: the READMEs of the packages the mrepo links, at the URIs they document, and their index (extracted by the runtime as it starts).' }

export async function extractInto ({ repo, writer, dir }) {
  const listed = await repo.read('/packages/manifest.json').then(b => JSON.parse(b.toString()).packages || {}, () => null)
  if (!listed) return { readmes: 0, changed: false } // no packages: no help
  const present = Object.keys(listed).filter(pkg => existsSync(join(dir, 'packages', `${pkg}.bundle`)))
  if (!present.length) return { readmes: 0, changed: false } // no bundles here: no help
  const files = extract(present.map(pkg => {
    const b = Bundle.from(readFileSync(join(dir, 'packages', `${pkg}.bundle`)))
    const readmes = {}
    for (const k of Object.keys(b.files)) if (k.endsWith('/README.md')) readmes[k] = b.read(k)
    let help = null
    try { help = JSON.parse(b.read('/package.json').toString()).help ?? null } catch {}
    return { pkg, files: readmes, help }
  }))
  const readmes = Object.keys(files).filter(p => p.endsWith('README.md')).length
  const old = await repo.read('/help/index.json').then(x => JSON.parse(x.toString()), () => null)
  if (!(await repo.read('/help/layer.json').then(() => true, () => false))) {
    if (!old) await writer.createLayer('help', 'Create help', { author })
    files['/layer.json'] = Buffer.from(JSON.stringify(LAYER, null, 2) + '\n')
  }
  const c = await writer.change('help')
  let changed = false
  for (const [p, bytes] of Object.entries(files)) {
    const was = await repo.read(`/help${p}`).catch(() => null)
    if (!was || !was.equals(bytes)) { await c.put(p, bytes); changed = true }
  }
  for (const u of Object.keys(old ?? {})) {
    const p = u === '/' ? '/README.md' : `${u}/README.md`
    if (!files[p]) { await c.remove(p); changed = true }
  }
  if (changed) await c.commit(`Help extracted: ${Object.keys(listed).join(', ')}`, { author })
  return { readmes, changed }
}

// runtime help <uri>: the README documenting it, at its level; each link with its
// one-liner (the next level, to choose from). The uri as the mrepo knows it
// (/packages/haiccing/base-package-boot/test/boot), or under /help.
export async function help (exec, { uri, body }) {
  const u = uri.replace(/^\/help(?=\/|$)/, '') || '/'
  const index = JSON.parse((await exec.read('/help/index.json').catch(() => { throw new Error('no help in this mrepo (its help layer)') })).toString())
  const known = index[u]
  if (!known) {
    const near = Object.keys(index).filter(k => u.startsWith(k === '/' ? '/' : k + '/')).sort((a, b) => b.length - a.length)[0] ?? '/'
    throw new Error(`no help at ${u}: nearest ${near}`)
  }
  const r = parse((await exec.read(u === '/' ? '/help/README.md' : `/help${u}/README.md`)).toString())
  const level = body?.level ?? 'summary'
  const links = known.links.map(l => ({ uri: l, oneliner: index[l].oneliner }))
  const out = { uri: u, title: r.title, oneliner: r.oneliner, links }
  if (body?.section) {
    const s = r.sections.find(x => x.title.toLowerCase() === String(body.section).toLowerCase())
    if (!s) throw new Error(`no section "${body.section}" at ${u} (${r.sections.map(x => x.title).join(', ')})`)
    return { ...out, section: s }
  }
  if (level === 'oneliner') return out
  if (level === 'detail') return { ...out, summary: r.summary, sections: r.sections }
  return { ...out, summary: r.summary, sections: r.sections.map(s => s.title) }
}

