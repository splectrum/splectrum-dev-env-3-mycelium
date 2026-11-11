// mycelium-container-document: a storage container:
// a folder of documents, one value per file, in the encoding it is given (a
// handler: { extension, encode, decode }, e.g. mycelium-value-json).
//   const box = documents(folder, json)
//   box.add(value)         a new document under a new name (time-ordered:
//                          13 digits of milliseconds, a hyphen, 8 hex; in
//                          one process, in the order added), its name
//   box.write(name, value) a document written: under a temporary name
//                          (<name>.<ext>.part), then renamed, so a reader
//                          never sees half of one; writers in parallel, each
//                          its own names
//   box.read(name)         its value
//   box.list()             its documents' names, in name order (time order
//                          for added ones); temporary files not among them
//   box.remove(name)
// The folder is made when first written. Names are the caller's: valid
// segments (mycelium-uri), validated where they come in.
import { writeFileSync, renameSync, readFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import crypto from 'bare-crypto'

// Time-ordered: in one process strictly increasing (a millisecond on when two
// fall in the same); the random part keeps parallel writers apart.
let last = 0
export const newName = () => {
  last = Math.max(Date.now(), last + 1)
  return `${String(last).padStart(13, '0')}-${crypto.randomBytes(4).toString('hex')}`
}

export function documents (folder, encoding) {
  const ext = '.' + encoding.extension
  const file = name => join(folder, name + ext)
  const box = {
    folder,
    write (name, value) {
      mkdirSync(folder, { recursive: true })
      writeFileSync(file(name) + '.part', encoding.encode(value))
      renameSync(file(name) + '.part', file(name))
      return name
    },
    add: value => box.write(newName(), value),
    read: name => encoding.decode(readFileSync(file(name))),
    list: () => existsSync(folder) ? readdirSync(folder).filter(n => n.endsWith(ext)).map(n => n.slice(0, -ext.length)).sort() : [],
    remove: name => rmSync(file(name), { force: true })
  }
  return box
}
