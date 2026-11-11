// Run with NODE_ENV=production node scripts/benchmark-performance.mjs [baseline-ref].
// Source transformation happens in memory; no worktree/build files are changed.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { root, sourceLoader } from './performance-source-loader.mjs'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true })
for (const name of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'Event', 'HTMLInputElement']) {
  globalThis[name] = dom.window[name]
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} }
for (const name of ['clientHeight', 'offsetHeight']) Object.defineProperty(HTMLElement.prototype, name, {
  configurable: true, get() { return Number.parseFloat(this.style.height) || 520 },
})
for (const name of ['clientWidth', 'scrollWidth']) Object.defineProperty(HTMLElement.prototype, name, {
  configurable: true, get() { return 640 },
})
const Vue = require('vue')

const current = sourceLoader()
const { generateTreeData } = current(path.join(root, 'examples/shared/data.ts'))
const flat = n => Array.from({ length: n }, (_, id) => ({ id, label: `Node ${id}` }))
const options = (data, extra = {}) => ({ data, key: 'id', ...extra })
async function measure(name, operation) {
  await operation()
  const samples = []
  for (let i = 0; i < 5; i++) {
    const start = performance.now()
    await operation()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  console.log(JSON.stringify({ name, medianMs: samples[2], minMs: samples[0], maxMs: samples[4], samples: 5 }))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
console.log(JSON.stringify({ node: process.version, vue: Vue.version, platform: process.platform, arch: process.arch, mode: process.env.NODE_ENV, baseline: process.argv[2] ?? null }))
const variants = process.argv[2] ? [['baseline', sourceLoader(process.argv[2])], ['current', current]] : [['current', current]]
for (const [name, load] of variants) {
  const Store = load(path.join(root, 'src/model/tree-store.ts')).default
  const Tree = load(path.join(root, 'src/tree.ts')).default
  await measure(`${name}: initialize 100000 siblings incl data generation`, () => new Store(options(flat(100000))))
  const strict = new Store(options(flat(50000), { checkStrictly: true }))
  const keys = Array.from({ length: 5000 }, (_, i) => i * 2)
  await measure(`${name}: strict setCheckedKeys N50000 K5000`, () => strict.setCheckedKeys(keys))
  assert.deepEqual(strict.getCheckedKeys(), keys)
  const wide = new Store(options([{ id: 'p', children: flat(10000) }]))
  await measure(`${name}: cascade setCheckedKeys 10000 siblings K1`, () => wide.setCheckedKeys([0]))
  assert.deepEqual(wide.getCheckedKeys(), [0])
  assert.deepEqual(wide.getHalfCheckedKeys(), ['p'])
  for (const n of [10000, 50000]) {
    const host = document.createElement('div')
    document.body.append(host)
    let event
    const app = Vue.createApp(Tree, { data: generateTreeData(n), nodeKey: 'id', height: 520, itemSize: 26, showCheckbox: true, defaultExpandAll: true, onCheck: (_, state) => { event = state } })
    const vm = app.mount(host)
    await Vue.nextTick(); await Vue.nextTick()
    const leaf = vm.getNode(`node-${n}`)
    await measure(`${name}: component check through nextTick N${n}`, async () => {
      vm.handleCheckChange(leaf, !leaf.checked)
      await Vue.nextTick(); await Vue.nextTick()
    })
    assert.deepEqual(event.checkedKeys, vm.getCheckedKeys())
    app.unmount(); host.remove()
  }
}
dom.window.close()
}
