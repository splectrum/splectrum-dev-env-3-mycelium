// extract: an mrepo's help layer from its packages' READMEs, the files to
// write (README.md beside it; the action, external/extract, writes them).
// Also parse (a README's levels) and check (the README rules).
import { posix } from 'bare-path'

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
  // headings outside code blocks only
  let code = false
  const heading = body.map(l => { if (l.startsWith('```')) code = !code; return !code && l.startsWith('## ') })
  const first = heading.indexOf(true)
  const summary = (first === -1 ? body : body.slice(0, first)).join('\n').trim()
  const sections = []
  if (first !== -1) {
    let cur = null
    body.slice(first).forEach((l, i) => {
      if (heading[first + i]) { cur = { title: l.slice(3).trim(), lines: [] }; sections.push(cur) } else cur.lines.push(l)
    })
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

// The rules on one README's text (haiccing/package-docs-template,
// "READMEs"): [[check, detail]...]. Mechanical: shape, length, references.
export function check (text) {
  const r = parse(text)
  const out = []
  if (!r.oneliner) out.push(['oneliner', 'none'])
  else {
    if (r.oneliner.length > 120) out.push(['oneliner', `${r.oneliner.length} characters`])
    if (/[()]/.test(r.oneliner)) out.push(['oneliner', 'parentheses'])
    if (!/[.]$/.test(r.oneliner)) out.push(['oneliner', `not one sentence: "${r.oneliner.slice(0, 60)}"`])
  }
  // the summary's words, its links table not counted
  const words = r.summary.split('\n').filter(l => !l.trim().startsWith('|')).join(' ').split(/\s+/).filter(Boolean).length
  if (words > 100) out.push(['summary', `${words} words`])
  for (const s of r.sections) if (!/^`?[\w.-]+`?$/.test(s.title) && (s.title.split(/\s+/).length > 3 || /[:;,.()`]/.test(s.title))) out.push(['sections', s.title]) // a file's name is one
  const transient = text.match(/(?<![\w/-])(docs\/(design|guides|rules|readme)|steps\/\d)[\w./-]*/gi) ?? []
  if (transient.length) out.push(['transient', [...new Set(transient)].join(', ')])
  return out
}

// The rules on the whole tree, as extracted: each README checked, each
// relative link resolving to something in its bundle (paths: the bundle's
// files, when given), each folder below linked (cascade), each reached
// from the root. -> [{ uri, check, detail }]
function validate (index, out, sources) {
  const problems = []
  for (const [uri, e] of Object.entries(index)) {
    const text = out[uri === '/' ? '/README.md' : `${uri}/README.md`].toString()
    for (const [c, d] of check(text)) problems.push({ uri, check: c, detail: d })
    const { path, paths } = sources[uri]
    if (paths) {
      for (const h of parse(text).links) {
        const target = posix.normalize(posix.join(posix.dirname(path), h)).replace(/\/$/, '')
        if (!paths.has(target) && ![...paths].some(f => f.startsWith(target + '/'))) problems.push({ uri, check: 'links', detail: `${h}: nothing there` })
      }
    }
    const within = u => u.startsWith(uri === '/' ? '/' : uri + '/')
    for (const below of Object.keys(index)) {
      if (below === uri || !within(below)) continue
      const between = Object.keys(index).some(m => m !== uri && m !== below && within(m) && below.startsWith(m + '/'))
      if (!between && !e.links.includes(below)) problems.push({ uri, check: 'cascade', detail: `${below} not linked` })
    }
  }
  // reached from the root; a package's own tree alone (no root): from the
  // package's README
  const starts = index['/'] ? ['/'] : Object.keys(index).filter(u => /^\/packages\/[^/]+\/[^/]+$/.test(u))
  const reached = new Set(starts)
  const queue = [...starts]
  while (queue.length) for (const l of index[queue.shift()]?.links ?? []) if (!reached.has(l)) { reached.add(l); queue.push(l) }
  for (const uri of Object.keys(index)) if (!reached.has(uri)) problems.push({ uri, check: 'reached', detail: 'not reached from /' })
  return problems
}

export function extract (packages) {
  const out = {}
  const where = {} // help folder -> { pkg, help, path }
  for (const { pkg, files, help, paths } of packages) {
    for (const path of Object.keys(files).sort()) {
      if (posix.basename(path) !== 'README.md' || path.includes('/node_modules/')) continue
      const to = placeOf(pkg, help, path)
      out[to] = files[path]
      where[folderOf(to)] = { pkg, help, path, paths: paths ? new Set(paths) : null }
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
  out['/problems.json'] = Buffer.from(JSON.stringify(validate(index, out, where), null, 2) + '\n')
  return out
}

