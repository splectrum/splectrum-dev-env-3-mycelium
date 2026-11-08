import test from 'brittle'
import { writeFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { fixture } from '../../mycelium-git/test/contract.js'
import { nativeBackend, p2pgitBackend, openRepo } from '../../mycelium-git/index.js'
import { executeRequests, intake } from '../index.js'

const author = { name: 'test', email: 'test@localhost' }
const request = fileURLToPath(new URL('./request', import.meta.url))

test('executeRequests: each pending request answered on main, once, with its unit', async (t) => {
  for (const make of [nativeBackend, p2pgitBackend]) {
    const backend = make(fixture())
    await intake({ backend, folder: request, name: 'r2', author })
    const seen = []
    const handle = async (r, { state, out }) => {
      seen.push([r.name, state['pending/default'].length])
      writeFileSync(join(out, 'answer.txt'), `answer to ${r.name}`)
      return { outcome: `Answered ${r.name}.`, body: 'the body\n' }
    }
    const plan = pending => pending.map(p => ({ ...p, line: p.text.split('\n')[0] })).reverse()
    const run = () => executeRequests({ backend, capability: 'overlay/config', author, environment: { e: 1 }, plan, handle })
    t.alike(await run(), ['r2', 'r1'])
    t.alike(seen, [['r2', 40], ['r1', 40]])
    const repo = openRepo(backend)
    t.alike((await repo.select('/main/responses/r1/*')).map(([p]) => p.split('/').pop()), ['answer.txt', 'response.md', 'unit.json'])
    t.is((await repo.read('/main/responses/r2/answer.txt')).toString(), 'answer to r2')
    const unit = JSON.parse(await repo.read('/main/responses/r1/unit.json'))
    t.alike(unit.invocation, { request: 'r1', line: '# Request: r1' })
    t.alike(Object.keys(unit.state), ['pending/default', 'main', 'execute/main', 'overlay/config'])
    t.alike(unit.environment, { e: 1 })
    const response = (await repo.read('/main/responses/r2/response.md')).toString()
    t.ok(/^# Response: r2\n\nAnswered r2\.\n/.test(response))
    t.ok(/\nthe body\n$/.test(response))
    // Answered: nothing pending any more.
    t.alike(await run(), [])
    // main took each response by a plain merge of execute/main.
    const head = Object.fromEntries(await backend.listBranches()).main
    t.is((await backend.readCommit(head)).parents.length, 2)
  }
})
