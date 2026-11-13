// redeploy(exec, form): the boot protocol's redeploy, teardown then deploy (README.md beside it).
import { child } from '../../internal/child.js'
import { deploy } from '../deploy/index.js'
import { teardown } from '../teardown/index.js'

export async function redeploy (exec, form) {
  const c = child(exec, form.uri)
  const was = await c.recorded()
  const down = await teardown(exec, form)
  await exec.commit('torn down')
  return { ...down, ...(await deploy(exec, { ...form, args: [form.args?.[0] ?? was?.package] })) }
}
