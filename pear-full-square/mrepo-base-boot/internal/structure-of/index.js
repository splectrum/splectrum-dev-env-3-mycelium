// structureOf({ store, pkg }): a package's mrepo/ part, read from its bundle (README.md beside it).
import { readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import Bundle from 'bare-bundle'

export function structureOf ({ store, pkg }) {
  const bundle = Bundle.from(readFileSync(join(store, `${pkg}.bundle`)))
  const out = {}
  for (const key of Object.keys(bundle.files)) if (key.startsWith('/mrepo/')) out[key.slice('/mrepo/'.length)] = bundle.read(key)
  return out
}
