// The code rules on modules written here: one that keeps them, one that
// breaks each.
import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { checkModule, checkPackage } from '../index.js'

// The samples' imports and references built, so this file itself keeps the rules.
const q = "'"
const from = spec => `from ${q}${spec}${q}`
const ref = 'docs' + '/design/x.md'

function write (dir, files) { for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), t) } }

test('a module that keeps the rules: none', (t) => {
  const d = mkdtempSync(join(tmpdir(), 'check-'))
  try {
    write(d, { 'test/t.test.js': `import f ${from('other/test/fixture.js')}\n`, 'index.js': `export { a } ${from('./external/a/index.js')}\nimport x ${from('other')}\n`, 'external/a/index.js': `import { b } ${from('../../internal/b.js')}\nexport const a = 1\n`, 'external/a/README.md': '# a\n', 'internal/b.js': 'export const b = 2\n' })
    t.alike(checkModule(d, { ours: ['other'] }), [])
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('a module that breaks each: structure, imports, references', (t) => {
  const d = mkdtempSync(join(tmpdir(), 'check-'))
  try {
    write(d, { 'index.js': `import x ${from('../sibling/index.js')}\nimport y ${from('other/lib/deep.js')}\n// see ${ref}\n`, 'internal/m/index.js': 'export const m = 1\n' })
    t.alike(checkModule(d, { ours: ['other'] }).map(p => `${p.file} ${p.check}`).sort(), ['index.js imports', 'index.js imports', 'index.js transient', 'internal/m structure'].sort())
    t.alike(checkPackage(d).map(p => p.check), ['transient'], 'a package\'s own code: references')
  } finally { rmSync(d, { recursive: true, force: true }) }
})
