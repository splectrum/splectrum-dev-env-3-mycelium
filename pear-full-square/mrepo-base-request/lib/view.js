// A repository's folder (docs/design/structure.md): <work>/mrepos/<name>/,
// its non-atomic layers' files and its replicated layers' copies, each at the
// path of its URI (/inbox at <work>/mrepos/host/inbox).
import { join } from 'bare-path'

export const MREPOS = 'mrepos'
export const viewOf = (work, name) => join(work, MREPOS, name)
