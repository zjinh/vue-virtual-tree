// NODE_ENV=production node scripts/benchmark-scroll.mjs
// jsdom: update latency and work counts, not browser painting.
import './benchmark-performance.mjs'
import { createRequire } from 'node:module'
import { root, sourceLoader } from './performance-source-loader.mjs'

const require = createRequire(root + 'package.json')
const Vue = require('vue')

for (const buffer of [1, 4]) {
  const load = sourceLoader()
  const Tree = load(root + 'src/tree.ts').default
  const render = Tree.render
  Tree.render = function (...args) {
    const vnode = render.apply(this, args)
    if (vnode.props && 'bufferScale' in vnode.props) vnode.props.bufferScale = buffer
    return vnode
  }
  const Node = load(root + 'src/model/node.ts').default
  const generate = load(root + 'examples/shared/data.ts').generateTreeData
  let calls = 0, childTime = 0, flattenCalls = 0, flattenTime = 0
  const update = Node.prototype.updateChildren
  Node.prototype.updateChildren = function (...args) {
    const start = performance.now()
    calls++
    try {
      return update.apply(this, args)
    } finally {
      childTime += performance.now() - start
    }
  }
  const flatten = Tree.methods.smoothTree
  Tree.methods.smoothTree = function (...args) {
    const start = performance.now()
    flattenCalls++
    try {
      return flatten.apply(this, args)
    } finally {
      flattenTime += performance.now() - start
    }
  }
  const host = document.createElement('div')
  document.body.append(host)
  const app = Vue.createApp(Tree, {
    data: generate(50000), nodeKey: 'id', height: 520, itemSize: 26,
    showCheckbox: true, defaultExpandAll: true,
  })
  app.mount(host)
  await Vue.nextTick()
  await Vue.nextTick()
  const el = host.querySelector('section')
  const samples = []
  for (const index of [100, 5000, 12000, 25000, 40000, 100]) {
    calls = childTime = flattenCalls = flattenTime = 0
    const start = performance.now()
    el.scrollTop = index * 26
    el.dispatchEvent(new Event('scroll'))
    await Vue.nextTick()
    await Vue.nextTick()
    samples.push({
      index, ms: performance.now() - start, calls, childTime, flattenCalls, flattenTime,
      rows: host.querySelectorAll('.virtual-tree-node').length,
    })
  }
  console.log(JSON.stringify({ buffer, samples }))
  app.unmount()
  host.remove()
}
