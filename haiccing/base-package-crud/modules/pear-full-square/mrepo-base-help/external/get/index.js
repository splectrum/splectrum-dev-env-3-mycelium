// get: help/get . <subject> <level>, an mrepo's help retrieved by URI
// (README.md beside it).
import { relative, slashed, unslashed } from 'mycelium-uri'
import { parse } from '../../internal/extract/index.js'

// The README documenting the subject, at its level; each link with its
// one-liner (the next level, to choose from). The subject: the first
// argument, a URI from the mrepo's root, as the mrepo knows it
// (packages/haiccing/base-package-boot/test/boot), or under help; none, or
// a level first: the mrepo itself. What it is about is an argument, not
// the request's URI: that is where the request is executed.
const LEVELS = ['oneliner', 'summary', 'detail']

export async function get (exec, { args = [] }) {
  const about = args.length && !LEVELS.includes(args[0])
  const rest = about ? args.slice(1) : args
  // (the help layer's index is keyed by slash-led paths)
  const u = slashed(relative(about ? args[0] : '.')).replace(/^\/help(?=\/|$)/, '') || '/'
  const said = unslashed(u)
  const index = JSON.parse((await exec.read('/help/index.json').catch(() => { throw new Error('no help extracted in this mrepo yet (help/extract)') })).toString())
  const known = index[u]
  if (!known) {
    const near = Object.keys(index).filter(k => u.startsWith(k === '/' ? '/' : k + '/')).sort((a, b) => b.length - a.length)[0] ?? '/'
    throw new Error(`no help at ${said}: nearest ${unslashed(near)}`)
  }
  const r = parse((await exec.read(u === '/' ? '/help/README.md' : `/help${u}/README.md`)).toString())
  // after the subject: a level, or a section's title (the words of it)
  const level = LEVELS.includes(rest[0]) ? rest[0] : 'summary'
  const section = rest.length && !LEVELS.includes(rest[0]) ? rest.join(' ') : null
  const links = known.links.map(l => ({ uri: unslashed(l), oneliner: index[l].oneliner }))
  const out = { uri: said, title: r.title, oneliner: r.oneliner, links }
  if (section) {
    const s = r.sections.find(x => x.title.toLowerCase() === section.toLowerCase())
    if (!s) throw new Error(`no section "${section}" at ${said} (${r.sections.map(x => x.title).join(', ')})`)
    return { ...out, section: s }
  }
  if (level === 'oneliner') return out
  if (level === 'detail') return { ...out, summary: r.summary, sections: r.sections }
  return { ...out, summary: r.summary, sections: r.sections.map(s => s.title) }
}
