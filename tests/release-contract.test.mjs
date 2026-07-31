import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))

function assertOrderedGates(scriptName, gates) {
  const script = packageJson.scripts[scriptName]
  let previousIndex = -1

  for (const gate of gates) {
    const index = script.indexOf(gate)
    assert.ok(index > previousIndex, `${gate} must follow the preceding ${scriptName} gate`)
    previousIndex = index
  }
}

test('pins the package publication toolchain', () => {
  assert.equal(packageJson.devDependencies['@arethetypeswrong/cli'], '0.18.5')
  assert.equal(packageJson.packageManager, 'pnpm@10.33.4')
  assert.equal(packageJson.publishConfig.access, 'public')
})

test('exposes a stable-only release policy gate', async () => {
  assert.equal(
    packageJson.scripts['release:policy'],
    'node scripts/check-release-policy.mjs',
  )
  await access(new URL('scripts/release-policy.mjs', root))
  await access(new URL('scripts/check-release-policy.mjs', root))
})

test('layers source, tarball, publication, and CI gates without lifecycle recursion', () => {
  assert.equal(packageJson.scripts['test:tarball'], 'node --test tests/tarball-contract.test.mjs')
  assert.equal(packageJson.scripts['test:attw'], 'node scripts/check-attw.mjs')
  assert.equal(packageJson.scripts.prepublishOnly, 'pnpm run publish:check')

  assertOrderedGates('release:check', [
    'test:package',
    'test:model',
    'test:components',
    'typecheck',
    'typecheck:sfc',
    'build',
    'test:artifacts',
    'test:types',
    'test:demos',
    'publint',
  ])
  assert.doesNotMatch(packageJson.scripts['release:check'], /tarball|attw|publish:check/)

  assertOrderedGates('publish:check', [
    'release:check',
    'pack:release',
    'test:tarball',
    'test:attw',
  ])
  assertOrderedGates('ci:check', ['publish:check', 'test:pages'])

  for (const lifecycle of ['prepack', 'prepublishOnly']) {
    assert.doesNotMatch(packageJson.scripts[lifecycle], /pnpm\s+pack|npm\s+publish/)
  }
  assert.doesNotMatch(packageJson.scripts['pack:release'], /prepack|publish:check/)
})

test('keeps release tarball preparation and checks in dedicated scripts', async () => {
  for (const script of [
    'scripts/release-tarball.mjs',
    'scripts/pack-release.mjs',
    'scripts/check-attw.mjs',
  ]) {
    await access(new URL(script, root))
  }

  const packScript = await readFile(new URL('scripts/pack-release.mjs', root), 'utf8')
  assert.match(packScript, /--config\.ignore-scripts=true/)
  assert.match(packScript, /process\.execPath/)
  assert.match(packScript, /process\.env\.npm_execpath/)

  const attwScript = await readFile(new URL('scripts/check-attw.mjs', root), 'utf8')
  assert.match(attwScript, /@arethetypeswrong\/cli/)
  assert.match(attwScript, /releaseTarballPath/)
  assert.match(attwScript, /--profile[\s\S]*esm-only/)
  assert.match(attwScript, /--exclude-entrypoints[\s\S]*style\.css/)
  assert.doesNotMatch(attwScript, /--from-npm/)
})
