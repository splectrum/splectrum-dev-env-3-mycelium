// The command line read: what each form asks for, and what is refused.
import test from 'brittle'
import { command, Failure } from '../index.js'

const refused = (t, argv, code, said) => {
  try { command(argv); t.fail(`not refused: haicc ${argv.join(' ')}`) } catch (err) {
    t.ok(err instanceof Failure && err.code === code && err.message === said, `haicc ${argv.join(' ')}: exit ${code}, ${said}`)
    if (err.message !== said) t.comment(`said: ${err.message}`)
  }
}

test('a command for the mrepos: at the root written plain, elsewhere the haicc command as it is', (t) => {
  t.alike(command(['/', 'boot/deploy', 'host', 'base-component-haicc']), { kind: 'request', uri: '/', parts: ['boot/deploy', 'host', 'base-component-haicc'], print: null }, 'at the root: the command plain')
  t.alike(command(['/host', 'service/start']), { kind: 'request', uri: '/host', parts: ['haicc', '/host', 'service/start'], print: null }, 'elsewhere: haicc <URI> <command>')
  t.alike(command(['/host', 'haicc', '/node-1', 'help/get', '/']).parts, ['haicc', '/host', 'haicc', '/node-1', 'help/get', '/'], 'chained: the parts as typed')
  t.alike(command(['/', 'help/get', '/packages', 'no "such" section']).parts, ['help/get', '/packages', 'no "such" section'], 'an argument with spaces and quotes: one part')
  t.is(command(['--raw', '/', 'help/get']).print, 'raw', '--raw before the URI')
  t.is(command(['--output', '/host', 'help/get']).print, 'output', '--output before the URI')
  t.alike(command(['--output', '/host', 'help/get']).parts, ['haicc', '/host', 'help/get'], 'the option is not a part')
})

test('the machine level, the usage, the sources', (t) => {
  t.alike(command(['boot/deploy']), { kind: 'machine', protocol: 'boot', action: 'deploy' })
  t.alike(command(['boot/teardown']), { kind: 'machine', protocol: 'boot', action: 'teardown' })
  for (const a of [[], ['help'], ['--help'], ['-h']]) t.alike(command(a), { kind: 'usage' }, `haicc ${a.join(' ')}: the usage`)
  t.alike(command(['sources']), { kind: 'sources', args: [] })
  t.alike(command(['sources', 'unlink', '/a/folder']), { kind: 'sources', args: ['unlink', '/a/folder'] })
})

test('refused, exit 2: not a command, or its arguments wrong', (t) => {
  refused(t, ['nosuch'], 2, "no command 'nosuch' (haicc --help)")
  refused(t, ['Nosuch/x'], 2, "no command 'Nosuch/x' (haicc --help)")
  refused(t, ['deploy/host'], 2, "no command 'deploy/host' (haicc --help)")
  refused(t, ['-x'], 2, "no command '-x' (haicc --help)")
  refused(t, ['/'], 2, 'haicc <URI> <protocol>/<action> <argument>... (a command follows the URI)')
  refused(t, ['/host'], 2, 'haicc <URI> <protocol>/<action> <argument>... (a command follows the URI)')
  refused(t, ['boot'], 2, 'haicc boot/deploy, haicc boot/teardown')
  refused(t, ['boot/nosuch'], 2, 'no action: boot nosuch (deploy, teardown)')
  refused(t, ['boot/deploy', 'host'], 2, 'haicc boot/deploy (no arguments)')
  refused(t, ['--output'], 2, '--output goes before a URI')
  refused(t, ['--raw', 'boot/deploy'], 2, '--raw goes before a URI')
})
