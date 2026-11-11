// check(list, ctx): an mrepo's prerequisites checked, a fix only with a yes (README.md beside it).
import { existsSync, readFileSync, writeFileSync, mkdirSync, accessSync, rmSync, renameSync, chmodSync, constants } from 'bare-fs'
import { join, dirname, resolve } from 'bare-path'
import os from 'bare-os'
import crypto from 'bare-crypto'
import zlib from 'bare-zlib'
import https from 'bare-https'
import { spawnSync } from 'bare-subprocess'
import { inContainer } from '../in-container/index.js'
import { acceptable } from '../acceptable/index.js'
import { placed, recordOf } from '../bare-of/index.js'


const WHEN = { 'not-in-container': () => !inContainer() }


const get = (host, path) => new Promise((resolve, reject) => {
  const req = https.request({ host, path, method: 'GET' }, res => {
    const chunks = []
    res.on('data', c => chunks.push(c))
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }))
    res.on('error', reject)
  })
  req.on('error', reject)
  req.end()
})

const run = (cmd, args) => { try { return spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }) } catch { return { status: -1, stdout: Buffer.alloc(0) } } }

// Bare's tarball, as npm publishes it: its name, and its sha512 checked.
export const BARE_ORG = 'holepunchto'
export const TARBALL = v => `bare-runtime-${os.platform()}-${os.arch()}-${v}.tgz`
const sha512 = bytes => crypto.createHash('sha512').update(bytes).digest('base64')
const sriOk = (bytes, integrity) => integrity === `sha512-${sha512(bytes)}`

// A tarball's files (ustar, as npm packs): [{ name, mode, data }].
function untar (buf) {
  const out = []
  for (let o = 0; o + 512 <= buf.length;) {
    const h = buf.subarray(o, o + 512)
    if (h.every(b => b === 0)) break
    const str = (a, n) => h.subarray(a, a + n).toString().replace(/\0.*$/s, '')
    const size = parseInt(str(124, 12).trim() || '0', 8)
    const name = (str(345, 155) ? str(345, 155) + '/' : '') + str(0, 100)
    const type = str(156, 1) || '0'
    if (type === '0') out.push({ name, mode: parseInt(str(100, 8).trim() || '644', 8), data: buf.subarray(o + 512, o + 512 + size) })
    o += 512 + Math.ceil(size / 512) * 512
  }
  return out
}
const gunzip = bytes => new Promise((resolve, reject) => zlib.gunzip(bytes, (err, out) => err ? reject(err) : resolve(out)))

// Bare's tarball from the sources, in order: the first that has it.
async function fetchBare (sources, version) {
  for (const s of sources) {
    if (s.kind === 'folder') {
      const f = join(s.path, BARE_ORG, TARBALL(version))
      if (existsSync(f)) return { from: f, bytes: readFileSync(f) }
    } else {
      const name = `bare-runtime-${os.platform()}-${os.arch()}`
      try {
        const r = await get('registry.npmjs.org', `/${name}/-/${TARBALL(version)}`)
        if (r.status === 200) return { from: `https://registry.npmjs.org/${name}/-/${TARBALL(version)}`, bytes: r.body }
      } catch {}
    }
  }
  return null
}

const remember = (work, r) => { mkdirSync(work, { recursive: true }); writeFileSync(join(work, 'bare.json'), JSON.stringify(r, null, 2) + '\n'); return r }
const versionOf = b => {
  const r = run(b, ['--version'])
  return r.status === 0 ? r.stdout.toString().trim().replace(/^v/, '') : null
}
// The binary itself: npm's `bare` is a Node.js script that spawns it and
// stays its parent, so asked, the Bare it runs is recorded (else as found).
const binaryOf = b => {
  const r = run(b, ['-e', 'console.log(Bare.argv[0])'])
  const real = r.status === 0 ? r.stdout.toString().trim() : ''
  return real.startsWith('/') && existsSync(real) ? real : b
}
// The first `bare` on the PATH at an acceptable version.
function installed (path, want) {
  for (const dir of String(path ?? '').split(':').filter(Boolean)) {
    const b = join(dir, 'bare')
    if (!existsSync(b)) continue
    const version = versionOf(b)
    if (version && acceptable(version, want)) return { bare: binaryOf(b), version }
  }
  return null
}

