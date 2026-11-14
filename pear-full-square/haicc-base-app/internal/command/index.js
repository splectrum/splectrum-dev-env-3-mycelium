// command(argv): what a command line asks for (README.md beside it).
import { Failure } from '../failure.js'
import { MACHINE } from '../boot/index.js'

// The commands that are neither for the mrepos nor the machine level.
const OWN = ['sources']
const none = name => new Failure(`no command '${name}' (haicc --help)`, 2)

function forMrepos (args, print) {
  const [uri, ...parts] = args
  if (!parts.length) throw new Failure('haicc <URI> <protocol>/<action> <argument>... (a command follows the URI)', 2)
  // at the root the command is written plain; anywhere else the haicc
  // command goes as it is, and the root mrepo resolves the position
  return { kind: 'request', uri, parts: uri === '/' ? parts : ['haicc', uri, ...parts], print }
}

export function command (argv) {
  const [first = '', ...rest] = argv
  if (first.startsWith('/')) return forMrepos(argv, null)
  if (first === '--output' || first === '--raw') {
    if ((rest[0] ?? '').startsWith('/')) return forMrepos(rest, first.slice(2))
    throw new Failure(`${first} goes before a URI`, 2)
  }
  if (['', 'help', '--help', '-h'].includes(first)) return { kind: 'usage' }
  const actions = p => Object.keys(MACHINE[p]).sort()
  if (first.includes('/')) {
    const protocol = first.slice(0, first.indexOf('/'))
    const action = first.slice(first.indexOf('/') + 1)
    if (!/^[a-z0-9-]+$/.test(protocol) || !/^[a-z0-9-]+$/.test(action) || !MACHINE[protocol]) throw none(first)
    if (!MACHINE[protocol][action]) throw new Failure(`no action: ${protocol} ${action} (${actions(protocol).join(', ')})`, 2)
    if (rest.length) throw new Failure(`haicc ${protocol}/${action} (no arguments)`, 2)
    return { kind: 'machine', protocol, action }
  }
  if (MACHINE[first]) throw new Failure(actions(first).map(a => `haicc ${first}/${a}`).join(', '), 2)
  if (!OWN.includes(first)) throw none(first)
  return { kind: first, args: rest }
}
