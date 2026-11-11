// NODE_ENV=production node scripts/benchmark-dom.mjs [baseline-ref]
// Counts actual Vue 3 DOM nodes in jsdom; does not measure layout or paint.
import { createRequire } from 'node:module'
import path from 'node:path'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { root, sourceLoader } from './performance-source-loader.mjs'

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
const Vue = createRequire(import.meta.url)('vue')
const settle = async () => { for (let i = 0; i < 6; i++) await Vue.nextTick() }
const count = 50000
const variants = process.argv[2] ? [['baseline', sourceLoader(process.argv[2])], ['current', sourceLoader()]] : [['current', sourceLoader()]]
console.log(JSON.stringify({ node: process.version, vue: Vue.version, count, height: 520, itemSize: 26, baseline: process.argv[2] ?? null }))
for (const [variant, load] of variants) {
  const Tree = load(path.join(root, 'src/tree.ts')).default
  const bufferScale = load(path.join(root, 'src/components/virtualList.ts')).default.props.bufferScale.default
  for (const showCheckbox of [false, true]) {
    const host = document.createElement('div')
    document.body.append(host)
    const data = Array.from({ length: count }, (_, id) => ({ id, label: `Node ${id}` }))
    const app = Vue.createApp(Tree, { data, nodeKey: 'id', height: 520, itemSize: 26, showCheckbox })
    app.mount(host)
    await settle()
    const scroller = host.querySelector('section')
    assert.ok(scroller)
    for (const [position, index] of [['top', 0], ['middle', 25000], ['bottom', 49980]]) {
      scroller.scrollTop = index * 26
      scroller.dispatchEvent(new Event('scroll'))
      await settle()
      const rows = host.querySelectorAll('.virtual-tree-node')
      assert.equal(rows.length, (position === 'middle' ? 1 + 2 * bufferScale : 1 + bufferScale) * 20)
      const walker = document.createTreeWalker(host, dom.window.NodeFilter.SHOW_ALL)
      let nodes = 0, comments = 0, elements = 0, textNodes = 0
      while (walker.nextNode()) {
        nodes++
        if (walker.currentNode.nodeType === 1) elements++
        if (walker.currentNode.nodeType === 3) textNodes++
        if (walker.currentNode.nodeType === 8) comments++
      }
      console.log(JSON.stringify({ variant, bufferScale, showCheckbox, position, rows: rows.length, nodes, elements, comments, textNodes }))
    }
    app.unmount()
    host.remove()
  }
}
dom.window.close()
