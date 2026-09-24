import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const artifactPaths = ['index.d.ts', 'index.js', 'style.css']

async function readDist(path) {
  return readFile(new URL(`dist/${path}`, root), 'utf8')
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...await listFiles(join(directory, entry.name), relativePath))
    } else {
      files.push(relativePath)
    }
  }

  return files
}

test('emits only the allowlisted package artifacts', async () => {
  assert.deepEqual(
    await listFiles(fileURLToPath(new URL('../dist/', import.meta.url))),
    artifactPaths,
  )
})

test('emits one ESM entry with Vue as its only external dependency', async () => {
  const output = await readDist('index.js')
  const dependencies = Array.from(
    output.matchAll(/\bfrom\s+["']([^"']+)["']/g),
    (match) => match[1],
  )

  assert.deepEqual([...new Set(dependencies)], ['vue'])
  assert.match(output, /export\s*\{[^}]*VueVirtualTree/)
  assert.doesNotMatch(output, /\b(?:require|import)\s*\(/)
  assert.doesNotMatch(output, /@vue\/runtime-(?:core|dom)/)
  assert.doesNotMatch(output, /__VUE_HMR_RUNTIME__/)
})

test('emits one stylesheet with stable node and checkbox scopes', async () => {
  const publicCss = await readDist('style.css')

  assert.ok(publicCss.length > 0)
  assert.match(publicCss, /\.virtual-tree\s*\{/)
  assert.match(publicCss, /\.virtual-tree-node\[data-v-vvt-node\]/)
  assert.match(publicCss, /\.expand-icon\[data-v-vvt-node\]/)
  assert.match(publicCss, /\.checkbox-wrapper\[data-v-vvt-checkbox\]/)
  assert.match(publicCss, /\.checkbox\[data-v-vvt-checkbox\]/)
  assert.equal((publicCss.match(/\.virtual-tree\s*\{/g) ?? []).length, 1)
})

test('consecutive builds emit byte-identical artifacts', async () => {
  const run = promisify(execFile)
  const pnpmCli = process.env.npm_execpath
  assert.ok(pnpmCli, 'npm_execpath must point to the pnpm JavaScript CLI')
  const snapshot = async () => {
    assert.deepEqual(await listFiles(fileURLToPath(new URL('dist/', root))), artifactPaths)
    return Promise.all(artifactPaths.map(async (path) => (
      createHash('sha256').update(await readDist(path)).digest('hex')
    )))
  }

  await run(process.execPath, [pnpmCli, 'run', 'build'], { cwd: fileURLToPath(root) })
  const firstBuild = await snapshot()
  await run(process.execPath, [pnpmCli, 'run', 'build'], { cwd: fileURLToPath(root) })

  assert.deepEqual(await snapshot(), firstBuild)
})

test('emits a public declaration contract', async () => {
  const declarations = await readDist('index.d.ts')

  assert.match(declarations, /VueVirtualTree/)
  assert.match(declarations, /install/)
  assert.match(declarations, /export default/)
})

test('root entry exposes the public API and rejects removed version subpaths', async () => {
  const [entry, direct] = await Promise.all([
    import('@zjinh/vue-virtual-tree'),
    import(new URL('../dist/index.js', import.meta.url)),
  ])

  assert.equal(direct, entry)
  for (const path of ['vue2', 'vue3']) {
    await assert.rejects(import(`@zjinh/vue-virtual-tree/${path}`), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' })
  }
  assert.deepEqual(Object.keys(entry).sort(), ['Node', 'TreeStore', 'VueVirtualTree', 'default'])
  assert.equal(entry.default, entry.VueVirtualTree)
  assert.equal(typeof entry.VueVirtualTree.install, 'function')
  assert.equal(typeof entry.Node, 'function')
  assert.equal(typeof entry.TreeStore, 'function')

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
})
