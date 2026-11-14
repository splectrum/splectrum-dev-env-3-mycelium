// sources(home): the sources registered, and the haicc sources command
// (README.md beside it).
import { existsSync, readFileSync, writeFileSync, renameSync, statSync } from 'bare-fs'
import { join, resolve } from 'bare-path'
import { Failure } from '../failure.js'

// The list's file, in haicc's own folder: a line a source, folder:<path>
// or github:<org>.
export const LIST = 'sources.list'
const isFolder = f => { try { return statSync(f).isDirectory() } catch { return false } }

export function sources (home) {
  const file = join(home, LIST)
  const lines = () => existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : []
  const write = l => { writeFileSync(`${file}.part`, l.map(x => `${x}\n`).join('')); renameSync(`${file}.part`, file) }
  const self = {
    // the folders first, in the order they were linked, then https, the backup
    list: () => [...lines().filter(l => l.startsWith('folder:')), ...lines().filter(l => !l.startsWith('folder:'))],
    folders: () => lines().filter(l => l.startsWith('folder:')).map(l => l.slice('folder:'.length)),
    // a file (relative to a source) in the first folder that holds it
    find: name => self.folders().map(d => join(d, name)).find(f => existsSync(f)) ?? null,
    register: entry => { if (!lines().includes(entry)) write([...lines(), entry]) },
    unregister: entry => { if (existsSync(file)) write(lines().filter(l => l !== entry)) }
  }
  return self
}

const USAGE = 'haicc sources [unlink <folder> | download [<what>...] | https | no-https]'

// haicc sources <action> <argument>...: what it prints, a line each.
export function sourcesCommand (home, args, { org, err = () => {} }) {
  const s = sources(home)
  const [action = 'list', ...rest] = args
  switch (action) {
    case 'list':
      if (rest.length) throw new Failure(USAGE, 2)
      return s.list()
    case 'unlink':
      if (rest.length !== 1) throw new Failure('haicc sources unlink <folder>', 2)
      s.unregister(`folder:${isFolder(rest[0]) ? resolve(rest[0]) : rest[0]}`)
      return s.list()
    case 'https':
      s.register(`github:${org}`)
      return s.list()
    case 'no-https':
      s.unregister(`github:${org}`)
      return s.list()
    case 'download': {
      let missed = false
      for (const what of rest.length ? rest : [org]) {
        missed = true
        // our packages are not published anywhere yet (release and sourcing:
        // signed bundles and their manifest, to come)
        if (what === org || what.startsWith(`${org}/`)) err(`haicc: ${what}: not published yet; link a sources folder (haicc sources link <folder>)`)
        else if (what === 'bare' || what === 'third-party') err(`haicc: ${what}: fetched on its own, before the app (haicc sources download bare)`)
        else err(`haicc: nothing to download for '${what}' (bare, ${org}, ${org}/<package>)`)
      }
      if (missed) throw new Failure('', 3)
      return []
    }
    default:
      throw new Failure(USAGE, 2)
  }
}
