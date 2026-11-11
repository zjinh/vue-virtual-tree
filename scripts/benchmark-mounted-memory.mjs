// NODE_ENV=production node scripts/benchmark-mounted-memory.mjs [baseline-ref]
//   [--collapsed] [--no-checkbox] [--cycles=5]
// Production Vue in jsdom: includes model, observers, mounted rows and DOM.
// This measures Node heap, not browser layout, graphics memory or process RSS.
import './benchmark-performance.mjs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { root, sourceLoader } from './performance-source-loader.mjs'
const require = createRequire(root + 'package.json')
const count = 50000
const collapsed = process.argv.includes('--collapsed')
const showCheckbox = !process.argv.includes('--no-checkbox')
const cycles = Number(process.argv.find(arg => arg.startsWith('--cycles='))?.split('=')[1] ?? 1)
assert.ok(Number.isSafeInteger(cycles) && cycles > 0, 'cycles must be a positive integer')
const heap = () => {
  for (let i = 0; i < 3; i++) global.gc()
  return process.memoryUsage().heapUsed / 1048576
}
if (process.argv[2] === '--worker') {
  assert.equal(typeof global.gc, 'function')
  const runtime = process.argv[3]
  const ref = process.argv[4] || undefined
  const Vue = require(runtime)
  const load = sourceLoader(ref, root, runtime)
  const Tree = load(root + 'src/tree.ts').default
  const generate = load(root + 'examples/shared/data.ts').generateTreeData
  const settle = async () => { for (let i = 0; i < 6; i++) await Vue.nextTick() }
  const mount = n => {
    const host = document.createElement('div')
    document.body.append(host)
    const props = { data: generate(n), nodeKey: 'id', height: 520, itemSize: 26, showCheckbox, defaultExpandAll: !collapsed }
    let app, vm
    if (runtime === 'vue') {
      app = Vue.createApp(Tree, props)
      vm = app.mount(host)
    } else {
      app = new Vue({ render(h) { return h(Tree, { ref: 'tree', props }) } })
      app.$mount()
      host.append(app.$el)
      vm = app.$refs.tree
    }
    return { host, vm, release() {
      runtime === 'vue' ? app.unmount() : app.$destroy()
      host.remove()
    } }
  }
  for (let i = 0; i < 3; i++) {
    const warm = mount(1000)
    await settle()
    warm.release()
  }
  await settle()
  await new Promise(resolve => setImmediate(resolve))
  // Let compilation and warmup frames leave the stack before measuring.
  // Report absolute active/released heaps as well: later GC can release warmup
  // caches and make a delta from this start misleading (notably in Vue 2).
  const start = heap()
  // Walk directly: selector-engine caches can retain the last queried detached
  // subtree and make post-unmount heap look like a component leak.
  const countRows = element => {
    let result = Number(element.classList.contains('virtual-tree-node'))
    for (const child of element.children) result += countRows(child)
    return result
  }
  const lifecycle = []
  for (let cycle = 0; cycle < cycles; cycle++) {
    let state = mount(count)
    await settle()
    assert.ok(state.vm.getNode('node-50000'))
    const rows = countRows(state.host)
    const active = heap()
    state.release()
    state = null
    await settle()
    await new Promise(resolve => setImmediate(resolve))
    const released = heap()
    lifecycle.push({ retainedMiB: active - start, residualMiB: released - start, activeMiB: active, releasedMiB: released, rows })
  }
  console.log(JSON.stringify({ ...lifecycle[lifecycle.length - 1], lifecycle }))
} else {
  const baseline = process.argv.slice(2).find(arg => !arg.startsWith('--'))
  console.log(JSON.stringify({ node: process.version, count, runs: 3, cycles, baseline, collapsed, showCheckbox, scope: 'mounted production tree in jsdom; excludes browser layout and graphics' }))
  for (const runtime of ['vue', 'vue2']) for (const ref of baseline ? [baseline, undefined] : [undefined]) {
    const samples = []
    for (let i = 0; i < 3; i++) {
      const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), '--worker', runtime, ref || '', `--cycles=${cycles}`,
        ...(collapsed ? ['--collapsed'] : []), ...(!showCheckbox ? ['--no-checkbox'] : [])], {
        encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' }, maxBuffer: 1024 * 1024,
      })
      if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Mounted worker failed')
      samples.push(JSON.parse(result.stdout.trim()))
    }
    const median = key => samples.map(sample => sample[key]).sort((a, b) => a - b)[1]
    console.log(JSON.stringify({ runtime, variant: ref || 'current', retainedMiB: median('retainedMiB'), residualMiB: median('residualMiB'), activeMiB: median('activeMiB'), releasedMiB: median('releasedMiB'), samples }))
  }
}
