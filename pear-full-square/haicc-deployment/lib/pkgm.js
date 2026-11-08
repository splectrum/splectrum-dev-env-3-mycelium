// The package manager, from beside HAICC: the platform is a pair of packages
// (base-package-haicc, base-package-pkgm), and HAICC uses the package manager
// from beside it (docs/design/platform.md): the package next to this one (in
// a level's packages/, in haiccing/, in a staged write), or, in the
// development repository, the module next to this one.
//   const { verify, testPackage } = await pkgm()
import { existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath, pathToFileURL } from 'bare-url'

const mod = join(dirname(fileURLToPath(import.meta.url)), '..')
const places = [
  join(mod, '..', '..', '..', '..', 'base-package-pkgm', 'modules', 'pear-full-square', 'pkgm-base-manager', 'index.js'),
  join(mod, '..', 'pkgm-base-manager', 'index.js')
]
export const pkgmPath = () => places.find(p => existsSync(p)) || null
export async function pkgm () {
  const p = pkgmPath()
  if (!p) throw new Error('the package manager is not beside HAICC (base-package-pkgm): the platform is a pair')
  return import(pathToFileURL(p).href)
}
