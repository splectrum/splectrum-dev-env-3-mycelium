// mrepo-base-runtime: a running mycelium repository's runtime (the
// framework: the process that runs its protocols, docs/design/repositories.md,
// "A running repository"; structure.md, "One writer per store"), as a library
// (runtime.js is its command line, base-package-mrepo's entry).
//   run({ work })           the runtime, in this process: its repository
//                           opened by the setting beside it (<work>/mrepo.json,
//                           mrepo-base-request's `setting`): on native git
//                           (`git`: <work>/mrepos/<name>/.git, mycelium-git's
//                           native backend), on p2p-git with every layer on
//                           the filesystem (`filesystem`: the same folder, no Corestore; the
//                           boot mrepo), or on the p2p layer (`p2p`, the
//                           default: the store, <work>/store, held as its
//                           single writer, the host's repository `host` over
//                           it and its disk side); the local
//                           connection served (<work>/runtime.sock, owner
//                           only: one JSON request a line, one JSON answer a
//                           line: { op: 'status' }, { op: 'stop' }); one
//                           poller firing the protocols in turn, over their
//                           data states: on the p2p host the inbox folder's
//                           new files committed (the folder the inbox layer's
//                           working tree), the request
//                           protocol (mrepo-base-request), the execute
//                           protocol (mrepo-base-execute), each given the
//                           context (read access, the writer); a pass that
//                           fails: its error in the request executing
//                           (stderr when none is, or that fails too); stops
//                           on `stop`, SIGTERM or SIGINT, closing the store,
//                           and by itself once the service is shut down
//                           (booted, nothing waiting). Resolves when it has
//                           stopped.
//   start({ work, bare })   the runtime started as its own process, through
//                           the shell (it outlives the caller), from the
//                           deployed bundle; resolves its first status, or
//                           null if it did not answer.
//   ask({ work, op })       one request over the local connection; its
//                           answer, or null if nothing answers.
//   viewOf(work, name)      a repository's folder, <work>/mrepos/<name>
import process from 'bare-process'
import Pipe from 'bare-pipe'
import { spawnSync } from 'bare-subprocess'
import fs, { existsSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { openRepo, writer } from 'mycelium-git'
import { nativeBackend, p2pgitBackend } from 'mycelium-git'
import { INBOX, OUTBOX, inboxFolder, post, viewOf, gitdirOf, setting, request, runtimeData, layer, untaken, PENDING, EXECUTE } from 'mrepo-base-request'
import { execute, failed } from 'mrepo-base-execute'
import pkg from './package.json' with { type: 'json' }

export { INBOX, OUTBOX, inboxFolder, viewOf, gitdirOf, setting }

export const version = { name: pkg.name, version: pkg.version }
export const HOST = 'host'
export const SOCKET = 'runtime.sock'
export const bundleOf = work => join(viewOf(work, setting(work).name), 'packages', 'haiccing', 'base-package-mrepo.bundle')

// The repository, opened by its setting: { name, id, key, backend, close }.
export async function open (work) {
  const { storage, name } = setting(work)
  if (storage === 'git') {
    const backend = nativeBackend(gitdirOf(work, name))
    return { name, id: null, key: null, storage, backend, close: async () => {} }
  }
  if (storage === 'filesystem') {
    const backend = p2pgitBackend(gitdirOf(work, name), { fs })
    return { name, id: null, key: null, storage, backend, close: async () => {} }
  }
  const store = await openStore({ storage: join(work, 'store') })
  const repo = await mrepos({ store, local: join(work, 'mrepos') }).open(name)
  return { name: repo.name, id: repo.id, key: repo.key, storage, backend: repo.backend, close: () => store.close() }
}

const socketOf = work => join(work, SOCKET)

export async function run ({ work, every = 200 }) {
  const repo = await open(work)
  const started = new Date().toISOString()
  // No log of its own: what happens to a request is in its document and the
  // commits that moved it (docs/design/repositories.md, "No log").
  const ctx = { work, name: repo.name, backend: repo.backend, repo: openRepo(repo.backend), writer: writer(repo.backend), seen: {} }
  const status = () => ({ ok: true, pid: process.pid, started, repository: { name: repo.name, storage: repo.storage, id: repo.id, key: repo.key }, version })
  let stopping = null
  let stopped = false
  let server = null
  const stop = why => (stopping ??= (async () => {
    // No new connections; open ones end with the process (not waited on:
    // the one that asked to stop may still be open).
    if (server) server.close()
    clearInterval(poller)
    while (busy) await new Promise(resolve => setTimeout(resolve, 20))
    await repo.close()
    // The socket last (the store's lock itself is released as the process ends).
    rmSync(socketOf(work), { force: true })
    stopped = true
  })())
  rmSync(socketOf(work), { force: true }) // a socket left by a runtime that ended without stopping: the store's lock says none runs now
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
  // The poller: the protocols fired in turn, one pass each, never two at once.
  let busy = false
  const poller = setInterval(async () => {
    if (stopping || busy) return
    busy = true
    try {
      if (repo.storage !== 'git') await post(ctx)
      await request(ctx)
      await execute(ctx)
      await request(ctx)
        // Booted (shut down, or never initialised) and nothing waiting: the
      // runtime ends; a request posted later starts it again.
      const { service } = await runtimeData(ctx)
      // (the inbox folder's new files were committed above: untaken counts them)
      const waiting = (await untaken(ctx)).length + (await layer(ctx, PENDING).list()).length + (await layer(ctx, EXECUTE).list()).length
      if (service?.state === 'booted' && !waiting) setTimeout(() => stop('shut down'), 0)
    } catch (err) {
      // The error in the request executing; none, or that failing too: stderr.
      const why = `runtime: ${err.message}`
      try { if (!(await failed(ctx, why)).length) console.error(`mrepo: ${why}`) } catch (e) { console.error(`mrepo: ${why}; not recorded: ${e.message}`) }
    } finally { busy = false }
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

export async function start ({ work, bare = process.execPath, bundle = bundleOf(work), wait = 10000 }) {
  const already = await ask({ work, op: 'status' })
  if (already) return already
  // Started by the shell, in the background (its own session where setsid is
  // there), the shell ending at once: the runtime is not this process's
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

