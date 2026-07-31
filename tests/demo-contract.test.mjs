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

test('offers real built-in and scoped-slot node paths with completion metrics', async () => {
  const app = await readFile(new URL('examples/shared/App.vue', root), 'utf8')

  assert.match(app, /v-if="customSlotEnabled"/)
  assert.match(app, /v-else/)
  assert.match(app, /class="custom-node-content"/)
  assert.match(app, /class="default-node-content"/)
  assert.match(app, /@click\.stop/)
  assert.match(app, /selectChange/)
  assert.match(app, /scrollToItem completion/)
})

test('keeps the demo on public component contracts and cancellable generations', async () => {
  const app = await readFile(new URL('examples/shared/App.vue', root), 'utf8')
  const actions = await readFile(new URL('examples/shared/method-actions.ts', root), 'utf8')

  assert.match(app, /VueVirtualTreeInstance<DemoTreeNode>/)
  assert.doesNotMatch(app, /LogicalTreeNode|countLogicalTreeNodes|\.root\b|as unknown/)
  assert.doesNotMatch(actions, /DemoTreeApi|\bany\b/)
  assert.match(actions, /VueVirtualTreeInstance<DemoTreeNode>/)
  assert.match(app, /workGeneration/)
  assert.match(app, /pendingTimeouts/)
  assert.match(app, /pendingAnimationFrames/)
  assert.match(app, /beforeDestroy[\s\S]*cleanupAsyncWork/)
  assert.match(app, /beforeUnmount[\s\S]*cleanupAsyncWork/)
})

test('associates every prop control with stable labels and descriptions', async () => {
  const app = await readFile(new URL('examples/shared/App.vue', root), 'utf8')

  assert.match(app, /:id="propRowId\(prop\.name\)"/)
  assert.match(app, /:aria-labelledby="propLabelId\(prop\.name\)"/)
  assert.match(app, /:aria-describedby="propDescriptionId\(prop\.name\)"/)
  assert.match(app, /:id="propLabelId\(prop\.name\)"/)
  assert.match(app, /:id="propDescriptionId\(prop\.name\)"/)
})

test('uses AA light-theme secondary text colors', async () => {
  const css = await readFile(new URL('examples/shared/styles.css', root), 'utf8')
  const lightTheme = css.match(/\.app-shell\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

  const luminance = (hex) => {
    const channels = hex.match(/[\da-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255)
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  }
  const contrastOnWhite = (hex) => 1.05 / (luminance(hex) + 0.05)

  for (const token of ['muted', 'subtle']) {
    const value = lightTheme.match(new RegExp(`--${token}:\\s*(#[\\da-f]{6})`, 'i'))?.[1]
    assert.ok(value, `missing --${token}`)
    assert.ok(contrastOnWhite(value) >= 4.5, `${token} contrast must be at least 4.5:1`)
  }
})
