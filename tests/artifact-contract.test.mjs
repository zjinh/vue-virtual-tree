import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import {
  cp,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function readDist(path) {
  return readFile(new URL(`dist/${path}`, root), 'utf8')
}

test('emits Vue 2 and Vue 3 ESM entry points', async () => {
  const [vue2, vue3] = await Promise.all([
    readDist('vue2/index.js'),
    readDist('vue3/index.js'),
  ])

  for (const output of [vue2, vue3]) {
    assert.match(output, /from\s+["']vue["']/)
    assert.match(output, /export\s*\{[^}]*VueVirtualTree/)
    assert.doesNotMatch(output, /@vue\/runtime-(?:core|dom)/)
    assert.doesNotMatch(output, /__VUE_HMR_RUNTIME__/)
  }
})

test('emits one public stylesheet covering both scoped builds', async () => {
  const [publicCss, vue2Css, vue3Css] = await Promise.all([
    readDist('style.css'),
    readDist('vue2/style.css'),
    readDist('vue3/style.css'),
  ])

  assert.ok(publicCss.length > 0)
  assert.equal(publicCss, `${vue2Css}\n${vue3Css}`)
})

test('consecutive builds emit byte-identical artifacts', async () => {
  const run = promisify(execFile)
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const paths = [
    'index.d.ts',
    'style.css',
    'vue2/index.js',
    'vue2/style.css',
    'vue3/index.js',
    'vue3/style.css',
  ]
  const snapshot = async () => Promise.all(
    paths.map(async (path) => createHash('sha256').update(await readDist(path)).digest('hex')),
  )

  await run(command, ['run', 'build'], { cwd: fileURLToPath(root) })
  const firstBuild = await snapshot()
  await run(command, ['run', 'build'], { cwd: fileURLToPath(root) })

  assert.deepEqual(await snapshot(), firstBuild)
})

test('emits a public declaration contract', async () => {
  const declarations = await readDist('index.d.ts')

  assert.match(declarations, /VueVirtualTree/)
  assert.match(declarations, /install/)
  assert.match(declarations, /export default/)
})

test('entry points expose default, named, and install APIs', async () => {
  const [vue2, vue3] = await Promise.all([
    import(new URL('../dist/vue2/index.js', import.meta.url)),
    import(new URL('../dist/vue3/index.js', import.meta.url)),
  ])

  for (const entry of [vue2, vue3]) {
    assert.equal(entry.default, entry.VueVirtualTree)
    assert.equal(typeof entry.VueVirtualTree.install, 'function')

    let registration
    entry.VueVirtualTree.install({
      component(name, component) {
        registration = { name, component }
      },
    })
    assert.deepEqual(registration, {
      name: 'VueVirtualTree',
      component: entry.VueVirtualTree,
    })
  }
})

test('loads the Vue 2 build against the Vue 2.7 runtime', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'vue-virtual-tree-vue2-'))

  try {
    const temporaryNodeModules = join(temporaryRoot, 'node_modules')
    const temporaryEntry = join(temporaryRoot, 'index.mjs')
    const vue2Runtime = fileURLToPath(new URL('../node_modules/vue2', import.meta.url))

    await mkdir(temporaryNodeModules)
    const temporaryVue2Runtime = join(temporaryNodeModules, 'vue')
    await cp(vue2Runtime, temporaryVue2Runtime, {
      dereference: true,
      recursive: true,
    })
    await copyFile(
      fileURLToPath(new URL('../dist/vue2/index.js', import.meta.url)),
      temporaryEntry,
    )

    const entry = await import(pathToFileURL(temporaryEntry).href)
    const vue = await import(pathToFileURL(join(temporaryVue2Runtime, 'dist/vue.runtime.mjs')).href)

    assert.match(vue.version, /^2\.7\./)
    assert.equal(typeof entry.VueVirtualTree.install, 'function')
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})
