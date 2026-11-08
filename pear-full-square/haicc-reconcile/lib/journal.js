// A journal: records appended to a file, one JSON line each, in order;
// read back whole. What HAICC keeps of what happened, on its host, in
// plain files (into topics later, by a separate process, not by HAICC).
//   const j = journal(file)
//   j.append(value)    j.read() → [{ value }]
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'bare-fs'
import { dirname } from 'bare-path'

export function journal (file) {
  return {
    file,
    append (value) {
      mkdirSync(dirname(file), { recursive: true })
      appendFileSync(file, JSON.stringify(value) + '\n')
    },
    read () {
      if (!existsSync(file)) return []
      return readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => ({ value: JSON.parse(l) }))
    }
  }
}
