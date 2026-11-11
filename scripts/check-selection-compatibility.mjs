// node scripts/check-selection-compatibility.mjs ae50f54
import assert from 'node:assert/strict'
import { root, sourceLoader } from './performance-source-loader.mjs'
const baseline = process.argv[2]
if (!baseline) throw new Error('Pass the baseline Git revision')
const Before = sourceLoader(baseline)(root + '/src/model/tree-store.ts').default
const After = sourceLoader()(root + '/src/model/tree-store.ts').default
let seed = 31
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const snapshot = store => Object.values(store.nodesMap).map(node => [
  node.key, node.checked, node.indeterminate, node.loaded, node.loading,
])
let comparisons = 0
for (let trial = 0; trial < 500; trial++) {
  const nodes = Array.from({ length: 15 }, (_, id) => ({ id, disabled: random() < .25, children: [] }))
  for (let i = 1; i < nodes.length; i++) nodes[Math.floor(random() * i)].children.push(nodes[i])
  const options = { key: 'id', checkStrictly: random() < .3, selectChildrenOnly: random() < .3, checkDescendants: random() < .5 }
  const before = new Before({ ...options, data: structuredClone([nodes[0]]) })
  const after = new After({ ...options, data: structuredClone([nodes[0]]) })
  for (let step = 0; step < 8; step++) {
    const key = Math.floor(random() * 15), checked = random() < .5, deep = random() < .5
    before.setChecked(key, checked, deep); after.setChecked(key, checked, deep)
    const keys = nodes.filter(() => random() < .2).map(node => random() < .5 ? String(node.id) : node.id)
    const leafOnly = random() < .5
    before.setCheckedKeys(keys, leafOnly); after.setCheckedKeys(keys, leafOnly)
    assert.deepEqual(snapshot(after), snapshot(before), `trial ${trial}, step ${step}`)
    comparisons++
  }
}
for (const checkStrictly of [false, true]) for (const selectChildrenOnly of [false, true]) {
  for (const checkDescendants of [false, true]) for (const deferred of [false, true]) {
    function create(Store) {
      const calls = [], pending = []
      const store = new Store({ data: [], key: 'id', lazy: true, checkStrictly, selectChildrenOnly, checkDescendants, props: { isLeaf: 'leaf' },
        load(node, resolve) {
          calls.push(node.key ?? 'root')
          const children = node.level === 0 ? [{ id: 1 }, { id: 2, leaf: true }]
            : node.level === 1 ? [{ id: 11, leaf: true }, { id: 12, leaf: true, disabled: true }] : []
          const finish = () => resolve(structuredClone(children))
          if (deferred && node.level > 0) pending.push(finish)
          else finish()
        },
      })
      return { store, calls, pending }
    }
    const before = create(Before), after = create(After)
    for (const keys of [[1], [11, 2], [], [2], [1, 11]]) {
      before.store.setCheckedKeys(keys); after.store.setCheckedKeys(keys)
      assert.deepEqual(snapshot(after.store), snapshot(before.store))
      assert.deepEqual(after.calls, before.calls)
      while (before.pending.length || after.pending.length) {
        assert.equal(after.pending.length, before.pending.length)
        before.pending.shift()(); after.pending.shift()()
        assert.deepEqual(snapshot(after.store), snapshot(before.store))
        assert.deepEqual(after.calls, before.calls)
      }
      comparisons++
    }
  }
}
console.log(JSON.stringify({ baseline, comparisons, status: 'passed' }))
