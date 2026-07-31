import { describe, expect, it } from 'vitest'

import TreeStore from '../../src/model/tree-store'
import type Node from '../../src/model/node'

interface Item {
  id: number
  label: string
  disabled?: boolean
  leaf?: boolean
  children?: Item[] | null
}

const baseData = (): Item[] => [
  {
    id: 1,
    label: 'Parent',
    children: [
      { id: 11, label: 'Alpha' },
      { id: 12, label: 'Beta', disabled: true },
    ],
  },
  { id: 2, label: 'Sibling' },
]

const createStore = (overrides: Record<string, unknown> = {}) =>
  new TreeStore<Item>({
    data: baseData(),
    key: 'id',
    props: {
      children: 'children',
      label: 'label',
      disabled: 'disabled',
      isLeaf: 'leaf',
    },
    ...overrides,
  })

const node = (store: TreeStore<Item>, key: number): Node<Item> => {
  const result = store.getNode(key)
  expect(result).not.toBeNull()
  return result as Node<Item>
}

describe('tree construction', () => {
  it('builds the key map and preserves the complete Node parent path', () => {
    const store = createStore()
    const leaf = node(store, 11)

    expect(Object.keys(store.nodesMap).sort()).toEqual(['1', '11', '12', '2'])
    expect(leaf.parent).toBe(node(store, 1))
    expect(leaf.parent?.parent).toBe(store.root)
    expect(store.root.contains(leaf)).toBe(true)
    expect(leaf.nextSibling).toBe(node(store, 12))
    expect(node(store, 12).previousSibling).toBe(leaf)
  })

  it('applies default expansion and checked keys during construction', () => {
    const store = createStore({
      autoExpandParent: true,
      defaultExpandedKeys: [11],
      defaultCheckedKeys: [11],
    })

    expect(node(store, 11).expanded).toBe(true)
    expect(node(store, 1).expanded).toBe(true)
    expect(node(store, 11).checked).toBe(true)
    expect(node(store, 1).checked).toBe(false)
    expect(node(store, 1).indeterminate).toBe(true)
  })
})

describe('checking', () => {
  it('keeps checkStrictly changes local to the requested node', () => {
    const store = createStore({ checkStrictly: true })

    store.setChecked(1, true, true)

    expect(node(store, 1).checked).toBe(true)
    expect(node(store, 11).checked).toBe(false)
    expect(node(store, 12).checked).toBe(false)
  })

  it('cascades through enabled children and reports disabled and half states', () => {
    const store = createStore()

    store.setChecked(1, true, true)

    expect(node(store, 11).checked).toBe(true)
    expect(node(store, 12).checked).toBe(false)
    expect(node(store, 1).checked).toBe(false)
    expect(node(store, 1).indeterminate).toBe(true)
    expect(store.getCheckedKeys()).toEqual([11])
    expect(store.getHalfCheckedKeys()).toEqual([1])
    expect(store.getHalfCheckedNodes().map((item) => item.id)).toEqual([1])
    expect(store.getCheckedNodes(false, true).map((item) => item.id)).toEqual([1, 11])
  })

  it('returns leaf-only selections in selectChildrenOnly mode', () => {
    const store = createStore({ selectChildrenOnly: true })

    store.setChecked(1, true, true)

    expect(store.getSelectedLeafKeys()).toEqual([11])
    expect(store.getSelectedLeafNodes().map((item) => item.id)).toEqual([11])
  })

  it('sets and clears every mapped node with setCheckedAll', () => {
    const store = createStore()
    node(store, 1).indeterminate = true

    store.setCheckedAll()
    expect(store._getAllNodes().every((item) => item.checked && !item.indeterminate)).toBe(true)

    store.setCheckedAll(false)
    expect(store._getAllNodes().every((item) => !item.checked && !item.indeterminate)).toBe(true)
  })
})

