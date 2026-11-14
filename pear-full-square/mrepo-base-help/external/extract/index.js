// extract: help/extract, the mrepo's help layer from the READMEs of its
// linked packages: what is there replaced (README.md beside it). An internal
// request: the runtime places it as it starts, before the mrepo takes
// requests in.
import { readFileSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import Bundle from 'bare-bundle'
import { extract } from '../../internal/extract/index.js'

const LAYER = { mode: 'atomic', description: 'Help: the READMEs of the packages the mrepo links, at the URIs they document, and their index (extracted as the mrepo starts).' }
const json = async (exec, uri) => exec.read(uri).then(b => JSON.parse(b.toString()), () => null)

export async function extractAction (exec, { uri }) {
  if (uri !== '.' && uri !== 'main') throw new Error(`help extract: the whole mrepo only, . (not ${uri})`)
  const listed = (await json(exec, '/packages/manifest.json'))?.packages
  if (!listed) return { readmes: 0, changed: false, problems: 0 }
  const dir = exec.runtime.dir
  const present = Object.keys(listed).filter(pkg => existsSync(join(dir, 'packages', `${pkg}.bundle`)))
  const files = extract(present.map(pkg => {
    const b = Bundle.from(readFileSync(join(dir, 'packages', `${pkg}.bundle`)))
    const readmes = {}
    for (const k of Object.keys(b.files)) if (k.endsWith('/README.md')) readmes[k] = b.read(k)
    let help = null
    try { help = JSON.parse(b.read('/package.json').toString()).help ?? null } catch {}
    return { pkg, files: readmes, help, paths: Object.keys(b.files) }
  }))
  if (!(await exec.read('/help/layer.json').then(() => true, () => false))) files['/layer.json'] = Buffer.from(JSON.stringify(LAYER, null, 2) + '\n')
  const old = await json(exec, '/help/index.json')
  let changed = false
  for (const [p, bytes] of Object.entries(files)) {
    const was = await exec.read(`/help${p}`).catch(() => null)
    if (!was || !Buffer.from(was).equals(bytes)) { exec.put(`/help${p}`, bytes); changed = true }
  }
  for (const u of Object.keys(old ?? {})) {
    const p = u === '/' ? '/README.md' : `${u}/README.md`
    if (!files[p]) { exec.remove(`/help${p}`); changed = true }
  }
  const problems = JSON.parse(files['/problems.json'].toString()).length
  exec.log?.(problems ? 'warn' : 'info', 'help extracted', { readmes: Object.keys(files).filter(p => p.endsWith('README.md')).length, changed, problems })
  return { readmes: Object.keys(files).filter(p => p.endsWith('README.md')).length, changed, problems }
}
