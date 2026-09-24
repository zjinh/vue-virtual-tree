import { describe, expect, it } from 'vitest'

import TreeStore from '../../src/model/tree-store'
import Node from '../../src/model/node'
import type { TreeKey } from '../../src/model/util'

interface Item {
  id: number
  label: string
  disabled?: boolean | number | string
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
    expect(store.root!.contains(leaf)).toBe(true)
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

  it('treats a truthy autoExpandParent option as enabled during construction', () => {
    const store = createStore({
      autoExpandParent: 1,
      defaultExpandedKeys: [11],
    })

    expect(node(store, 11).expanded).toBe(true)
    expect(node(store, 1).expanded).toBe(true)
  })

  it('treats a truthy autoExpandParent option as enabled when defaults change', () => {
    const store = createStore({ autoExpandParent: 'enabled' })

    store.setDefaultExpandedKeys([11])

    expect(node(store, 11).expanded).toBe(true)
    expect(node(store, 1).expanded).toBe(true)
  })
})

describe('checking', () => {
  it.each([null, undefined])(
    'skips a registered node whose key is later changed to %s',
    (missingKey) => {
      const store = createStore()
      const target = node(store, 11)
      target.data.id = missingKey as unknown as number

      expect(() => store.setCheckedKeys([2])).not.toThrow()
      expect(node(store, 2).checked).toBe(true)
    },
  )

  it('preserves truthy disabled values read from a mapped data field', () => {
    const store = createStore({
      data: [
        {
          id: 1,
          label: 'Parent',
          children: [{ id: 11, label: 'Locked', disabled: 1 }],
        },
      ],
    })

    expect(node(store, 11).disabled).toBe(1)
    store.setChecked(1, true, true)
    expect(node(store, 11).checked).toBe(false)
  })

  it('preserves truthy disabled values returned by a property function', () => {
    const store = createStore({
      data: [
        {
          id: 1,
          label: 'Parent',
          children: [{ id: 11, label: 'Locked' }],
        },
      ],
      props: {
        children: 'children',
        label: 'label',
        disabled: () => 'locked',
        isLeaf: 'leaf',
      },
    })

    expect(node(store, 11).disabled).toBe('locked')
    store.setChecked(1, true, true)
    expect(node(store, 11).checked).toBe(false)
  })

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
    expect(store.root!.visible).toBe(false)

    store.filter('Alpha')

    expect(node(store, 11).visible).toBe(true)
    expect(node(store, 12).visible).toBe(false)
    expect(node(store, 1).visible).toBe(true)
    expect(node(store, 2).visible).toBe(false)
    expect(node(store, 1).expanded).toBe(true)
    expect(store.root!.visible).toBe(true)
    expect(store.root!.expanded).toBe(false)
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
  it.each(['remove', 'replace', 'updateChildren', 'destroy'] as const)('ignores a pending load after its subtree is invalidated by %s', (operation) => {
    let resolvePending!: (children: Item[]) => void
    const store = createStore({
      data: [], lazy: true,
      load(target: Node<Item>, resolve: (children: Item[]) => void) {
        if (target.level === 0) resolve([{ id: 1, label: 'Parent', leaf: false }])
        else resolvePending = resolve
      },
    })
    const parent = node(store, 1)
    let completed = false
    parent.loadData(() => { completed = true })
    if (operation === 'remove') store.remove(1)
    else if (operation === 'replace') parent.setData({ id: 1, label: 'Replacement', children: [] })
    else if (operation === 'updateChildren') store.updateChildren(1, [{ id: 12, label: 'Replacement' }])
    else store.destroy()
    resolvePending([{ id: 11, label: 'Stale' }])
    expect(store.getNode(11)).toBeNull()
    expect(parent.childNodes.map(({ key }) => key)).toEqual(operation === 'updateChildren' ? [12] : [])
    expect(parent.loading).toBe(false)
    expect(completed).toBe(false)
  })

  it('ignores an initial root load after the store is destroyed', () => {
    let resolvePending!: (children: Item[]) => void
    const store = createStore({
      data: [], lazy: true,
      load(_target: Node<Item>, resolve: (children: Item[]) => void) { resolvePending = resolve },
    })
    const root = store.root!
    store.destroy()
    resolvePending([{ id: 1, label: 'Stale root' }])
    expect(root.childNodes).toEqual([])
    expect(store.nodesMap).toEqual({})
  })

  it('creates root and descendant nodes from each load resolve callback', () => {
    const calls: Array<TreeKey | null | undefined> = []
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

describe('public Node operations', () => {
  it('distinguishes direct children, descendants, self and unrelated nodes', () => {
    const store = createStore()
    const parent = node(store, 1)
    expect(store.root!.contains(node(store, 11), false)).toBe(false)
    expect(store.root!.contains(node(store, 11), true)).toBe(true)
    expect(parent.contains(node(store, 11), false)).toBe(true)
    expect(parent.contains(parent)).toBe(false)
    expect(parent.contains(node(store, 2))).toBe(false)
    expect(parent.previousSibling).toBeNull()
    expect(node(store, 2).nextSibling).toBeUndefined()
    expect(store.root!.previousSibling).toBeNull()
    expect(store.root!.nextSibling).toBeNull()
  })

  it('inserts child options or an existing Node at explicit and implicit positions', () => {
    const store = createStore({ data: [{ id: 1, label: 'Parent' }] })
    const parent = node(store, 1)
    parent.insertChild({ data: { id: 11, label: 'Last' } }, -1)
    parent.insertBefore({ data: { id: 10, label: 'First' } }, node(store, 11))
    parent.insertAfter({ data: { id: 12, label: 'Middle' } }, node(store, 10))
    parent.insertBefore({ data: { id: 13, label: 'Append before without reference' } })
    parent.insertAfter({ data: { id: 14, label: 'Append after without reference' } })
    const existing = new Node<Item>({ data: { id: 15, label: 'Existing' }, store })
    parent.insertChild(existing)

    expect(parent.childNodes.map(({ key }) => key)).toEqual([10, 12, 11, 13, 14, 15])
    expect(parent.data.children?.map(({ id }) => id)).toEqual([10, 12, 11, 13, 14, 15])
    expect(parent.isLeaf).toBe(false)
    expect(existing.level).toBe(2)
    expect(existing.parent).toBe(parent)
    parent.updateChildren()
    expect(node(store, 15)).toBe(existing)
  })

  it('reattaches a removed Node subtree with its registrations and descendant levels', () => {
    const store = createStore()
    const branch = node(store, 1)
    const leaf = node(store, 11)
    branch.remove()
    const destination = node(store, 2)
    destination.insertChild(branch)
    expect(destination.data.children).toEqual([branch.data])
    expect(branch.parent).toBe(destination)
    expect(branch.level).toBe(2)
    expect(leaf.level).toBe(3)
    expect(node(store, 1)).toBe(branch)
    expect(node(store, 11)).toBe(leaf)
    destination.updateChildren()
    expect(destination.childNodes).toEqual([branch])
  })

  it('constructs a detached subtree and attaches it through insertChild', () => {
    const store = createStore()
    const branch = new Node<Item>({
      data: { id: 3, label: 'Detached', children: [{ id: 31, label: 'Leaf' }] }, store,
    })
    const destination = node(store, 2)
    destination.insertChild(branch)
    expect(branch.parent).toBe(destination)
    expect(destination.data.children).toEqual([branch.data])
    expect(node(store, 31).level).toBe(3)
    expect(node(store, 31).parent).toBe(branch)
  })

  it('transfers subtree ownership and registrations when inserting a Node from another store', () => {
    const source = createStore({ currentNodeKey: 11 })
    const destination = createStore({ data: [{ id: 3, label: 'Destination' }] })
    const branch = node(source, 1)
    const leaf = node(source, 11)
    node(destination, 3).insertChild(branch)
    expect(source.getNode(1)).toBeNull()
    expect(source.getNode(11)).toBeNull()
    expect(source.getCurrentNode()).toBeNull()
    expect(source.data?.map(({ id }) => id)).toEqual([2])
    expect(node(destination, 1)).toBe(branch)
    expect(node(destination, 11)).toBe(leaf)
    expect(branch.store).toBe(destination)
    expect(leaf.store).toBe(destination)
    expect(leaf.level).toBe(3)
    expect(leaf.isCurrent).toBe(false)
  })

  it('recalculates leaf state when adopting a Node from a lazy store', () => {
    const source = createStore({
      data: [], lazy: true,
      load(_target: Node<Item>, resolve: (children: Item[]) => void) {
        resolve([{ id: 3, label: 'Unloaded', leaf: false }])
      },
    })
    const destination = createStore()
    const branch = node(source, 3)
    expect(branch.isLeaf).toBe(false)
    node(destination, 2).insertChild(branch)
    expect(branch.isLeaf).toBe(true)
  })

  it('moves existing Nodes without duplicating them or clearing same-store selection', () => {
    const store = createStore({ currentNodeKey: 11 })
    const branch = node(store, 1)
    const alpha = node(store, 11)
    const beta = node(store, 12)
    branch.insertAfter(alpha, beta)
    expect(branch.childNodes).toEqual([beta, alpha])
    expect(branch.data.children).toEqual([beta.data, alpha.data])
    const destination = node(store, 2)
    destination.insertChild(branch)
    expect(store.data).toEqual([destination.data])
    expect(store.root!.childNodes).toEqual([destination])
    expect(branch.parent).toBe(destination)
    expect(alpha.level).toBe(3)
    expect(store.getCurrentNode()).toBe(alpha)
    expect(alpha.isCurrent).toBe(true)
    expect(() => branch.insertChild(destination)).toThrow(/ancestor|itself/)
    expect(() => branch.insertChild(branch)).toThrow(/ancestor|itself/)
  })

  it('removes by identity or Node and deregisters the subtree while repairing leaf state', () => {
    const store = createStore({ data: [{ id: 1, label: 'Parent', children: [
      { id: 11, label: 'Branch', children: [{ id: 111, label: 'Leaf' }] },
      { id: 12, label: 'Other' },
    ] }] })
    const parent = node(store, 1)
    const branch = node(store, 11)
    parent.removeChildByData({ id: 11, label: 'Same key, different identity' })
    expect(parent.childNodes).toHaveLength(2)
    branch.remove()
    expect(branch.parent).toBeNull()
    expect(store.getNode(11)).toBeNull()
    expect(store.getNode(111)).toBeNull()
    parent.removeChildByData(node(store, 12).data)
    expect(parent.childNodes).toEqual([])
    expect(parent.data.children).toEqual([])
    expect(parent.isLeaf).toBe(true)
    parent.removeChild(branch)
    expect(parent.childNodes).toEqual([])
    expect(() => store.root!.remove()).not.toThrow()
  })

  it('initializes missing or null child arrays only when requested', () => {
    const store = createStore()
    const leaf = node(store, 2)
    expect(leaf.getChildren()).toBeNull()
    expect(leaf.data.children).toBeNull()
    expect(leaf.getChildren(true)).toEqual([])
    const children = leaf.getChildren(true)!
    expect(leaf.getChildren()).toBe(children)
    expect(store.root!.getChildren()).toBe(store.data)
  })

  it('sets checked half-state locally in strict mode and clears it with a boolean', () => {
    const store = createStore({ checkStrictly: true })
    const target = node(store, 1)
    target.setChecked('half', true)
    expect(target.checked).toBe(false)
    expect(target.indeterminate).toBe(true)
    expect(node(store, 11).checked).toBe(false)
    target.setChecked(true)
    expect(target.checked).toBe(true)
    expect(target.indeterminate).toBe(false)
  })

  it('expands ancestors before calling back and collapses only the requested node', () => {
    const store = createStore()
    const leaf = node(store, 11)
    let stateAtCallback: boolean[] | undefined
    leaf.expand(() => {
      stateAtCallback = [leaf.expanded, node(store, 1).expanded, store.root!.expanded]
    }, true)
    expect(stateAtCallback).toEqual([true, true, false])
    leaf.collapse()
    expect(leaf.expanded).toBe(false)
    expect(node(store, 1).expanded).toBe(true)
    expect(leaf.shouldLoadData()).toBe(false)
  })

  it('creates children with explicit defaults without mutating the source children array', () => {
    const store = createStore({ data: [{ id: 1, label: 'Parent', children: [] }] })
    const parent = node(store, 1)
    parent.doCreateChildren([{ id: 11, label: 'Created' }], {
      checked: true, indeterminate: false, expanded: true, visible: false,
    })
    expect(node(store, 11)).toMatchObject({
      checked: true, indeterminate: false, expanded: true, visible: false, level: 2,
    })
    expect(node(store, 11).parent).toBe(parent)
    expect(parent.data.children).toEqual([])
    expect(parent.isLeaf).toBe(false)
  })

  it('updates leaf state after lazy loading overrides an initial user leaf hint', () => {
    let resolveChild: ((children: Item[]) => void) | undefined
    const store = createStore({
      data: [], lazy: true,
      load(target: Node<Item>, resolve: (children: Item[]) => void) {
        if (target.level === 0) resolve([{ id: 1, label: 'Maybe branch', leaf: false }])
        else resolveChild = resolve
      },
    })
    const parent = node(store, 1)
    expect(parent.isLeaf).toBe(false)
    expect(parent.shouldLoadData()).toBe(true)
    let completed: Item[] | undefined
    parent.loadData((children) => { completed = children })
    expect(parent.loading).toBe(true)
    expect(parent.loaded).toBe(false)
    resolveChild!([])
    expect(completed).toEqual([])
    expect(parent.loading).toBe(false)
    expect(parent.loaded).toBe(true)
    expect(parent.isLeaf).toBe(true)
    expect(parent.shouldLoadData()).toBe(false)
    completed = [{ id: 99, label: 'Sentinel' }]
    parent.loadData((children) => { completed = children })
    expect(completed).toBeUndefined()
  })

  it('propagates loadData defaults to children and calls back after registration', () => {
    const store = createStore({
      data: [], lazy: true,
      load(target: Node<Item>, resolve: (children: Item[]) => void) {
        resolve(target.level === 0
          ? [{ id: 1, label: 'Lazy branch', leaf: false }]
          : [{ id: 11, label: 'Loaded leaf', leaf: true }])
      },
    })
    const parent = node(store, 1)
    let callbackNode: Node<Item> | null = null
    parent.loadData(() => { callbackNode = store.getNode(11) }, { checked: true })
    expect(callbackNode).toBe(node(store, 11))
    expect(node(store, 11).checked).toBe(true)
    expect(parent.loaded).toBe(true)
    expect(parent.isLeaf).toBe(false)
  })
})

describe('public TreeStore operations', () => {
  it('looks up key, data and Node references and returns null for unknown keys', () => {
    const store = createStore()
    const target = node(store, 11)
    expect(store.getNode(target)).toBe(target)
    expect(store.getNode(target.data)).toBe(target)
    expect(store.getNode(999)).toBeNull()
    expect(store.getNode({ id: 999, label: 'Missing' })).toBeNull()
  })

  it('sets and replaces checked nodes with leafOnly and ignores missing checked keys', () => {
    const store = createStore({ data: [
      { id: 1, label: 'Parent', children: [{ id: 11, label: 'Alpha' }, { id: 12, label: 'Beta' }] },
      { id: 2, label: 'Sibling' },
    ] })
    store.setCheckedNodes([node(store, 1).data], true)
    expect(store.getCheckedKeys()).toEqual([11, 12])
    expect(store.getCheckedNodes(true).map(({ id }) => id)).toEqual([11, 12])
    store.setCheckedKeys([2, 999])
    expect(store.getCheckedKeys()).toEqual([2])
    expect(store.getSelectedLeafKeys()).toEqual([2])
    expect(store.getSelectedLeafNodes().map(({ id }) => id)).toEqual([2])
    store.setCheckedKeys([])
    expect(store.getCheckedNodes()).toEqual([])
    expect(store.getHalfCheckedNodes()).toEqual([])
  })

  it('reconciles an in-place root array while retaining unchanged nodes', () => {
    const data = baseData()
    const store = createStore({ data })
    const retained = node(store, 1)
    data.splice(1, 1, { id: 3, label: 'New sibling' })
    store.setData(data)
    expect(node(store, 1)).toBe(retained)
    expect(store.root!.childNodes.map(({ key }) => key)).toEqual([1, 3])
    expect(store.getNode(2)).toBeNull()
    expect(node(store, 3).parent).toBe(store.root)
  })

  it('uses Node selection, ignores missing current keys, and clears null or undefined', () => {
    const store = createStore()
    store.setCurrentNode(node(store, 1))
    store.setCurrentNodeKey(999)
    expect(store.getCurrentNode()).toBe(node(store, 1))
    store.setCurrentNodeKey(undefined)
    expect(store.getCurrentNode()).toBeNull()
    expect(node(store, 1).isCurrent).toBe(false)
    store.setDefaultExpandedKeys(null)
    store.setDefaultExpandedKeys([999])
    expect(node(store, 1).expanded).toBe(false)
  })

  it('destroy clears owned model state and can be repeated safely', () => {
    const store = createStore({ currentNodeKey: 11, defaultCheckedKeys: [11] })
    const previous = node(store, 11)
    store.destroy()
    expect(previous.isCurrent).toBe(false)
    expect(store.getCurrentNode()).toBeNull()
    expect(store.currentNodeKey).toBeNull()
    expect(store.data).toBeNull()
    expect(store.root).toBeNull()
    expect(store.nodesMap).toEqual({})
    expect(store.getNode(11)).toBeNull()
    expect(store.getCheckedNodes()).toEqual([])
    expect(store.getHalfCheckedNodes()).toEqual([])
    expect(store.getSelectedLeafNodes()).toEqual([])
    expect(() => store.destroy()).not.toThrow()
  })
})

describe('model boundary regressions', () => {
  it('replaces raw children on a lazy node even before model children have loaded', () => {
    const store = createStore({
      data: [], lazy: true,
      load(_target: Node<Item>, resolve: (children: Item[]) => void) {
        resolve([{ id: 1, label: 'Parent', leaf: false, children: [{ id: 11, label: 'Old' }] }])
      },
    })
    const parent = node(store, 1)
    expect(parent.childNodes).toEqual([])
    store.updateChildren(1, [{ id: 12, label: 'Replacement' }])
    parent.updateChildren()
    expect(parent.data.children?.map(({ id }) => id)).toEqual([12])
    expect(parent.childNodes.map(({ key }) => key)).toEqual([12])
    expect(store.getNode(11)).toBeNull()
  })

  it('accepts the existing children array as the updateChildren input without losing data', () => {
    const store = createStore()
    const parent = node(store, 1)
    const children = parent.data.children!
    store.updateChildren(1, children)
    expect(children.map(({ id }) => id)).toEqual([11, 12])
    expect(parent.childNodes.map(({ key }) => key)).toEqual([11, 12])
    expect(node(store, 11).parent).toBe(parent)
  })

  it('detaches replaced child references so they cannot remove their replacements', () => {
    const store = createStore()
    const parent = node(store, 1)
    const oldChild = node(store, 11)
    store.updateChildren(1, parent.data.children!)
    const replacement = node(store, 11)
    expect(replacement).not.toBe(oldChild)
    expect(oldChild.parent).toBeNull()
    oldChild.remove()
    parent.removeChild(oldChild)
    parent.updateChildren()
    expect(node(store, 11)).toBe(replacement)
    expect(parent.data.children?.map(({ id }) => id)).toEqual([11, 12])
  })

  it.each([1, 3])('keeps Node.setData registered and synchronized with its parent for key %s', (key) => {
    const store = createStore({ currentNodeKey: 1 })
    const parent = node(store, 1)
    const replacement = { id: key, label: 'Replacement', children: [{ id: 13, label: 'New leaf' }] }
    parent.setData(replacement)
    expect(store.data![0]).toBe(replacement)
    expect(node(store, key)).toBe(parent)
    if (key !== 1) expect(store.getNode(1)).toBeNull()
    expect(store.getCurrentNode()).toBe(parent)
    store.append({ id: 4, label: 'Trigger root update' })
    store.root!.updateChildren()
    expect(node(store, key)).toBe(parent)
    expect(parent.label).toBe('Replacement')
    expect(node(store, 13).parent).toBe(parent)
    expect(store.getNode(11)).toBeNull()
  })

  it.each([
    ['append', [11, 12, 13]],
    ['insertBefore', [11, 13, 12]],
    ['insertAfter', [11, 13, 12]],
  ] as const)('preserves loaded lazy child order after %s and children reconciliation', (operation, expected) => {
    const store = createStore({
      data: [], lazy: true,
      load(target: Node<Item>, resolve: (children: Item[]) => void) {
        resolve(target.level === 0
          ? [{ id: 1, label: 'Lazy parent', children: [], leaf: false }]
          : [{ id: 11, label: 'A', leaf: true }, { id: 12, label: 'B', leaf: true }])
      },
    })
    const parent = node(store, 1)
    parent.loadData()
    const alpha = node(store, 11)
    const beta = node(store, 12)
    expect(parent.data.children).toEqual([])
    const child = { id: 13, label: 'C', leaf: true }
    if (operation === 'append') store.append(child, 1)
    else if (operation === 'insertBefore') store.insertBefore(child, 12)
    else store.insertAfter(child, 11)
    expect(parent.childNodes.map(({ key }) => key)).toEqual(expected)

    parent.updateChildren()
    expect(parent.childNodes.map(({ key }) => key)).toEqual(expected)
    expect(store.getNode(11)).toBe(alpha)
    expect(store.getNode(12)).toBe(beta)
    expect(node(store, 13).parent).toBe(parent)
    parent.updateChildren()
    expect(parent.childNodes.map(({ key }) => key)).toEqual(expected)
  })

  it('appends to a zero-valued parent key rather than the root', () => {
    const store = createStore({ data: [{ id: 0, label: 'Zero parent' }] })
    store.append({ id: 1, label: 'Child' }, 0)
    expect(node(store, 1).parent).toBe(node(store, 0))
    expect(store.root!.childNodes.map(({ key }) => key)).toEqual([0])
    expect(node(store, 0).data.children?.map(({ id }) => id)).toEqual([1])
  })

  it('replacing all data clears stale keys and current state and exposes the new data', () => {
    const store = createStore({ currentNodeKey: 11 })
    const oldCurrent = node(store, 11)
    const replacement = [{ id: 3, label: 'New root' }]
    store.setData(replacement)
    expect(store.getNode(1)).toBeNull()
    expect(store.getNode(11)).toBeNull()
    expect(store.getNode(2)).toBeNull()
    expect(store.getCurrentNode()).toBeNull()
    expect(oldCurrent.isCurrent).toBe(false)
    expect(store.data).toBe(replacement)
    expect(store.root!.childNodes.map(({ key }) => key)).toEqual([3])
  })

  it('removing an ancestor clears a current descendant instead of retaining a detached selection', () => {
    const store = createStore({ currentNodeKey: 11 })
    const current = node(store, 11)
    store.remove(1)
    expect(store.getNode(11)).toBeNull()
    expect(store.getCurrentNode()).toBeNull()
    expect(current.isCurrent).toBe(false)
  })

  it('reorders retained children to match the externally reordered data array', () => {
    const store = createStore()
    const parent = node(store, 1)
    const alpha = node(store, 11)
    const beta = node(store, 12)
    parent.data.children = [beta.data, alpha.data]
    parent.updateChildren()
    expect(parent.childNodes).toEqual([beta, alpha])
    expect(parent.childNodes[0].nextSibling).toBe(alpha)
    expect(store.getNode(11)).toBe(alpha)
  })

  it('Node.setData removes old child registrations before replacing descendants', () => {
    const store = createStore()
    const parent = node(store, 1)
    parent.setData({ id: 1, label: 'Replacement', children: [{ id: 13, label: 'New leaf' }] })
    expect(store.getNode(11)).toBeNull()
    expect(store.getNode(12)).toBeNull()
    expect(parent.childNodes.map(({ key }) => key)).toEqual([13])
    expect(node(store, 13).parent).toBe(parent)
    parent.setData({ id: 1, label: 'Now a leaf', children: [] })
    expect(store.getNode(13)).toBeNull()
    expect(parent.isLeaf).toBe(true)
  })

  it('removing the current node clears its retained isCurrent flag', () => {
    const store = createStore({ currentNodeKey: 11 })
    const current = node(store, 11)
    store.remove(11)
    expect(store.getCurrentNode()).toBeNull()
    expect(current.isCurrent).toBe(false)
  })
})
