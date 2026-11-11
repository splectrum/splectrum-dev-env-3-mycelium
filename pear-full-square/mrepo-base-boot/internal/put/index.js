// put(from, to): a file into place, hard linked, else copied (README.md beside it).
import { mkdirSync, rmSync, linkSync, copyFileSync } from 'bare-fs'
import { dirname } from 'bare-path'

export function put (from, to) {
  mkdirSync(dirname(to), { recursive: true })
  rmSync(to, { force: true })
  try { linkSync(from, to) } catch { copyFileSync(from, to) }
}
