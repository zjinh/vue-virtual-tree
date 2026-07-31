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
  assert.match(packageJson.scripts.build, /^node scripts\/clean-build\.mjs && tsdown && /)
  assert.match(packageJson.scripts.build, /tsc -p tsconfig\.declarations\.json/)
  assert.match(packageJson.scripts.build, /node scripts\/finalize-build\.mjs$/)
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit')
  assert.match(packageJson.scripts['test:package'], /package-contract/)
  assert.equal(packageJson.scripts['test:model'], 'vitest run tests/model')
  assert.match(packageJson.scripts['test:artifacts'], /artifact-contract/)
  assert.match(packageJson.scripts['test:types'], /tests\/types\/vue3\/tsconfig\.json/)
  assert.match(packageJson.scripts['test:types'], /tests\/types\/vue2\/tsconfig\.json/)
  assert.match(packageJson.scripts['test:package'], /demo-contract/)
  assert.match(packageJson.scripts['test:demos'], /test:demos:unit/)
  assert.match(packageJson.scripts['test:demos'], /typecheck:demos/)
  assert.match(packageJson.scripts['test:demos'], /build:demos/)
  assert.match(packageJson.scripts['dev:vue2'], /vue-virtual-tree-demo-vue2/)
  assert.match(packageJson.scripts['dev:vue3'], /vue-virtual-tree-demo-vue3/)
  assert.match(packageJson.scripts.prepack, /build/)
  assert.match(packageJson.scripts.prepack, /test:artifacts/)
  assert.match(packageJson.scripts.prepublishOnly, /release:check/)

  assert.match(packageJson.scripts.test, /^pnpm run test:package/)
  assertOrderedGates('test', [
    'test:package',
    'test:model',
    'typecheck',
    'build',
    'test:artifacts',
    'test:types',
    'test:demos',
  ])

  assert.match(packageJson.scripts['release:check'], /^pnpm run test:package/)
  assertOrderedGates('release:check', [
    'test:package',
    'test:model',
    'typecheck',
    'build',
    'test:artifacts',
    'test:types',
    'test:demos',
    'publint',
  ])
})

test('keeps the tree model exclusively in TypeScript and inside package typecheck', async () => {
  const modelFiles = ['util', 'node', 'tree-store']

  for (const modelFile of modelFiles) {
    await access(new URL(`src/model/${modelFile}.ts`, root))
    await assert.rejects(
      access(new URL(`src/model/${modelFile}.js`, root)),
      (error) => error?.code === 'ENOENT',
    )
  }

  const tsconfig = JSON.parse(await readFile(new URL('tsconfig.json', root), 'utf8'))
  assert.equal(tsconfig.compilerOptions.strict, true)
  assert.equal(tsconfig.compilerOptions.allowJs, false)
  assert.ok(tsconfig.include.includes('src/**/*.ts'))
  assert.ok(tsconfig.include.includes('tests/model/**/*.ts'))
  assert.ok(!tsconfig.include.includes('src/**/*.js'))
})

