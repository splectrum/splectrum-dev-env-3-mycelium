import test from 'brittle'
import { mkdtempSync, existsSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import tcp from 'bare-tcp'
import { createEngine, providers } from '../index.js'
import process from 'bare-process'

// A kind of our own: things in a set, made and removed, marked by owner.
function thingKind (world) {
  return {
    observe: r => world.get(r.want.id) ?? null,
    compare: (r, a) => !a ? { status: 'missing' } : a.size === r.want.size ? { status: 'met' } : { status: 'different', detail: a },
    create: (r, ctx) => { if (r.want.fail) throw new Error('cannot'); world.set(r.want.id, { size: r.want.size, owner: ctx.owner }) },
    owned: (a, ctx) => a.owner === ctx.owner,
    remove: (r, ctx, a) => { for (const [k, v] of world) if (v === a) world.delete(k) },
    extras: (reqs) => [...world].filter(([id]) => !reqs.some(r => r.kind === 'thing' && r.want.id === id)).map(([id, actual]) => ({ name: `thing-${id}`, actual })),
    hint: () => 'not ours to change'
  }
}

test('check, plan, apply: missing made, different updated if ours, dependents blocked, idempotent', async (t) => {
  const world = new Map([['b', { size: 1, owner: 'someone' }], ['c', { size: 1, owner: 'us' }]])
  const records = []
  const e = createEngine({ providers: { thing: thingKind(world) }, owner: 'us', record: v => records.push(v) })
  const reqs = [
    { name: 'a', kind: 'thing', want: { id: 'a', size: 2 } },
    { name: 'b', kind: 'thing', want: { id: 'b', size: 2 } }, // different, not ours
    { name: 'c', kind: 'thing', want: { id: 'c', size: 3 }, needs: ['a'] }, // different, ours
    { name: 'd', kind: 'thing', want: { id: 'd', size: 1 }, needs: ['b'] }
  ]
  const c = await e.check(reqs)
  t.alike(c.map(x => [x.name, x.status, x.fixable]), [['a', 'missing', true], ['b', 'different', false], ['c', 'different', true], ['d', 'blocked', false]])
  t.is(c[1].hint, 'not ours to change')
  t.alike((await e.plan(reqs)).map(s => [s.name, s.action]), [['a', 'create'], ['c', 'update'], ['d', 'create']])
  const r = await e.apply(reqs)
  t.alike(r.done.map(x => [x.name, x.action]), [['a', 'create'], ['c', 'update']])
  t.alike(r.failed.map(x => x.name), ['b'])
  t.alike(r.blocked, [{ name: 'd', needs: ['b'] }])
  t.is(world.has('d'), false)
  // Again: nothing more to do for what was made.
  const again = await e.apply(reqs.filter(x => x.name !== 'b' && x.name !== 'd'))
  t.alike(again.done, [])
  t.ok(records.some(x => x.phase === 'apply' && x.action === 'create' && x.ok))
})

test('non-strict leaves extras; strict removes only its own; remove takes away only what it made', async (t) => {
  const world = new Map([['x', { size: 1, owner: 'us' }], ['y', { size: 1, owner: 'someone' }]])
  const e = createEngine({ providers: { thing: thingKind(world) }, owner: 'us' })
  const reqs = [{ name: 'a', kind: 'thing', want: { id: 'a', size: 1 } }]
  await e.apply(reqs)
  t.alike((await e.check(reqs)).filter(x => x.status === 'extra').map(x => x.name), ['thing-x', 'thing-y'])
  t.ok(world.has('x') && world.has('y'), 'non-strict: extras stay')
  const s = await e.apply(reqs, { strict: true })
  t.alike(s.done.map(x => [x.name, x.action]), [['thing-x', 'remove']])
  t.ok(!world.has('x') && world.has('y'), 'strict: only ours removed')
  world.set('z', { size: 1, owner: 'someone' })
  const gone = await e.remove([...reqs, { name: 'z', kind: 'thing', want: { id: 'z', size: 1 } }])
  t.alike(gone, { done: ['a'], failed: [], kept: ['z'] })
})

test('a declaration error: a cycle, an unknown need, a duplicate name', async (t) => {
  const e = createEngine({ providers: { thing: thingKind(new Map()) } })
  await t.exception(e.check([{ name: 'a', kind: 'thing', want: {}, needs: ['b'] }, { name: 'b', kind: 'thing', want: {}, needs: ['a'] }]), /cycle/)
  await t.exception(e.check([{ name: 'a', kind: 'thing', want: {}, needs: ['nope'] }]), /not declared/)
  await t.exception(e.check([{ kind: 'thing', want: {} }, { kind: 'thing', want: {} }]), /unique/)
  await t.exception(e.check([{ kind: 'nothing', want: {} }]), /no provider/)
})

test('the generic providers: folder (made, owned, removed), port (free, taken, ours), os', async (t) => {
  const w = mkdtempSync(join(tmpdir(), 'haicc-'))
  const e = createEngine({ providers, owner: 'test' })
  const f = { name: 'work', kind: 'folder', want: { path: join(w, 'work') } }
  t.is((await e.check([f]))[0].status, 'missing')
  await e.apply([f])
  t.ok(existsSync(join(w, 'work', 'haicc-owner')))
  mkdirSync(join(w, 'theirs'))
  const theirs = { name: 'theirs', kind: 'folder', want: { path: join(w, 'theirs') } }
  t.alike(await e.remove([f, theirs]), { done: ['work'], failed: [], kept: ['theirs'] })
  t.ok(!existsSync(join(w, 'work')) && existsSync(join(w, 'theirs')))

  const server = tcp.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const taken = server.address().port
  const [p] = await e.check([{ name: 'ui', kind: 'port', want: { port: taken } }])
  t.alike([p.status, p.fixable], ['different', false])
  t.ok(/taken/.test(p.hint))
  server.close()

  const [o] = await e.check([{ kind: 'os', want: { platform: process.platform } }])
  t.is(o.status, 'met')
})
