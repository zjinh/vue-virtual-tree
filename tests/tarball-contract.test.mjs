import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import { releaseTarballPath } from '../scripts/release-tarball.mjs'

const run = promisify(execFile)

function packageJson(version) {
  return JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      '@zjinh/vue-virtual-tree': `file:${releaseTarballPath}`,
      vue: version,
    },
    devDependencies: {
      typescript: '6.0.3',
    },
  }, null, 2)
}

function runtimeFixture(runtime, version) {
  const entrypoints = runtime === 'vue2'
    ? [
        ['@zjinh/vue-virtual-tree/vue2', 'vue2'],
      ]
    : [
        ['@zjinh/vue-virtual-tree', 'default'],
        ['@zjinh/vue-virtual-tree/vue3', 'vue3'],
      ]

  return `
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import * as Vue from 'vue'

assert.equal(Vue.version, '${version}')

for (const specifier of [
  '@zjinh/vue-virtual-tree',
  '@zjinh/vue-virtual-tree/vue2',
  '@zjinh/vue-virtual-tree/vue3',
]) {
  assert.match(import.meta.resolve(specifier), /node_modules/)
}

const cssUrl = import.meta.resolve('@zjinh/vue-virtual-tree/style.css')
assert.match(await readFile(fileURLToPath(cssUrl), 'utf8'), /\.virtual-tree/)

const entrypoints = ${JSON.stringify(entrypoints)}
for (const [specifier, label] of entrypoints) {
  const entry = await import(specifier)
  assert.equal(entry.default, entry.VueVirtualTree, label)
  assert.equal(typeof entry.Node, 'function', label)
  assert.equal(typeof entry.TreeStore, 'function', label)
  assert.equal(typeof entry.VueVirtualTree.install, 'function', label)

  let registration
  entry.VueVirtualTree.install({
    component(name, component) {
      registration = { name, component }
    },
  })
  assert.deepEqual(registration, {
    name: 'VueVirtualTree',
    component: entry.VueVirtualTree,
  }, label)
}
`
}

function typeFixture(runtime) {
  const specifiers = runtime === 'vue2'
    ? ['@zjinh/vue-virtual-tree/vue2']
    : ['@zjinh/vue-virtual-tree', '@zjinh/vue-virtual-tree/vue3']

  return specifiers.map((specifier, index) => `
import Default${index}, {
  VueVirtualTree as Named${index},
  Node as Node${index},
  TreeStore as TreeStore${index},
  type TreeKey as TreeKey${index},
  type VueVirtualTreeProps as Props${index},
} from '${specifier}'

const key${index}: TreeKey${index} = ${index}
const props${index}: Props${index}<{ id: number; label: string }> = {
  data: [{ id: key${index}, label: 'node' }],
  nodeKey: 'id',
  props: { label: 'label' },
}
const store${index} = new TreeStore${index}({ data: props${index}.data ?? [], key: 'id' })
const node${index} = new Node${index}({ data: { id: key${index}, label: 'node' }, store: store${index} })
Default${index}.install({ component: (_name, component) => component })
Named${index}.install({ component: (_name, component) => component })
void node${index}
`).join('\n')
}

function isolatedEnvironment(consumerRoot) {
  const environment = { ...process.env }
  for (const name of Object.keys(environment)) {
    if (/token|_auth/i.test(name)) delete environment[name]
  }
  environment.npm_config_userconfig = join(consumerRoot, '.npmrc')
  return environment
}

async function verifyConsumer(runtime, version) {
  const consumerRoot = await mkdtemp(join(tmpdir(), `vue-virtual-tree-${runtime}-`))

  try {
    await Promise.all([
      writeFile(join(consumerRoot, 'package.json'), packageJson(version)),
      writeFile(join(consumerRoot, '.npmrc'), 'registry=https://registry.npmjs.org/\n'),
      writeFile(join(consumerRoot, 'runtime.mjs'), runtimeFixture(runtime, version)),
      writeFile(join(consumerRoot, 'types.ts'), typeFixture(runtime)),
      writeFile(join(consumerRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          lib: ['ES2020', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2020',
        },
        include: ['types.ts'],
      }, null, 2)),
    ])

    const pnpmCli = process.env.npm_execpath
    assert.ok(pnpmCli, 'npm_execpath must point to the pnpm JavaScript CLI')
    const environment = isolatedEnvironment(consumerRoot)

    await run(process.execPath, [pnpmCli, 'install', '--frozen-lockfile=false', '--ignore-scripts'], {
      cwd: consumerRoot,
      env: environment,
    })
    await run(process.execPath, ['runtime.mjs'], { cwd: consumerRoot, env: environment })
    await run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], {
      cwd: consumerRoot,
      env: environment,
    })
  } finally {
    await rm(consumerRoot, { force: true, recursive: true })
  }
}

test('installs and validates the packed package in isolated Vue 2 and Vue 3 consumers', async () => {
  await access(releaseTarballPath)
  assert.ok((await readFile(releaseTarballPath)).byteLength > 0)

  await verifyConsumer('vue2', '2.7.16')
  await verifyConsumer('vue3', '3.5.40')
})
