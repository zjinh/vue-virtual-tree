import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(
  await readFile(new URL('package.json', root), 'utf8'),
)

test('declares the pnpm workspace and reproducible toolchain', async () => {
  assert.equal(packageJson.name, '@zjinh/vue-virtual-tree')
  assert.equal(packageJson.private, false)
  assert.equal(packageJson.packageManager, 'pnpm@10.33.4')
  assert.equal(await readFile(new URL('.node-version', root), 'utf8'), '22.22.3\n')
  assert.equal(await readFile(new URL('.nvmrc', root), 'utf8'), '22.22.3\n')
  assert.match(
    await readFile(new URL('pnpm-workspace.yaml', root), 'utf8'),
    /examples\/\*/,
  )

  const lockfile = await readFile(new URL('pnpm-lock.yaml', root), 'utf8')
  assert.match(lockfile, /^lockfileVersion: '9\.0'/)

  const license = await readFile(new URL('LICENSE', root), 'utf8')
  assert.match(license, /^MIT License$/m)

  const ignoredPaths = new Set(
    (await readFile(new URL('.gitignore', root), 'utf8'))
      .split(/\r?\n/)
      .filter(Boolean),
  )
  for (const path of ['node_modules/', '.pnpm-store/', 'dist/', '.idea/']) {
    assert.ok(ignoredPaths.has(path), `.gitignore must contain ${path}`)
  }
})

test('publishes Vue 3 by default and explicit Vue 2 and Vue 3 subpaths', () => {
  assert.equal(packageJson.main, './dist/vue3/index.js')
  assert.equal(packageJson.module, './dist/vue3/index.js')
  assert.equal(packageJson.types, './dist/index.d.ts')
  assert.deepEqual(packageJson.exports['.'], {
    types: './dist/index.d.ts',
    import: './dist/vue3/index.js',
    default: './dist/vue3/index.js',
  })
  assert.deepEqual(packageJson.exports['./vue2'], {
    types: './dist/index.d.ts',
    import: './dist/vue2/index.js',
    default: './dist/vue2/index.js',
  })
  assert.deepEqual(packageJson.exports['./vue3'], {
    types: './dist/index.d.ts',
    import: './dist/vue3/index.js',
    default: './dist/vue3/index.js',
  })
  assert.equal(packageJson.exports['./style.css'], './dist/style.css')
  assert.equal(packageJson.exports['./package.json'], './package.json')
})

test('declares the consumer and publication boundaries', () => {
  assert.equal(packageJson.peerDependencies.vue, '^2.7.0 || ^3.2.0')
  assert.deepEqual(packageJson.files, ['dist', 'README.md', 'LICENSE'])
  assert.deepEqual(packageJson.sideEffects, ['**/*.css'])
  assert.equal(packageJson.publishConfig.access, 'public')
})

test('defines package and release gates around tsdown', () => {
  assert.equal(packageJson.scripts.build, 'tsdown')
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit')
  assert.match(packageJson.scripts['test:package'], /package-contract/)
  assert.match(packageJson.scripts['test:artifacts'], /artifact-contract/)
  assert.match(packageJson.scripts['test:types'], /tests\/types\/vue3\/tsconfig\.json/)
  assert.match(packageJson.scripts['test:types'], /tests\/types\/vue2\/tsconfig\.json/)
  assert.match(packageJson.scripts.prepack, /build/)
  assert.match(packageJson.scripts.prepack, /test:artifacts/)
  assert.match(packageJson.scripts.prepublishOnly, /release:check/)

  const releaseCheck = packageJson.scripts['release:check']
  const orderedGates = ['typecheck', 'build', 'test:artifacts', 'test:types', 'publint']
  let previousIndex = -1
  for (const gate of orderedGates) {
    const index = releaseCheck.indexOf(gate)
    assert.ok(index > previousIndex, `${gate} must follow the preceding release gate`)
    previousIndex = index
  }
})