test('keeps component SFC scripts in TypeScript and inside the SFC typecheck gate', async () => {
  const componentFiles = [
    'src/index.vue',
    'src/components/checkbox.vue',
    'src/components/virtual-tree-node.vue',
  ]

  for (const componentFile of componentFiles) {
    const source = await readFile(new URL(componentFile, root), 'utf8')
    assert.match(
      source,
      /<script\s+[^>]*lang=["']ts["'][^>]*>/,
      `${componentFile} must use a TypeScript script block`,
    )
  }

  const virtualList = await readFile(
    new URL('src/components/virtualList.ts', root),
    'utf8',
  )
  assert.doesNotMatch(virtualList, /@ts-ignore/)

  const sfcConfig = JSON.parse(
    await readFile(new URL('tsconfig.sfc.json', root), 'utf8'),
  )
  assert.equal(sfcConfig.compilerOptions.strict, true)
  assert.ok(sfcConfig.include.includes('src/**/*.vue'))
  assert.equal(packageJson.scripts['typecheck:sfc'], 'vue-tsc --noEmit -p tsconfig.sfc.json')
  assert.ok(packageJson.devDependencies['vue-tsc'])
})

test('documents 21 supported props and one unsupported renderContent placeholder', async () => {
  const publicEntry = await readFile(new URL('src/index.ts', root), 'utf8')
  assert.match(
    publicEntry,
    /\/\*\* @deprecated Not implemented; use the default scoped slot\. \*\/\s+renderContent\?: never/,
  )
  assert.doesNotMatch(publicEntry, /export interface VueVirtualTreeRenderContext/)
  assert.doesNotMatch(publicEntry, /export type VueVirtualTreeRenderContent/)

  const treeComponent = await readFile(new URL('src/index.vue', root), 'utf8')
  const nodeComponent = await readFile(
    new URL('src/components/virtual-tree-node.vue', root),
    'utf8',
  )
  for (const component of [treeComponent, nodeComponent]) {
    assert.match(component, /type LegacyRenderContent = \(\.\.\.args: unknown\[\]\) => unknown/)
    assert.match(
      component,
      /renderContent:\s*Function as PropType<LegacyRenderContent>/,
    )
  }

  const heightProp = treeComponent.match(/height:\s*\{[\s\S]*?\n\s*\},/)?.[0]
  assert.ok(heightProp, 'src/index.vue must declare the height prop as an object')
  assert.match(heightProp, /default:\s*'100%'/)
  assert.doesNotMatch(heightProp, /required:\s*true/)

  for (const fixturePath of [
    'tests/types/vue2/index.ts',
    'tests/types/vue3/index.ts',
  ]) {
    const fixture = await readFile(new URL(fixturePath, root), 'utf8')
    assert.match(
      fixture,
      /21 supported props plus one unsupported compatibility placeholder/,
    )
    assert.match(
      fixture,
      /type SupportedPropKeys = Exclude<RuntimePropKeys, 'renderContent'>/,
    )
    assert.match(
      fixture,
      /keyof Omit<VueVirtualTreeProps<ConsumerTreeNode>, 'renderContent'>/,
    )
    assert.equal(
      fixture.match(
        /@ts-expect-error renderContent is an unsupported compatibility placeholder/g,
      )?.length,
      2,
    )
  }
})

test('runs independent Vue 2 and Vue 3 component runtime suites in package gates', async () => {
  assert.equal(
    packageJson.scripts['test:component:vue2'],
    'vitest run --config vitest.component.vue2.config.ts',
  )
  assert.equal(
    packageJson.scripts['test:component:vue3'],
    'vitest run --config vitest.component.vue3.config.ts',
  )
  assert.match(packageJson.scripts['test:components'], /test:component:vue2/)
  assert.match(packageJson.scripts['test:components'], /test:component:vue3/)
  assert.ok(packageJson.devDependencies.jsdom)

  await access(new URL('vitest.component.vue2.config.ts', root))
  await access(new URL('vitest.component.vue3.config.ts', root))

  const runtimeTest = await readFile(
    new URL('tests/component/runtime.test.ts', root),
    'utf8',
  )
  assert.match(runtimeTest, /destroy|unmount/)
  assert.match(runtimeTest, /virtual/i)

  for (const scriptName of ['test', 'release:check']) {
    assert.match(packageJson.scripts[scriptName], /test:components/)
    assert.match(packageJson.scripts[scriptName], /typecheck:sfc/)
  }
})

test('cleans the exact repository dist directory before building', async () => {
  const cleaner = await readFile(new URL('scripts/clean-build.mjs', root), 'utf8')
  assert.match(cleaner, /new URL\('\.\.\/dist\/', import\.meta\.url\)/)
  assert.match(cleaner, /rm\(distUrl, \{ force: true, recursive: true \}\)/)
})

test('runs nested builds through Node and the pnpm JavaScript CLI', async () => {
  const artifactContract = await readFile(
    new URL('tests/artifact-contract.test.mjs', root),
    'utf8',
  )
  assert.doesNotMatch(artifactContract, /pnpm\.cmd/)
  assert.match(artifactContract, /process\.execPath/)
  assert.match(artifactContract, /process\.env\.npm_execpath/)
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
