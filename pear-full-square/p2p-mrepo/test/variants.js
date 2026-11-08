// Generate p2p-mrepo's command sets from mycelium-git's (test/commands.txt,
// native git on Node): the same invocations and expectations, run on a
// p2p-mrepo repository through mycelium-git's CLI with this module as its
// engine, on Node and on Bare.
//   node test/variants.js
import { readFileSync, writeFileSync } from 'bare-fs'

const here = new URL('.', import.meta.url)
const base = readFileSync(new URL('../../mycelium-git/test/commands.txt', here), 'utf8')
// The base's own three-line header is replaced by each variant's.
const body = base.split('\n').slice(3)
const variants = {
  commands: ['Node', 'node'],
  'commands-bare': ['Bare', 'bare']
}
for (const [file, [what, runtime]] of Object.entries(variants)) {
  const head = `# Test commands for mycelium repositories on the p2p layer (p2p-mrepo), on ${what}:\n` +
    '# generated from mycelium-git/test/commands.txt by test/variants.js, with the same\n' +
    '# expectations; run from p2p-mrepo/.\n'
  const text = body.join('\n')
    .replaceAll('node cli.js ', `${runtime} ../mycelium-git/cli.js --engine=../p2p-mrepo/engine.js `)
    .replace('sh test/fixture.sh fixture', `sh test/fixture.sh fixture ${runtime}`)
  writeFileSync(new URL(`${file}.txt`, here), head + text)
}