async function putBare ({ work, sources, bare }) {
  const got = await fetchBare(sources, bare.version)
  if (!got) return { ok: false, missing: `Bare ${bare.version}: not in the sources (${TARBALL(bare.version)})` }
  if (!sriOk(got.bytes, bare.integrity)) return { ok: false, missing: `Bare ${bare.version}: not as pinned (sha512), from ${got.from}` }
  const dir = join(work, 'bare')
  const tmp = `${dir}.new`
  rmSync(tmp, { recursive: true, force: true })
  for (const f of untar(await gunzip(got.bytes))) {
    const p = join(tmp, f.name.replace(/^package\//, ''))
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, f.data)
    chmodSync(p, f.mode & 0o777)
  }
  // npm publishes it without its exec bit
  chmodSync(join(tmp, 'bin', 'bare'), 0o755)
  writeFileSync(join(tmp, 'tarball.sha512'), bare.integrity + '\n')
  rmSync(dir, { recursive: true, force: true })
  renameSync(tmp, dir)
  remember(work, { bare: placed(work), version: bare.version, installed: false })
  return { ok: true, value: { bare: placed(work), version: bare.version, from: got.from } }
}

const CHECKS = {
  platform ({ platforms = ['linux-x64'] }) {
    const p = `${os.platform()}-${os.arch()}`
    return platforms.includes(p) ? { ok: true, value: p } : { ok: false, missing: `a platform of ${platforms.join(', ')} (this is ${p})` }
  },
  work (_, { work, name }) {
    if (resolve(work) === resolve('/')) return { ok: false, missing: 'a work folder other than the filesystem\'s root' }
    try { mkdirSync(work, { recursive: true }); accessSync(work, constants.W_OK) } catch { return { ok: false, missing: `a writable work folder: ${work}` } }
    const f = join(work, 'mrepo.json')
    if (existsSync(f)) {
      const there = JSON.parse(readFileSync(f, 'utf8')).name
      if (there !== name) return { ok: false, missing: `a work folder without another mrepo (${there} is there): ${work}` }
    }
    return { ok: true, value: work }
  },
  async sources (_, { sources }) {
    for (const s of sources) {
      if (s.kind === 'folder' && !existsSync(s.path)) return { ok: false, missing: `the source folder: ${s.path}` }
      if (s.kind === 'github') {
        try { await get('github.com', `/${s.org}`) } catch (err) { return { ok: false, missing: `the source github:${s.org} reachable (${err.message})` } }
      }
    }
    return { ok: true, value: sources.map(s => s.kind === 'folder' ? `folder:${s.path}` : `github:${s.org}`) }
  },
  bare (_, { work, bare, path }) {
    // 1. the one recorded, if it is an installed one still there at an acceptable version
    const rec = recordOf(work)
    if (rec?.installed && existsSync(rec.bare)) {
      const version = versionOf(rec.bare)
      if (version && acceptable(version, bare.version)) return { ok: true, value: { bare: rec.bare, version, installed: true } }
    }
    // 2. the pinned one, put in place here before
    const b = placed(work)
    const pinned = join(work, 'bare', 'tarball.sha512')
    if (existsSync(b) && existsSync(pinned) && readFileSync(pinned, 'utf8').trim() === bare.integrity) {
      if (rec?.bare !== b) remember(work, { bare: b, version: bare.version, installed: false })
      return { ok: true, value: { bare: b, version: bare.version } }
    }
    // 3. one installed on the machine (searched only when given a PATH)
    const found = installed(path, bare.version)
    if (found) return { ok: true, value: remember(work, { ...found, installed: true }) }
    return { ok: false, missing: `Bare ${bare.version} (or a newer ${bare.version.split('.')[0]}.x installed) at ${b}`, fix: 'put Bare in place' }
  },
  docker () {
    const info = run('docker', ['info', '--format', '{{json .}}'])
    if (info.status === -1) return { ok: false, missing: 'Docker Engine installed' }
    if (info.status !== 0) {
      const why = info.stderr?.toString() ?? ''
      return { ok: false, missing: /permission denied/i.test(why) ? 'the user in the docker group' : 'Docker Engine running' }
    }
    let d = {}
    try { d = JSON.parse(info.stdout.toString()) } catch {}
    if ((d.SecurityOptions || []).some(o => /rootless/.test(o))) return { ok: false, missing: 'Docker Engine rootful (it is rootless)' }
    if (/Docker Desktop/i.test(d.OperatingSystem || '')) return { ok: false, missing: 'Docker Engine native (it is Docker Desktop)' }
    return { ok: true, value: { server: d.ServerVersion ?? null } }
  }
}
const FIXES = { bare: putBare }

export async function check (list, ctx) {
  const results = []
  for (const p of list) {
    const r = { check: p.check }
    if (p.when && !WHEN[p.when]?.()) { results.push({ ...r, ok: true, skipped: p.when }); continue }
    const fn = CHECKS[p.check]
    if (!fn) { results.push({ ...r, ok: false, missing: `no such check: ${p.check}` }); return { ok: false, results } }
    let out = await fn(p, ctx)
    if (!out.ok && p.fix && FIXES[p.check]) {
      const yes = ctx.yes || (ctx.ask ? await ctx.ask(`${out.missing}: ${out.fix}?`) : false)
      if (yes) out = { ...(await FIXES[p.check](ctx)), fixed: true }
    }
    delete out.fix
    results.push({ ...r, ...out })
    if (!out.ok) return { ok: false, results }
  }
  return { ok: true, results }
}
