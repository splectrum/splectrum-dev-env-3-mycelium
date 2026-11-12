// mrepo: the integrity of a package's mrepo side: its structure, its
// protocols, what it carries (README.md beside it). Each -> [{ check, detail }].
import { readFileSync, readdirSync, statSync, lstatSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { pathToFileURL } from 'bare-url'

const MODES = ['atomic', 'replicated', 'non-atomic']
const json = f => JSON.parse(readFileSync(f, 'utf8'))

// The leaves of a structure: each folder holding a layer.json, by its path.
export function leaves (root, rel = '') {
  const dir = join(root, rel)
  if (existsSync(join(dir, 'layer.json'))) return [rel]
  return readdirSync(dir).sort().filter(n => statSync(join(dir, n)).isDirectory()).flatMap(n => leaves(root, rel ? `${rel}/${n}` : n))
}

// The files a structure contributes to layers it does not define itself
// (another package's: runtime/service.json into the runtime layer), by path.
export function contributions (root, ls = leaves(root), rel = '') {
  return readdirSync(join(root, rel)).sort().flatMap(n => {
    const p = rel ? `${rel}/${n}` : n
    if (statSync(join(root, p)).isDirectory()) return ls.includes(p) ? [] : contributions(root, ls, p)
    return n === 'README.md' || !rel ? [] : [p]
  })
}

// Its mrepo/ part: every leaf's layer.json valid; no file at its top but a
// README, no README inside a layer; a file in a folder it gives no
// layer.json a contribution to a layer another package defines, valid JSON
// where it is JSON; its preloaded requests records; its packages by name.
export function checkStructure (pkg) {
  const root = join(pkg, 'mrepo')
  const out = []
  const at = (detail) => out.push({ check: 'structure', detail })
  if (!existsSync(root)) return out
  const ls = leaves(root)
  for (const n of readdirSync(root).sort()) if (!statSync(join(root, n)).isDirectory() && n !== 'README.md') at(`mrepo/${n}: a file outside a layer`)
  for (const c of contributions(root, ls)) if (c.endsWith('.json')) { try { json(join(root, c)) } catch (err) { at(`mrepo/${c}: ${err.message}`) } }
  for (const l of ls) {
    let cfg = null
    try { cfg = json(join(root, l, 'layer.json')) } catch (err) { at(`mrepo/${l}/layer.json: ${err.message}`); continue }
    if (!MODES.includes(cfg.mode)) at(`mrepo/${l}/layer.json: mode ${cfg.mode} (one of ${MODES.join(', ')})`)
    if (!cfg.description) at(`mrepo/${l}/layer.json: no description`)
    const files = (function all (rel) { return readdirSync(join(root, l, rel)).sort().flatMap(n => statSync(join(root, l, rel, n)).isDirectory() ? all(join(rel, n)) : [rel ? `${rel}/${n}` : n]) })('')
    for (const f of files) {
      if (f.endsWith('README.md')) at(`mrepo/${l}/${f}: a README inside a layer (it would be committed into it)`)
      if (!f.endsWith('.json')) continue
      try { json(join(root, l, f)) } catch (err) { at(`mrepo/${l}/${f}: ${err.message}`) }
    }
    if (l === 'packages' && !(Array.isArray(cfg.packages) && cfg.packages.every(p => /^[a-z0-9-]+\/[a-z0-9-]+$/.test(p)))) at('mrepo/packages/layer.json: packages, a list of <org>/<package>')
    if (l.startsWith('request/pending/')) {
      for (const f of files.filter(f => f !== 'layer.json' && f.endsWith('.json'))) {
        let r = null
        try { r = json(join(root, l, f)) } catch { continue }
        const form = r?.value?.value
        if (r.topic !== `/${l}`) at(`mrepo/${l}/${f}: its envelope's topic ${r.topic} (/${l})`)
        if (`${r.key}.json` !== f || r.value?.key !== r.key) at(`mrepo/${l}/${f}: its key (the file's name, the core's)`)
        if (!form?.protocol || !form?.action || !form?.uri) at(`mrepo/${l}/${f}: its form (protocol, action, uri)`)
      }
    }
  }
  return out
}

// Its protocol.js: each protocol's config with its package and description;
// every action configured has its function, every function its config.
export async function checkProtocol (pkg) {
  const file = join(pkg, 'protocol.js')
  const out = []
  const at = (detail) => out.push({ check: 'protocol', detail })
  if (!existsSync(file)) return out
  let m = null
  try { m = await import(pathToFileURL(file).href) } catch (err) { at(`protocol.js: ${err.message}`); return out }
  const { protocols = {}, actions = {} } = m
  for (const [p, cfg] of Object.entries(protocols)) {
    if (!cfg.package) at(`${p}: no package`)
    if (!cfg.description) at(`${p}: no description`)
    for (const [a, c] of Object.entries(cfg.actions || {})) {
      if (typeof actions[p]?.[a] !== 'function') at(`${p} ${a}: configured, no function`)
      if (!c.description) at(`${p} ${a}: no description`)
      if (!Array.isArray(c.uris) || !c.uris.length) at(`${p} ${a}: no uris`)
    }
  }
  for (const [p, fns] of Object.entries(actions)) for (const a of Object.keys(fns)) if (!protocols[p]?.actions?.[a]) at(`${p} ${a}: a function, not configured`)
  return out
}

// What it carries: its package.json's main there; no third-party module
// carried that its record does not name, each at its recorded version; an
// omitted one, where present, its stub. (A bundle holds only the code that
// is reached: less than the record, never more.)
export function checkCarried (pkg) {
  const out = []
  const at = (detail) => out.push({ check: 'carried', detail })
  const pj = json(join(pkg, 'package.json'))
  if (!pj.name) at('package.json: no name')
  if (pj.main && !existsSync(join(pkg, pj.main))) at(`package.json: main ${pj.main} not there`)
  const rec = join(pkg, 'modules', 'third-party.json')
  const nm = join(pkg, 'modules', 'node_modules')
  if (!existsSync(rec) || !existsSync(nm)) return out
  const { modules = [], omitted = [] } = json(rec)
  const recorded = new Map(modules.map(m => [m.name, m.version]))
  const names = readdirSync(nm).sort().flatMap(n => n.startsWith('@') ? readdirSync(join(nm, n)).sort().map(x => `${n}/${x}`) : [n])
  for (const name of names) {
    const dir = join(nm, name)
    if (name.startsWith('.') || lstatSync(dir).isSymbolicLink()) continue // a link to one of ours
    const f = join(dir, 'package.json')
    if (!existsSync(f)) continue // code without its package.json: a bundle's
    const version = json(f).version
    if (omitted.includes(name)) { if (version !== '0.0.0-omitted') at(`${name}: omitted, yet carried (${version})`); continue }
    if (!recorded.has(name)) at(`${name}: carried, not recorded`)
    else if (recorded.get(name) !== version) at(`${name}: ${version} carried, ${recorded.get(name)} recorded`)
  }
  return out
}
