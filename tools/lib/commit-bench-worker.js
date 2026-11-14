// A writer of tools/commit-bench.js: it waits for the common start, then
// makes its commits on its own branch, each one small document put at a
// path, and writes what it did into a file. Run as a thread (its arguments
// the thread's data) or as a process (`commit-bench-writer <json>`).
import { writeFileSync } from 'bare-fs'
import { p2pgitBackend, writer } from '../../pear-full-square/mycelium-git/index.js'

export const AUTHOR = { name: 'commit-bench', email: 'commit-bench@localhost' }
export const WRITER = 'commit-bench-writer'

// A node's document as a request writes one: about a hundred bytes.
export const doc = k => Buffer.from(JSON.stringify({ k, at: 'a small document, about a hundred bytes of it, as a node holds', pad: 'x'.repeat(40) }))

// a: { gitdir, branch, i, commits, width, start, out }
export async function work (a) {
  const w = writer(p2pgitBackend(a.gitdir))
  const result = { i: a.i, done: 0 }
  try {
    while (Date.now() < a.start) await new Promise(resolve => setTimeout(resolve, 1))
    result.began = Date.now()
    for (let k = 0; k < a.commits; k++) {
      const change = await w.change(a.branch)
      await change.put(`swarms/n${(a.i * 7919 + k * 31) % a.width}/.node.json`, doc(k))
      await change.commit(`commit ${k}`, { author: AUTHOR })
      result.done++
    }
  } catch (e) {
    result.error = String(e.message).split('\n')[0]
  }
  result.ended = Date.now()
  writeFileSync(`${a.out}/w${a.i}.json`, JSON.stringify(result))
}

if (!Bare.Thread.isMainThread) work(JSON.parse(Buffer.from(Bare.Thread.self.data).toString()))
else if (Bare.argv[2] === WRITER) work(JSON.parse(Bare.argv[3]))