describe('visibility and current node', () => {
  it('filters descendants, keeps ancestors visible, and expands matching paths', () => {
    const store = createStore({
      filterNodeMethod: (value: string, data: Item) => data.label.includes(value),
    })

    store.filter('Missing')
    expect(store.root.visible).toBe(false)

    store.filter('Alpha')

    expect(node(store, 11).visible).toBe(true)
    expect(node(store, 12).visible).toBe(false)
    expect(node(store, 1).visible).toBe(true)
    expect(node(store, 2).visible).toBe(false)
    expect(node(store, 1).expanded).toBe(true)
    expect(store.root.visible).toBe(true)
    expect(store.root.expanded).toBe(false)
  })

  it('sets current nodes by key and data, and clears stale current state', () => {
    const store = createStore()

    store.setCurrentNodeKey(11)
    expect(store.getCurrentNode()).toBe(node(store, 11))
    expect(node(store, 11).isCurrent).toBe(true)

    store.setUserCurrentNode(node(store, 2).data)
    expect(node(store, 11).isCurrent).toBe(false)
    expect(store.getCurrentNode()).toBe(node(store, 2))

    store.setCurrentNodeKey(null)
    expect(store.getCurrentNode()).toBeNull()
    expect(node(store, 2).isCurrent).toBe(false)
  })
})

describe('tree mutations', () => {
  it('appends, removes, and inserts before and after while keeping data and map in sync', () => {
    const store = createStore()

    store.append({ id: 13, label: 'Gamma' }, 1)
    store.insertBefore({ id: 10, label: 'Before' }, 11)
    store.insertAfter({ id: 14, label: 'After' }, 13)

    expect(node(store, 1).childNodes.map((item) => item.key)).toEqual([10, 11, 12, 13, 14])
    expect(node(store, 1).data.children?.map((item) => item.id)).toEqual([10, 11, 12, 13, 14])

    store.remove(11)
    expect(store.getNode(11)).toBeNull()
    expect(node(store, 1).childNodes.map((item) => item.key)).toEqual([10, 12, 13, 14])
  })

  it('replaces key children and deregisters the removed subtree', () => {
    const store = createStore()

    store.updateChildren(1, [
      { id: 15, label: 'Replacement', children: [{ id: 151, label: 'Nested' }] },
    ])

    expect(store.getNode(11)).toBeNull()
    expect(store.getNode(12)).toBeNull()
    expect(node(store, 1).childNodes.map((item) => item.key)).toEqual([15])
    expect(node(store, 151).parent).toBe(node(store, 15))
  })

  it('reconciles in-place child data updates without recreating retained Nodes', () => {
    const store = createStore()
    const parent = node(store, 1)
    const retained = node(store, 11)
    parent.data.children = [retained.data, { id: 13, label: 'Gamma' }]

    parent.updateChildren()

    expect(node(store, 11)).toBe(retained)
    expect(store.getNode(12)).toBeNull()
    expect(parent.childNodes.map((item) => item.key)).toEqual([11, 13])
  })
})

describe('lazy loading', () => {
  it('creates root and descendant nodes from each load resolve callback', () => {
    const calls: Array<number | null | undefined> = []
    const store = new TreeStore<Item>({
      data: [],
      key: 'id',
      lazy: true,
      props: { children: 'children', label: 'label', isLeaf: 'leaf' },
      load: (target, resolve) => {
        calls.push(target.key)
        if (target.level === 0) {
          resolve([{ id: 1, label: 'Lazy parent', leaf: false }])
        } else {
          resolve([{ id: 11, label: 'Lazy leaf', leaf: true }])
        }
      },
    })

    expect(calls).toEqual([undefined])
    const lazyParent = node(store, 1)
    expect(lazyParent.loaded).toBe(false)

    lazyParent.expand()

    expect(calls).toEqual([undefined, 1])
    expect(lazyParent.loaded).toBe(true)
    expect(lazyParent.expanded).toBe(true)
    expect(node(store, 11).parent).toBe(lazyParent)
    expect(node(store, 11).isLeaf).toBe(true)
  })
})
