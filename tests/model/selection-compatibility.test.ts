import { describe, expect, it } from 'vitest'
import TreeStore from '../../src/model/tree-store'
import type { TreeStoreOptions } from '../../src/model/tree-store'
import type { TreeKey } from '../../src/model/util'

interface Item { id: number; disabled?: boolean; leaf?: boolean; children?: Item[] }

describe('batch selection compatibility', () => {
  it.each([false, true])('preserves lazy load calls and deferred resolution (deferred: %s)', deferred => {
    for (const checkStrictly of [false, true]) {
      for (const selectChildrenOnly of [false, true]) {
        for (const checkDescendants of [false, true]) {
          const calls: Array<TreeKey | null | undefined> = []
          const pending: Array<() => void> = []
          const store = new TreeStore<Item>({
            data: [], key: 'id', lazy: true, checkStrictly, selectChildrenOnly, checkDescendants,
            props: { isLeaf: 'leaf' },
            load(node, resolve) {
              calls.push(node.key)
              const children = node.level === 0 ? [{ id: 1 }] : node.level === 1 ? [{ id: 11, leaf: true }] : []
              if (deferred && node.level > 0) pending.push(() => resolve(children))
              else resolve(children)
            },
          })
          store.setCheckedKeys([1])
          const loadsDescendants = !checkStrictly && checkDescendants
          expect(calls).toEqual(loadsDescendants ? (deferred ? [undefined, 1, 1] : [undefined, 1, 11]) : [undefined])
          while (pending.length) pending.shift()!()
          expect(store.getCheckedKeys()).toEqual(loadsDescendants ? [1, 11] : [1])
          store.setCheckedKeys([])
          expect(store.getCheckedKeys()).toEqual([])
          expect(store.getHalfCheckedKeys()).toEqual([])
        }
      }
    }
  })

  it.each([
    { options: {}, keys: [1], leafOnly: false, checked: [1, 11, 12], half: [] },
    { options: {}, keys: [1], leafOnly: true, checked: [11, 12], half: [] },
    { options: {}, keys: [11], leafOnly: false, checked: [11], half: [1] },
    { options: { checkStrictly: true }, keys: [1], leafOnly: false, checked: [1], half: [] },
    { options: { selectChildrenOnly: true }, keys: [11], leafOnly: false, checked: [11], half: [] },
  ])('replaces previous selection with $checked', ({ options, keys, leafOnly, checked, half }) => {
    const store = new TreeStore<Item>({
      data: [{ id: 1, children: [{ id: 11 }, { id: 12 }] }, { id: 2 }], key: 'id',
      ...options as Partial<TreeStoreOptions<Item>>,
    })
    store.setCheckedAll(true)
    store.setCheckedKeys(keys as TreeKey[], leafOnly)
    expect(store.getCheckedKeys()).toEqual(checked)
    expect(store.getHalfCheckedKeys()).toEqual(half)
  })
})
