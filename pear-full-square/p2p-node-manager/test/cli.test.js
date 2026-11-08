// The command line is a boundary: names are validated there, once.
import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync, writeFileSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'

const bare = Bare.argv[0]

test('a name that breaks the rules is refused at the command line, before anything starts', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'nm-cli-'))
  writeFileSync(join(dir, 'invitation.json'), JSON.stringify({ swarm: 'Bad_Swarm' }))
  const r = spawnSync(bare, ['cli.js', 'join', `--invitation=${join(dir, 'invitation.json')}`, `--folder=${join(dir, 'n')}`, '--vault=/nonexistent', '--name=node-1', '--boot=/x'], { stdio: ['ignore', 'pipe', 'pipe'] })
  t.not(r.status, 0)
  t.ok(/not a swarm name: Bad_Swarm/.test(String(r.stderr)), String(r.stderr))
  t.ok(!existsSync(join(dir, 'n')), 'nothing made')
})

test('join only; the boot program\'s code named', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'nm-cli-'))
  const r = spawnSync(bare, ['cli.js', 'run'], { stdio: ['ignore', 'pipe', 'pipe'] })
  t.is(r.status, 2)
  writeFileSync(join(dir, 'invitation.json'), JSON.stringify({ swarm: 'hosts' }))
  const b = spawnSync(bare, ['cli.js', 'join', `--invitation=${join(dir, 'invitation.json')}`, `--folder=${join(dir, 'n')}`, '--vault=/nonexistent', '--name=node-1'], { stdio: ['ignore', 'pipe', 'pipe'] })
  t.is(b.status, 1)
  t.ok(/--boot=<folder> is needed/.test(String(b.stderr)))
})
