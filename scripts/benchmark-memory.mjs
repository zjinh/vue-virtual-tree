// NODE_ENV=production node scripts/benchmark-memory.mjs [--nodes=50000]
//   [--runs=3] [--baseline=ae50f54 | --baseline-dir=/absolute/source/snapshot]
// Isolated workers measure retained heap, not browser heap or allocation peaks.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import assert from 'node:assert/strict'

import { root, sourceLoader } from './performance-source-loader.mjs'

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [name, ...value] = arg.replace(/^--/, '').split('=')
  return [name, value.join('=')]
}))
const count = Number(args.nodes ?? 50000)
const runs = Number(args.runs ?? 3)
if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(runs) || runs < 1) {
  throw new Error('nodes and runs must be positive integers')
}
if (args.baseline && args['baseline-dir']) throw new Error('Choose one baseline source')

if ('worker' in args) {
  if (!global.gc) throw new Error('Worker requires --expose-gc')
  const require = createRequire(import.meta.url)
  const Vue = require(args.mode === 'vue2' ? 'vue2' : 'vue')
  const load = sourceLoader(args.ref || undefined, args.source || root, args.mode === 'vue2' ? 'vue2' : 'vue')
  const Store = load(path.join(root, 'src/model/tree-store.ts')).default
  const Tree = load(path.join(root, 'src/tree.ts')).default
  // Shape and data are constant across all variants. No input strings or data
  // generator compilation are included in the retained model comparison.
  function generate(n) {
    const nodes = Array.from({ length: n }, (_, id) => ({ id, label: `Node ${id}`, children: [] }))
    for (let i = 1; i < n; i++) nodes[Math.floor((i - 1) / 10)].children.push(nodes[i])
    for (const node of nodes) if (!node.children.length) delete node.children
    return [nodes[0]]
  }
  function heap() {
    for (let i = 0; i < 3; i++) global.gc()
    return process.memoryUsage().heapUsed
  }
  function construct(n) {
    const data = generate(n)
    const store = new Store({ data, key: 'id', defaultExpandAll: true })
    const observed = args.mode === 'vue2' ? Vue.observable(store)
      : args.mode === 'vue3' ? Vue.reactive(store) : store
    const context = { showCheckbox: true, smoothTree: Tree.methods.smoothTree }
    const scope = Vue.effectScope()
    const list = scope.run(() => Vue.computed(() => context.smoothTree.call(context, observed.root.childNodes)))
    assert.equal(list.value.length, n)
    return { data, store, observed, list, scope }
  }
  for (let i = 0; i < 3; i++) {
    const warm = construct(1000)
    warm.scope.stop()
  }
  await Vue.nextTick()
  const start = heap()
  let state = construct(count)
  const active = heap()
  // Ensure all measured objects remain strongly reachable until after GC.
  assert.equal(state.list.value.length, count)
  assert.equal(state.data[0].id, 0)
  state.scope.stop()
  state = null
  await Vue.nextTick()
  // Leave the current job so WeakMap keys and stopped Vue 2 watchers can be
  // collected; an immediate GC inside the same job overstates residuals.
  await new Promise(resolve => setImmediate(resolve))
  const released = heap()
  console.log(JSON.stringify({ retainedMiB: (active - start) / 1048576, residualMiB: (released - start) / 1048576 }))
} else {
  console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, nodes: count, runs, gc: 'three full GCs per sample', scope: 'input + model + reactive observation + computed flatten; excludes DOM', baseline: args.baseline ?? args['baseline-dir'] ?? null }))
  const variants = args.baseline || args['baseline-dir'] ? ['baseline', 'current'] : ['current']
  const script = fileURLToPath(import.meta.url)
  for (const mode of ['raw', 'vue3', 'vue2']) for (const variant of variants) {
    const samples = []
    for (let i = 0; i < runs; i++) {
      const command = ['--expose-gc', script, '--worker', `--mode=${mode}`, `--nodes=${count}`]
      if (variant === 'baseline') command.push(args.baseline ? `--ref=${args.baseline}` : `--source=${path.resolve(args['baseline-dir'])}`)
      const result = spawnSync(process.execPath, command, { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' }, maxBuffer: 1024 * 1024 })
      if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Memory worker failed')
      samples.push(JSON.parse(result.stdout.trim()))
    }
    const median = key => samples.map(sample => sample[key]).sort((a, b) => a - b)[Math.floor(runs / 2)]
    console.log(JSON.stringify({ mode, variant, retainedMiB: median('retainedMiB'), residualMiB: median('residualMiB'), samples }))
  }
}
