// mycelium-repo-main: a running mycelium repository's main thread, as a
// library (main.js is its command line, base-package-mycelium's entry;
// docs/design/repositories.md, "A running repository"; structure.md, "One
// writer per store").
//   run({ work, say })      the main thread, in this process: the store
//                           (<work>/store) held as its single writer, the
//                           repository (`level`) opened, the local connection
//                           served (<work>/main.sock, owner only: one JSON
//                           request a line, one JSON answer a line:
//                           { op: 'status' }, { op: 'stop' }); the level's
//                           boxes run (lib/boxes.js: the local dispatcher,
//                           the repository taking its inbox in); stops on
//                           `stop`, SIGTERM or SIGINT, closing the store.
//                           Resolves when it has stopped.
//   start({ work, bare })   the main thread started as its own process,
//                           through the shell (it outlives the caller), from the
//                           deployed bundle; resolves its first status, or
//                           null if it did not answer.
//   ask({ work, op })       one request over the local connection; its
//                           answer, or null if nothing answers.
import process from 'bare-process'
import Pipe from 'bare-pipe'
import { spawnSync } from 'bare-subprocess'
import { existsSync, mkdirSync, rmSync, appendFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { INBOX, OUTBOX, inbox, outbox, dispatch, takeIn } from './lib/boxes.js'
import pkg from './package.json' with { type: 'json' }

export { INBOX, OUTBOX, inbox, outbox }

export const version = { name: pkg.name, version: pkg.version }
export const LEVEL = 'level'
export const SOCKET = 'main.sock'
export const BUNDLE = join('haicc', 'packages', 'haiccing', 'base-package-mycelium.bundle')

const socketOf = work => join(work, SOCKET)

export async function run ({ work, say = () => {}, every = 200 }) {
  const store = await openStore({ storage: join(work, 'store') })
  const level = await mrepos({ store }).open(LEVEL)
  const started = new Date().toISOString()
  const status = () => ({ ok: true, pid: process.pid, started, repository: { name: level.name, id: level.id, key: level.key }, version })
  let stopping = null
  let stopped = false
  let server = null
  const stop = why => (stopping ??= (async () => {
    say({ main: 'stopping', why })
    // No new connections; open ones end with the process (not waited on:
    // the one that asked to stop may still be open).
    if (server) server.close()
    clearInterval(boxes)
    await store.close()
    // The socket last (the store's lock itself is released as the process ends).
    rmSync(socketOf(work), { force: true })
    say({ main: 'stopped' })
    stopped = true
  })())
  rmSync(socketOf(work), { force: true }) // a socket left by a main thread that ended without stopping: the store's lock says none runs now
  server = Pipe.createServer(pipe => {
    let buf = ''
    pipe.on('data', chunk => {
      buf += chunk.toString()
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1)
        let req = null
        try { req = JSON.parse(line) } catch {}
        if (req?.op === 'status') pipe.write(JSON.stringify(status()) + '\n')
        else if (req?.op === 'stop') { pipe.end(JSON.stringify({ ok: true, stopping: true }) + '\n'); stop('asked') }
        else pipe.write(JSON.stringify({ ok: false, error: 'not a request (status, stop)' }) + '\n')
      }
    })
    pipe.on('error', () => {})
  })
  server.listen({ path: socketOf(work), ownerOnly: true })
  say({ main: 'running', ...status() })
  // The boxes, watched: the outbox dispatched, the inbox taken in.
  const held = new Set()
  const boxes = setInterval(() => {
    if (stopping) return
    dispatch({ work, held, say })
    takeIn({ work, say })
  }, every)
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))
  // Held open until it has stopped (the timer keeps the process alive).
  await new Promise(resolve => { const t = setInterval(() => { if (stopped) { clearInterval(t); resolve() } }, 100) })
}

export function ask ({ work, op, timeout = 5000 }) {
  return new Promise(resolve => {
    if (!existsSync(socketOf(work))) return resolve(null)
    let buf = ''
    let done = false
    const finish = v => { if (done) return; done = true; clearTimeout(t); pipe.destroy(); resolve(v) }
    const t = setTimeout(() => finish(null), timeout)
    const pipe = new Pipe(socketOf(work))
    pipe.on('data', chunk => {
      buf += chunk.toString()
      const i = buf.indexOf('\n')
      if (i >= 0) { let v = null; try { v = JSON.parse(buf.slice(0, i)) } catch {} finish(v) }
    })
    pipe.on('error', () => finish(null))
    pipe.on('close', () => finish(null))
    pipe.write(JSON.stringify({ op }) + '\n')
  })
}

export async function start ({ work, bare = process.execPath, bundle = join(work, BUNDLE), wait = 10000 }) {
  const already = await ask({ work, op: 'status' })
  if (already) return already
  mkdirSync(join(work, 'log'), { recursive: true })
  // Started by the shell, in the background (its own session where setsid is
  // there), the shell ending at once: the main thread is not this process's
  // child, so this process ending leaves it running (bare-subprocess sends
  // SIGTERM to its own children still running when it exits).
  const r = spawnSync('sh', ['-c', 'if command -v setsid >/dev/null 2>&1; then setsid "$@" </dev/null >/dev/null 2>&1 & else "$@" </dev/null >/dev/null 2>&1 & fi', 'sh', bare, bundle, 'start', `--work=${work}`], { stdio: 'ignore' })
  if (r.status !== 0) return null
  for (const end = Date.now() + wait; Date.now() < end;) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const s = await ask({ work, op: 'status', timeout: 1000 })
    if (s) return s
  }
  return null
}

// One line to the main thread's log (<work>/log/main.log): the minimal file
// log, beside the mount point.
export const logTo = work => e => {
  mkdirSync(join(work, 'log'), { recursive: true })
  appendFileSync(join(work, 'log', 'main.log'), JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n')
}
