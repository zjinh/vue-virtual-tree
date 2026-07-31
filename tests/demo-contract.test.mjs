import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))

test('defines isolated Vue 2 and Vue 3 workspace applications', async () => {
  for (const runtime of ['vue2', 'vue3']) {
    const demoPackage = JSON.parse(
      await readFile(new URL(`examples/${runtime}/package.json`, root), 'utf8'),
    )
    assert.equal(demoPackage.private, true)
    assert.equal(demoPackage.dependencies['@zjinh/vue-virtual-tree'], 'workspace:*')
    assert.ok(demoPackage.dependencies.vue)
    assert.ok(demoPackage.scripts.typecheck)
    assert.ok(demoPackage.scripts.build)
    await access(new URL(`examples/${runtime}/vite.config.ts`, root))
    await access(new URL(`examples/${runtime}/src/main.ts`, root))
  }
})

test('dedupes Vue and consumes only published package entry points', async () => {
  const vue2Main = await readFile(new URL('examples/vue2/src/main.ts', root), 'utf8')
  const vue3Main = await readFile(new URL('examples/vue3/src/main.ts', root), 'utf8')

  assert.match(vue2Main, /@zjinh\/vue-virtual-tree\/vue2/)
  assert.match(vue3Main, /@zjinh\/vue-virtual-tree(?:\/vue3)?['"]/)
  for (const source of [vue2Main, vue3Main]) {
    assert.match(source, /@zjinh\/vue-virtual-tree\/style\.css/)
    assert.doesNotMatch(source, /(?:\.\.\/)+src\//)
  }

  for (const runtime of ['vue2', 'vue3']) {
    const config = await readFile(new URL(`examples/${runtime}/vite.config.ts`, root), 'utf8')
    assert.match(config, /dedupe:\s*\[\s*['"]vue['"]\s*\]/)
  }
})

test('exposes demo development and release gates after the root build', () => {
  assert.ok(packageJson.scripts['dev:vue2'])
  assert.ok(packageJson.scripts['dev:vue3'])
  assert.ok(packageJson.scripts['test:demos'])

  for (const scriptName of ['test', 'release:check']) {
    const script = packageJson.scripts[scriptName]
    assert.ok(script.indexOf('pnpm run build') < script.indexOf('pnpm run test:demos'))
  }
})
