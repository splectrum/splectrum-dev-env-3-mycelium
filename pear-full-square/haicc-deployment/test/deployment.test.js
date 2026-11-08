import test from 'brittle'
import { chmodSync, rmSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { spawnSync } from 'bare-subprocess'
import { fileURLToPath } from 'bare-url'
import { openDeployment } from '../index.js'
import { pkgm } from '../lib/pkgm.js'

const { packageHash } = await pkgm()
import process from 'bare-process'

// A project of folders: one configuration, one "running" (a stand-in for a
// server), so the lifecycle can be followed without a swarm.
test('the lifecycle: deploy, start, stop, teardown, reconcile; the desired state as a fold', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'haicc-dep-'))
  writeFileSync(join(dir, 'project.json'), JSON.stringify({
    owner: 'demo-test',
    configuration: [{ name: 'config', kind: 'folder', want: { path: '{work}/config' } }],
    running: [{ name: 'server', kind: 'folder', want: { path: '{work}/running' }, needs: ['config'] }]
  }))
  const work = join(dir, 'work')
  const d = await openDeployment({ project: join(dir, 'project.json'), work })
  t.alike((await d.status()).desired.last, null)

  await d.deploy()
  t.ok(existsSync(join(work, 'config')) && !existsSync(join(work, 'running')))
  await d.start()
  t.ok(existsSync(join(work, 'running')))
  const st = await d.status()
  t.alike([st.desired.deployed, st.desired.running], [true, true])
  t.ok(st.check.every(x => x.status === 'met'))

  await d.stop()
  t.ok(existsSync(join(work, 'config')) && !existsSync(join(work, 'running')), 'stop keeps the configuration')
  // The world drifts; reconcile brings it back to the desired state (stopped, deployed).
  await d.start()
  const drift = (await import('bare-fs')).rmSync
  drift(join(work, 'running'), { recursive: true })
  const r = await d.reconcile()
  t.alike(r.done.map(x => x.name), ['server'])

  await d.teardown()
  t.ok(!existsSync(join(work, 'config')) && !existsSync(join(work, 'running')))
  t.ok(existsSync(join(work, 'deployment', 'lifecycle.jsonl')), 'the record stays')
  // Reopened: the desired state is the fold of what was recorded.
  const again = await openDeployment({ project: join(dir, 'project.json'), work })
  t.alike(await again.desired().then(x => [x.deployed, x.running, x.last]), [false, false, 'teardown'])
})

// A node, two down from the root's haiccing/, the platform's package copied
// in whole: fetch.sh found in it, what is here listed, a package tested.
test('a node finds its packages and the root\'s haiccing/', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'haicc-node-'))
  const node = join(dir, 'hosts', 'master')
  const put = (f, text) => { mkdirSync(dirname(join(node, f)), { recursive: true }); writeFileSync(join(node, f), text) }
  mkdirSync(join(dir, 'haiccing'))
  put('packages/base-package-haicc/modules/pear-full-square/haicc-base-boot/fetch.sh', 'echo "fetching into $1"\n')
  put('packages/base-package-haicc/test/one/test', '#!/bin/sh\necho "# tests 1"\necho "# pass 1"\n')
  chmodSync(join(node, 'packages/base-package-haicc/test/one/test'), 0o755)
  // Written: its hash recorded, as the package writer does.
  const hash = packageHash(join(node, 'packages/base-package-haicc'))
  put('packages/base-package-haicc/package.json', JSON.stringify({ pkgm: { hash } }))
  const haicc = (...args) => { const r = spawnSync(process.execPath, [fileURLToPath(new URL('../haicc.js', import.meta.url)), ...args], { env: { ...process.env, HAICC_WORK: node } }); return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr) } }
  const list = haicc('list')
  t.is(list.status, 0, list.stderr)
  t.ok(new RegExp(`base-package-haicc {2}${hash.slice(0, 12)}`).test(list.stdout))
  t.ok(haicc('fetch', 'base-package-x').stdout.includes(`fetching into ${join(dir, 'haiccing')}`))
  const tested = haicc('test', 'base-package-haicc')
  t.is(tested.status, 0, tested.stdout)
  t.ok(/ok {5}base-package-haicc: test\/one \(1\/1\)/.test(tested.stdout))
  const boot = haicc('boot')
  t.is(boot.status, 0, boot.stdout)
  t.ok(/ok {5}base-package-haicc: intact \([0-9a-f]{12}\)/.test(boot.stdout), boot.stdout)
  t.ok(/Ready: 2 test runs passed \(base-package-haicc\)/.test(boot.stdout), boot.stdout)
  // A file replaced in its copy: not intact, said; its tests not run; not up.
  rmSync(join(node, 'packages/base-package-haicc/test/one/test'))
  put('packages/base-package-haicc/test/one/test', '#!/bin/sh\necho changed\n')
  const changed = haicc('boot')
  t.is(changed.status, 1, changed.stdout)
  t.ok(/FAILED base-package-haicc: changed since it was written/.test(changed.stdout), changed.stdout)
  t.ok(/Not ready: 1 of 1 test runs failed/.test(changed.stdout), changed.stdout)
  t.is(haicc('test', 'base-package-haicc').status, 1)
  t.is(haicc('test', 'nope').status, 1)
})
