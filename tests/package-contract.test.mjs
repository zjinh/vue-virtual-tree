import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(
  await readFile(new URL('package.json', root), 'utf8'),
)

function assertOrderedGates(scriptName, gates) {
  const script = packageJson.scripts[scriptName]
  let previousIndex = -1

  for (const gate of gates) {
    const index = script.indexOf(gate)
    assert.ok(index > previousIndex, `${gate} must follow the preceding ${scriptName} gate`)
    previousIndex = index
  }
}

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
  assert.match(packageJson.scripts.build, /^tsdown && /)
  assert.match(packageJson.scripts.build, /tsc -p tsconfig\.declarations\.json/)
  assert.match(packageJson.scripts.build, /node scripts\/finalize-build\.mjs$/)
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit')
  assert.match(packageJson.scripts['test:package'], /package-contract/)
  assert.match(packageJson.scripts['test:artifacts'], /artifact-contract/)
  assert.match(packageJson.scripts['test:types'], /tests\/types\/vue3\/tsconfig\.json/)
  assert.match(packageJson.scripts['test:types'], /tests\/types\/vue2\/tsconfig\.json/)
  assert.match(packageJson.scripts.prepack, /build/)
  assert.match(packageJson.scripts.prepack, /test:artifacts/)
  assert.match(packageJson.scripts.prepublishOnly, /release:check/)

  assert.match(packageJson.scripts.test, /^pnpm run test:package/)
  assertOrderedGates('test', [
    'test:package',
    'typecheck',
    'build',
    'test:artifacts',
    'test:types',
  ])

  assert.match(packageJson.scripts['release:check'], /^pnpm run test:package/)
  assertOrderedGates('release:check', [
    'test:package',
    'typecheck',
    'build',
    'test:artifacts',
    'test:types',
    'publint',
  ])
})

test('finalizes public artifacts without module-level build coordination', async () => {
  const config = await readFile(new URL('tsdown.config.ts', root), 'utf8')
  assert.doesNotMatch(config, /completedBuilds|cleanedPublicFiles|publishContract/)
  assert.equal(config.match(/clean:\s*true/g)?.length, 2)
  assert.match(config, /Vue 2 compiler types differ from the root Vue 3 compiler types/)
  assert.match(config, /as unknown as NonNullable<\s*Vue2PluginOptions\['compiler'\]/)

  const finalizer = await readFile(new URL('scripts/finalize-build.mjs', root), 'utf8')
  assert.match(finalizer, /dist\/vue2\/style\.css/)
  assert.match(finalizer, /dist\/vue3\/style\.css/)
  assert.match(finalizer, /rename/)
})

test('derives the published declaration from the source entry point', async () => {
  await assert.rejects(
    access(new URL('src/public.d.ts', root)),
    (error) => error?.code === 'ENOENT',
  )

  const declarationConfig = JSON.parse(
    await readFile(new URL('tsconfig.declarations.json', root), 'utf8'),
  )
  assert.equal(declarationConfig.compilerOptions.declaration, true)
  assert.equal(declarationConfig.compilerOptions.emitDeclarationOnly, true)
  assert.equal(declarationConfig.compilerOptions.noEmit, false)
  assert.deepEqual(declarationConfig.include, ['src/index.ts', 'src/vue-shim.d.ts'])
})
