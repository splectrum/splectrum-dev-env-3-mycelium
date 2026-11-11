// bareOf(work): the Bare a work folder's mrepos run on (README.md beside it).
import { readFileSync } from 'bare-fs'
import { join } from 'bare-path'

export const placed = work => join(work, 'bare', 'bin', 'bare')
export const recordOf = work => { try { return JSON.parse(readFileSync(join(work, 'bare.json'), 'utf8')) } catch { return null } }
export const bareOf = work => recordOf(work)?.bare ?? placed(work)
