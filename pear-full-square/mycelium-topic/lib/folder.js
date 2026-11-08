// Storage in a folder on the host: the storage contract over the
// filesystem. Paths are '/'-separated, relative to the root.
//   list(path)         names in a directory ([] if absent), sorted
//   read(path)         bytes, or null if absent
//   write(path, bytes) written whole: to a temporary name, then renamed
//   remove(path)       a file or a directory, recursively
//   isDirectory(path)

import fs from 'bare-fs'
import { join, dirname } from 'bare-path'
import process from 'bare-process'

export function folderStorage (root) {
  const at = p => join(root, ...p.split('/').filter(Boolean))
  return {
    async list (path) {
      try { return (await fs.promises.readdir(at(path))).filter(n => !n.startsWith('.')).sort() } catch (err) { if (err.code === 'ENOENT') return []; throw err }
    },
    async read (path) {
      try { return await fs.promises.readFile(at(path)) } catch (err) { if (err.code === 'ENOENT') return null; throw err }
    },
    async write (path, bytes) {
      const file = at(path)
      await fs.promises.mkdir(dirname(file), { recursive: true })
      const tmp = join(dirname(file), `.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`)
      await fs.promises.writeFile(tmp, bytes)
      await fs.promises.rename(tmp, file)
    },
    async remove (path) {
      await fs.promises.rm(at(path), { recursive: true, force: true })
    },
    async isDirectory (path) {
      try { return (await fs.promises.stat(at(path))).isDirectory() } catch { return false }
    }
  }
}
