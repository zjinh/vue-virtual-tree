// Compare event traces against ae50f54; optional argument selects a source directory.
import './benchmark-performance.mjs'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { root, sourceLoader } from './performance-source-loader.mjs'

const require = createRequire(root + 'package.json')

for (const runtime of ['vue', 'vue2']) {
  const Vue = require(runtime)
  const results = []
  for (const ref of ['ae50f54', undefined]) {
    const load = sourceLoader(ref, process.argv[2] || root, runtime)
    const Tree = load(root + 'src/tree.ts').default
    const host = document.createElement('div')
    document.body.append(host)
    const events = []
    const props = {
      data: Array.from({ length: 300 }, (_, id) => ({ id, label: String(id), children: [] })),
      nodeKey: 'id', height: 520, itemSize: 26,
      showCheckbox: true, checkStrictly: true, defaultExpandAll: true,
    }
    const handler = (data, checked, halfChecked) => events.push([data.id, checked, halfChecked])
    let app, vm
    if (runtime === 'vue') {
      app = Vue.createApp(Tree, { ...props, onCheckChange: handler })
      vm = app.mount(host)
    } else {
      app = new Vue({
        render(h) {
          return h(Tree, { ref: 'tree', props, on: { 'check-change': handler } })
        },
      })
      app.$mount()
      host.append(app.$el)
      vm = app.$refs.tree
    }
    const settle = async () => {
      for (let index = 0; index < 6; index++) await Vue.nextTick()
    }
    await settle()
    const traces = []
    for (const id of [5, 39, 40, 60, 99, 100, 150]) {
      events.length = 0
      vm.setChecked(id, true)
      await settle()
      traces.push({ op: 'select' + id, events: [...events] })
    }
    const beforeArrays = [70, 100, 150].map(id => vm.getNode(id).childNodes)
    events.length = 0
    const el = host.querySelector('section')
    el.scrollTop = 150 * 26
    el.dispatchEvent(new Event('scroll'))
    await settle()
    traces.push({
      op: 'scroll', events: [...events],
      arrayReplaced: [70, 100, 150].map((id, index) => vm.getNode(id).childNodes !== beforeArrays[index]),
    })
    for (const id of [60, 70, 149, 150, 249, 250]) {
      events.length = 0
      vm.setChecked(id, !vm.getNode(id).checked)
      await settle()
      traces.push({ op: 'select' + id, events: [...events] })
    }
    vm.getNode(100).data.children = [{ id: 999, label: 'new' }]
    await settle()
    traces.push({ op: 'children', registered: !!vm.getNode(999) })
    results.push(traces)
    runtime === 'vue' ? app.unmount() : app.$destroy()
    host.remove()
  }
  assert.deepEqual(results[1], results[0])
  console.log(JSON.stringify({ runtime, status: 'passed', traces: results[1] }))
}
