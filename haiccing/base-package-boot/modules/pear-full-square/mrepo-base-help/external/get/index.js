// get: help get <uri>, an mrepo's help retrieved by URI (README.md beside it).
import { parse } from '../../internal/extract/index.js'

// help get <uri>: the README documenting it, at its level; each link with its
// one-liner (the next level, to choose from). The uri as the mrepo knows it
// (/packages/haiccing/base-package-boot/test/boot), or under /help.
export async function get (exec, { uri, body }) {
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
