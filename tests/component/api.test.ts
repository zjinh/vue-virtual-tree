import { afterEach, describe, expect, test, vi } from 'vitest'
import type { LoadResolve, TreeNode, VueVirtualTreeInstance } from '@zjinh/vue-virtual-tree'
import { buttonData, checkbox, cleanupTrees, fixture, labels, mountTree, row, settle } from './tree-harness'
import type { Item } from './tree-harness'

declare const __VUE_RUNTIME__: 'vue2' | 'vue3'

afterEach(() => {
  cleanupTrees()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe(`${__VUE_RUNTIME__} package root public methods`, () => {
  test('resolves node and full ancestry by key, data, and Node without inventing missing nodes', async () => {
    const { instance } = await mountTree()
    const leaf = instance.getNode(11)!
    expect(leaf.data.label).toBe('Alpha')
    expect(instance.getNode(leaf.data)).toBe(leaf)
    expect(instance.getNode(leaf)).toBe(leaf)
    for (const reference of [11, leaf.data, leaf]) {
      expect(instance.getNodePath(reference).map(({ id }) => id)).toEqual([1, 11])
    }
    expect(instance.getNodePath(1).map(({ id }) => id)).toEqual([1])
    expect(instance.getNode(999)).toBeNull()
    expect(instance.getNodePath(999)).toEqual([])
  })

  test('filters the DOM, expands a matched path, shows the empty text, and restores rows', async () => {
    const { host, instance } = await mountTree({ defaultExpandAll: false, emptyText: 'Nothing found' })
    expect(labels(host)).toEqual(['Parent', 'Sibling'])
    instance.filter('Alpha')
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Alpha'])
    expect(instance.getNode(1)?.expanded).toBe(true)
    instance.filter('Missing')
    await settle()
    expect(host.querySelector('.virtual-tree__empty-text')?.textContent).toBe('Nothing found')
    expect(labels(host)).toEqual([])
    instance.filter('')
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
  })

  test('rejects filtering without a predicate before changing visible rows', async () => {
    const { instance, host } = await mountTree({ filterNodeMethod: undefined })
    expect(() => instance.filter('Alpha')).toThrow(/filterNodeMethod/)
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
  })

  test('sets one leaf using key, data, and Node references and reports checked and half-checked data', async () => {
    const { host, instance } = await mountTree()
    const alpha = instance.getNode(11)!
    instance.setChecked(11, true)
    await settle()
    expect(instance.getCheckedKeys()).toEqual([11])
    expect(instance.getCheckedNodes().map(({ id }) => id)).toEqual([11])
    expect(instance.getHalfCheckedKeys()).toEqual([1])
    expect(instance.getHalfCheckedNodes().map(({ id }) => id)).toEqual([1])
    expect(instance.getCheckedNodes(false, true).map(({ id }) => id)).toEqual([1, 11])
    expect(instance.getCheckedNodes(true, true).map(({ id }) => id)).toEqual([11])
    expect(checkbox(host, 'Alpha').checked).toBe(true)
    expect(checkbox(host, 'Parent').checked).toBe(false)
    expect(checkbox(host, 'Parent').indeterminate).toBe(true)
    instance.setChecked(alpha.data, false)
    instance.setChecked(alpha, true)
    instance.setChecked(999, true)
    expect(instance.getCheckedKeys()).toEqual([11])
    instance.setChecked(alpha, false)
    await settle()
    expect(instance.getHalfCheckedKeys()).toEqual([])
    expect(checkbox(host, 'Parent').indeterminate).toBe(false)
  })

  test('cascades deep checks while preserving disabled leaves and supports shallow checks', async () => {
    const data = fixture()
    data[0].children![1].disabled = true
    const { host, instance } = await mountTree({ data })
    instance.setChecked(1, true, true)
    await settle()
    expect(instance.getCheckedKeys()).toEqual([11])
    expect(instance.getHalfCheckedKeys()).toEqual([1])
    expect(checkbox(host, 'Beta').disabled).toBe(true)
    expect(checkbox(host, 'Beta').checked).toBe(false)
    instance.setCheckedAll(false)
    instance.setChecked(1, true, false)
    await settle()
    expect(instance.getCheckedKeys()).toEqual([1])
    expect(checkbox(host, 'Alpha').checked).toBe(false)
  })

  test('setCheckedNodes replaces selection and leafOnly excludes the selected parent', async () => {
    const { instance, host } = await mountTree()
    instance.setCheckedNodes([instance.getNode(1)!.data], true)
    await settle()
    expect(instance.getCheckedKeys()).toEqual([11, 12])
    expect(instance.getCheckedKeys(true)).toEqual([11, 12])
    expect(instance.getCheckedNodes(true).map(({ id }) => id)).toEqual([11, 12])
    expect(checkbox(host, 'Parent').checked).toBe(false)
    instance.setCheckedNodes([instance.getNode(2)!.data])
    await settle()
    expect(instance.getCheckedKeys()).toEqual([2])
    expect(checkbox(host, 'Sibling').checked).toBe(true)
    expect(checkbox(host, 'Alpha').checked).toBe(false)
    instance.setCheckedNodes([])
    expect(instance.getCheckedNodes()).toEqual([])
  })

  test('setCheckedKeys cascades a parent, ignores missing keys, clears old state, and honors leafOnly', async () => {
    const { instance, host } = await mountTree()
    instance.setCheckedKeys([1, 999])
    await settle()
    expect(instance.getCheckedKeys()).toEqual([1, 11, 12])
    expect(instance.getCheckedKeys(true)).toEqual([11, 12])
    expect(checkbox(host, 'Parent').checked).toBe(true)
    instance.setCheckedKeys([1], true)
    expect(instance.getCheckedKeys()).toEqual([11, 12])
    instance.setCheckedKeys([])
    await settle()
    expect(instance.getCheckedKeys()).toEqual([])
    expect(instance.getHalfCheckedKeys()).toEqual([])
    expect(host.querySelectorAll('input:checked')).toHaveLength(0)
  })

  test('setCheckedAll includes disabled nodes, clears half state, and selected leaf getters omit parents', async () => {
    const data = fixture()
    data[0].children![1].disabled = true
    const { instance, host } = await mountTree({ data })
    instance.setChecked(11, true)
    instance.setCheckedAll()
    await settle()
    expect(instance.getCheckedKeys()).toEqual([1, 11, 12, 2])
    expect(instance.getHalfCheckedNodes()).toEqual([])
    expect(instance.getSelectedLeafKeys()).toEqual([11, 12, 2])
    expect(instance.getSelectedLeafNodes().map(({ id }) => id)).toEqual([11, 12, 2])
    expect(host.querySelectorAll('input:checked')).toHaveLength(4)
    instance.setCheckedAll(false)
    await settle()
    expect(instance.getSelectedLeafNodes()).toEqual([])
    expect(instance.getSelectedLeafKeys()).toEqual([])
    expect(host.querySelectorAll('input:checked')).toHaveLength(0)
  })

  test('moves the current node with data or key, preserves it for an unknown key, and clears with null', async () => {
    const { instance, host } = await mountTree()
    expect(instance.getCurrentKey()).toBeNull()
    expect(instance.getCurrentNode()).toBeNull()
    instance.setCurrentNode(instance.getNode(11)!.data)
    await settle()
    expect(instance.getCurrentNode()?.id).toBe(11)
    expect(instance.getCurrentKey()).toBe(11)
    expect(row(host, 'Alpha').classList.contains('is-current')).toBe(true)
    instance.setCurrentKey(2)
    instance.setCurrentKey(999)
    await settle()
    expect(instance.getCurrentKey()).toBe(2)
    expect(row(host, 'Alpha').classList.contains('is-current')).toBe(false)
    expect(row(host, 'Sibling').classList.contains('is-current')).toBe(true)
    instance.setCurrentKey(null)
    await settle()
    expect(instance.getCurrentNode()).toBeNull()
    expect(host.querySelector('.is-current')).toBeNull()
  })

  test.each([
    ['getNodePath', (tree: VueVirtualTreeInstance<Item>) => tree.getNodePath(1)],
    ['getCurrentKey', (tree: VueVirtualTreeInstance<Item>) => tree.getCurrentKey()],
    ['setCheckedNodes', (tree: VueVirtualTreeInstance<Item>) => tree.setCheckedNodes([])],
    ['setCheckedKeys', (tree: VueVirtualTreeInstance<Item>) => tree.setCheckedKeys([])],
    ['setCurrentNode', (tree: VueVirtualTreeInstance<Item>) => tree.setCurrentNode({ id: 1, label: 'Parent' })],
    ['setCurrentKey', (tree: VueVirtualTreeInstance<Item>) => tree.setCurrentKey(null)],
    ['updateKeyChildren', (tree: VueVirtualTreeInstance<Item>) => tree.updateKeyChildren(1, [])],
  ])('%s requires nodeKey', async (_method, invoke) => {
    const { instance } = await mountTree({ nodeKey: undefined })
    expect(() => invoke(instance)).toThrow(/nodeKey/)
  })

  test('appends at root or to a node, inserts relative siblings, and reflects removal in data and DOM', async () => {
    const { instance, host } = await mountTree()
    instance.append({ id: 3, label: 'Root append' })
    instance.append({ id: 13, label: 'Child append' }, instance.getNode(1)!)
    instance.insertBefore({ id: 10, label: 'Before' }, instance.getNode(11)!.data)
    instance.insertAfter({ id: 14, label: 'After' }, 13)
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Before', 'Alpha', 'Beta', 'Child append', 'After', 'Sibling', 'Root append'])
    expect(instance.getNode(1)?.data.children?.map(({ id }) => id)).toEqual([10, 11, 12, 13, 14])
    instance.setCurrentKey(13)
    instance.remove(instance.getNode(13)!)
    instance.remove(instance.getNode(10)!.data)
    instance.remove(999)
    await settle()
    expect(instance.getNode(13)).toBeNull()
    expect(instance.getCurrentNode()).toBeNull()
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'After', 'Sibling', 'Root append'])
    instance.append({ id: 99, label: 'Missing parent' }, 999)
    expect(instance.getNode(99)).toBeNull()
  })

  test('updateKeyChildren replaces the complete subtree, removes a current descendant, and accepts an empty replacement', async () => {
    const { instance, host } = await mountTree()
    instance.setCurrentKey(11)
    instance.updateKeyChildren(1, [{ id: 13, label: 'Replacement', children: [{ id: 131, label: 'Nested' }] }])
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Replacement', 'Nested', 'Sibling'])
    expect(instance.getNode(11)).toBeNull()
    expect(instance.getNode(12)).toBeNull()
    expect(instance.getCurrentNode()).toBeNull()
    expect(instance.getNodePath(131).map(({ id }) => id)).toEqual([1, 13, 131])
    instance.updateKeyChildren(999, [{ id: 99, label: 'Missing' }])
    expect(instance.getNode(99)).toBeNull()
    instance.updateKeyChildren(1, [])
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Sibling'])
    expect(instance.getNode(1)?.isLeaf).toBe(true)
    expect(instance.getNode(131)).toBeNull()
  })

  test('updateKeyChildren accepts its own data array without erasing the rendered children', async () => {
    const { instance, host } = await mountTree()
    const children = instance.getNode(1)!.data.children!
    instance.updateKeyChildren(1, children)
    await settle()
    expect(children.map(({ id }) => id)).toEqual([11, 12])
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
    expect(instance.getNodePath(11).map(({ id }) => id)).toEqual([1, 11])
  })

  test('Node.setData survives later parent reconciliation and retains its displayed subtree', async () => {
    const { instance, host } = await mountTree()
    const parent = instance.getNode(1)!
    instance.setCurrentKey(1)
    parent.setData({ id: 3, label: 'Replacement', children: [{ id: 13, label: 'New child' }] })
    instance.append({ id: 4, label: 'Appended' })
    parent.parent!.updateChildren()
    await settle()
    expect(instance.getNode(3)).toBe(parent)
    expect(instance.getNode(1)).toBeNull()
    expect(instance.getCurrentKey()).toBe(3)
    expect(labels(host)).toEqual(['Replacement', 'New child', 'Sibling', 'Appended'])
    expect(row(host, 'Replacement').classList.contains('is-current')).toBe(true)
  })

  test('scrollToItem moves the actual viewport to a far item and leaves it unchanged for a missing key', async () => {
    vi.useFakeTimers()
    const { instance, host } = await mountTree({ data: Array.from({ length: 200 }, (_, id) => ({ id, label: `Item ${id}` })), height: 104 })
    const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
    instance.scrollToItem(100, 30, false)
    await settle()
    await vi.runAllTimersAsync()
    expect(scroller.scrollTop).toBe(2600)
    scroller.dispatchEvent(new Event('scroll'))
    await settle()
    await vi.runAllTimersAsync()
    expect(labels(host)).toContain('Item 100')
    expect(labels(host).length).toBeLessThan(100)
    instance.scrollToItem(999)
    await settle()
    expect(scroller.scrollTop).toBe(2600)
    instance.scrollToItem(0, 18, true)
    await settle()
    await vi.runAllTimersAsync()
    expect(scroller.scrollTop).toBe(0)
  })

  test('scrollToItem rejects empty trees and disabled virtual scrolling', async () => {
    const empty = await mountTree({ data: [] })
    const noHeight = await mountTree({ height: 0 })
    expect(() => empty.instance.scrollToItem(1)).toThrow(/virtual scrolling/)
    expect(() => noHeight.instance.scrollToItem(1)).toThrow(/virtual scrolling/)
  })

  test('empty trees return empty selections and accept append after no-op selection mutations', async () => {
    const { instance, host } = await mountTree({ data: [] })
    instance.setCheckedAll()
    instance.setCheckedKeys([])
    instance.setCheckedNodes([])
    instance.setChecked(999, true)
    instance.remove(999)
    instance.updateKeyChildren(999, [])
    expect(instance.getCheckedKeys()).toEqual([])
    expect(instance.getCheckedNodes()).toEqual([])
    expect(instance.getHalfCheckedKeys()).toEqual([])
    expect(instance.getHalfCheckedNodes()).toEqual([])
    expect(instance.getSelectedLeafKeys()).toEqual([])
    expect(instance.getSelectedLeafNodes()).toEqual([])
    expect(instance.getCurrentNode()).toBeNull()
    expect(instance.getCurrentKey()).toBeNull()
    instance.append({ id: 0, label: 'First root' }, null)
    await settle()
    expect(labels(host)).toEqual(['First root'])
    expect(host.querySelector('.virtual-tree__empty-text')).toBeNull()
    instance.setCurrentKey(0)
    expect(instance.getCurrentKey()).toBe(0)
    instance.setCurrentNode(instance.getNode(0)!.data)
    expect(instance.getCurrentNode()?.id).toBe(0)
  })

  test('appends beneath a zero key, retaining the root order and complete path', async () => {
    const { instance, host } = await mountTree({ data: [{ id: 0, label: 'Zero parent' }] })
    instance.append({ id: 1, label: 'Child of zero' }, 0)
    await settle()
    expect(instance.getNodePath(1).map(({ id }) => id)).toEqual([0, 1])
    expect(instance.getNode(1)?.level).toBe(2)
    expect(labels(host)).toEqual(['Zero parent', 'Child of zero'])
  })

  test('removing a selected ancestor clears the selected descendant and its rendered rows', async () => {
    const { instance, host } = await mountTree()
    instance.setCurrentKey(11)
    instance.remove(1)
    await settle()
    expect(labels(host)).toEqual(['Sibling'])
    expect(instance.getNode(11)).toBeNull()
    expect(instance.getCurrentNode()).toBeNull()
    expect(instance.getCurrentKey()).toBeNull()
    expect(host.querySelector('.is-current')).toBeNull()
  })
})

describe(`${__VUE_RUNTIME__} package root events, slots, and props`, () => {
  test('delivers exact node/current/context payloads from DOM actions', async () => {
    const { instance, host, events } = await mountTree()
    const target = row(host, 'Alpha')
    target.click()
    await settle()
    const node = instance.getNode(11)!
    expect(events['node-click']).toHaveLength(1)
    expect(events['node-click'][0]).toEqual([node.data, node, expect.objectContaining({ node })])
    expect(events['current-change']).toEqual([[node.data, node]])
    const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    target.dispatchEvent(context)
    expect(events['node-contextmenu'][0]).toEqual([context, node.data, node, expect.objectContaining({ node })])
  })

  test('checkbox changes emit checked state and check-change without selecting the node', async () => {
    const { instance, host, events } = await mountTree()
    checkbox(host, 'Alpha').click()
    await settle()
    expect(instance.getCheckedKeys()).toEqual([11])
    expect(events.check).toHaveLength(1)
    expect(events.check[0]).toEqual([instance.getNode(11)!.data, {
      checkedKeys: [11], checkedNodes: [instance.getNode(11)!.data],
      halfCheckedKeys: [1], halfCheckedNodes: [instance.getNode(1)!.data],
    }])
    expect(events['check-change']).toContainEqual([instance.getNode(11)!.data, true, false])
    expect(events['check-change']).toContainEqual([instance.getNode(1)!.data, false, true])
    expect(events['node-click']).toBeUndefined()
    expect(events['current-change']).toBeUndefined()
    expect(instance.getCurrentNode()).toBeNull()
  })

  test('expand controls change descendant rows, emit all arguments, and do nothing for leaves', async () => {
    const { instance, host, events } = await mountTree()
    row(host, 'Parent').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    const node = instance.getNode(1)!
    expect(labels(host)).toEqual(['Parent', 'Sibling'])
    expect(events['node-collapse'][0]).toEqual([node.data, node, expect.objectContaining({ node })])
    row(host, 'Parent').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
    expect(events['node-expand'][0]).toEqual([node.data, node, expect.objectContaining({ node })])
    row(host, 'Alpha').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    expect(events['node-expand']).toHaveLength(1)
    expect(events['node-click']).toBeUndefined()
  })

  test('default scoped slot receives the real node, item and working selectChange callback', async () => {
    const scopes: Array<{ node: TreeNode<Item>; item: Item }> = []
    const { host, instance, events } = await mountTree({}, (scope, h) => {
      scopes.push(scope)
      return h('button', buttonData(() => scope.selectChange(!scope.node.checked)), `${scope.item.id}:${scope.node.label}`)
    })
    expect(host.querySelector('.name')).toBeNull()
    expect(host.querySelector('button')?.textContent).toBe('1:Parent')
    expect(scopes.some(({ node, item }) => node === instance.getNode(1) && item === node.data)).toBe(true)
    host.querySelector<HTMLButtonElement>('button')!.click()
    await settle()
    expect(instance.getCheckedKeys()).toEqual([1, 11, 12])
    expect(events.check[0][0]).toBe(instance.getNode(1)!.data)
  })

  test('applies default props, functional labels, indentation, icon and checkbox visibility', async () => {
    const { host, instance, props } = await mountTree({
      defaultExpandAll: false, defaultExpandedKeys: [1], defaultCheckedKeys: [11], currentNodeKey: 2,
      indent: 32, iconClass: 'custom-caret', itemSize: 30, showCheckbox: false,
      props: { children: 'children', label: (data, node) => `${data.label}@${node.level}` },
    })
    expect(labels(host)).toEqual(['Parent@1', 'Alpha@2', 'Beta@2', 'Sibling@1'])
    expect(row(host, 'Alpha@2').querySelector<HTMLElement>('span')?.style.minWidth).toBe('32px')
    expect(host.querySelector('.expand-icon.custom-caret')).not.toBeNull()
    expect(host.querySelector('input[type="checkbox"]')).toBeNull()
    expect(instance.getCurrentKey()).toBe(2)
    expect(instance.getCheckedKeys()).toEqual([11])
    props.showCheckbox = true
    await settle()
    expect(checkbox(host, 'Alpha@2').checked).toBe(true)
  })

  test('watches checked keys, expanded keys and checkStrictly without remounting', async () => {
    const { host, instance, props } = await mountTree({ defaultExpandAll: false })
    const retained = instance.getNode(1)
    props.defaultExpandedKeys = [1]
    props.defaultCheckedKeys = [11]
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
    expect(checkbox(host, 'Alpha').checked).toBe(true)
    instance.setCheckedAll(false)
    props.checkStrictly = true
    await settle()
    checkbox(host, 'Parent').click()
    await settle()
    expect(instance.getCheckedKeys()).toEqual([1])
    expect(checkbox(host, 'Alpha').checked).toBe(false)
    expect(instance.getNode(1)).toBe(retained)
  })

  test('replacing the data prop removes obsolete keys and selection and can show an empty tree', async () => {
    const { host, instance, props } = await mountTree({ currentNodeKey: 11 })
    props.data = [{ id: 3, label: 'Replacement root' }]
    await settle()
    expect(labels(host)).toEqual(['Replacement root'])
    expect(instance.getNode(1)).toBeNull()
    expect(instance.getNode(11)).toBeNull()
    expect(instance.getCurrentNode()).toBeNull()
    props.data = []
    await settle()
    expect(instance.getNode(3)).toBeNull()
    expect(labels(host)).toEqual([])
    expect(host.querySelector('.virtual-tree__empty-text')?.textContent).toBe('暂无数据')
  })

  test('reordering a rendered children array updates DOM order while retaining Node identity', async () => {
    const { host, instance } = await mountTree()
    const alpha = instance.getNode(11)!
    const beta = instance.getNode(12)!
    instance.getNode(1)!.data.children = [beta.data, alpha.data]
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Beta', 'Alpha', 'Sibling'])
    expect(instance.getNode(11)).toBe(alpha)
    expect(instance.getNode(12)).toBe(beta)
  })

  test('selectChildrenOnly supplies selected leaf data and honors disabled descendants', async () => {
    const data = fixture()
    data[0].children![1].disabled = true
    const { instance, host, events } = await mountTree({ data, selectChildrenOnly: true })
    checkbox(host, 'Parent').click()
    await settle()
    expect(instance.getSelectedLeafKeys()).toEqual([11])
    expect(instance.getSelectedLeafNodes()).toEqual([instance.getNode(11)!.data])
    expect(checkbox(host, 'Beta').checked).toBe(false)
    expect(events.check.at(-1)?.[1]).toMatchObject({ selectedLeafKeys: [11], selectedLeafNodes: [instance.getNode(11)!.data] })
    checkbox(host, 'Parent').click()
    await settle()
    expect(instance.getSelectedLeafKeys()).toEqual([])
    expect(events.check.at(-1)?.[1]).toMatchObject({ selectedLeafKeys: [] })
  })

  test('lazy loading shows pending state, resolves visible children once, and restores cached children on expand', async () => {
    const pending = new Map<number, LoadResolve<Item>>()
    const { instance, host } = await mountTree({
      data: [], lazy: true, defaultExpandAll: false,
      load(node, resolve) {
        if (node.level === 0) resolve([{ id: 1, label: 'Lazy parent', leaf: false }])
        else pending.set(node.data.id, resolve)
      },
    })
    expect(labels(host)).toEqual(['Lazy parent'])
    row(host, 'Lazy parent').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    expect(instance.getNode(1)?.loading).toBe(true)
    expect(host.querySelector('.loading-icon')).not.toBeNull()
    pending.get(1)!([{ id: 11, label: 'Loaded child', leaf: true }])
    pending.clear()
    await settle()
    expect(labels(host)).toEqual(['Lazy parent', 'Loaded child'])
    expect(instance.getNode(1)?.loaded).toBe(true)
    expect(instance.getNode(1)?.loading).toBe(false)
    expect(host.querySelector('.loading-icon')).toBeNull()
    row(host, 'Lazy parent').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    expect(labels(host)).toEqual(['Lazy parent'])
    row(host, 'Lazy parent').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    expect(labels(host)).toEqual(['Lazy parent', 'Loaded child'])
    expect(pending.size).toBe(0)
  })

  test('does not revive a removed node when its pending lazy load resolves', async () => {
    let resolvePending!: (children: Item[]) => void
    const { instance, host } = await mountTree({
      data: [], lazy: true, defaultExpandAll: false,
      load(node, resolve) {
        if (node.level === 0) resolve([{ id: 1, label: 'Pending', leaf: false }])
        else resolvePending = resolve
      },
    })
    row(host, 'Pending').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    instance.remove(1)
    await settle()
    resolvePending([{ id: 11, label: 'Stale child' }])
    await settle()
    expect(instance.getNode(11)).toBeNull()
    expect(labels(host)).toEqual([])
    expect(host.querySelector('.virtual-tree__empty-text')).not.toBeNull()
  })

  test.each([
    ['append', ['Lazy parent', 'A', 'B', 'C']],
    ['insertBefore', ['Lazy parent', 'A', 'C', 'B']],
    ['insertAfter', ['Lazy parent', 'A', 'C', 'B']],
  ] as const)('keeps lazy %s order after the rendered children watcher settles', async (operation, expected) => {
    const { instance, host } = await mountTree({
      data: [], lazy: true, defaultExpandAll: false,
      load(node, resolve) {
        resolve(node.level === 0
          ? [{ id: 1, label: 'Lazy parent', leaf: false, children: [] }]
          : [{ id: 11, label: 'A', leaf: true }, { id: 12, label: 'B', leaf: true }])
      },
    })
    row(host, 'Lazy parent').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    expect(labels(host)).toEqual(['Lazy parent', 'A', 'B'])
    const alpha = instance.getNode(11)!
    const beta = instance.getNode(12)!
    const child = { id: 13, label: 'C', leaf: true }
    if (operation === 'append') instance.append(child, 1)
    else if (operation === 'insertBefore') instance.insertBefore(child, 12)
    else instance.insertAfter(child, 11)
    await settle()
    expect(labels(host)).toEqual(expected)
    expect(instance.getNode(11)).toBe(alpha)
    expect(instance.getNode(12)).toBe(beta)

    instance.getNode(1)!.updateChildren()
    await settle()
    expect(labels(host)).toEqual(expected)
    expect(instance.getNodePath(13).map(({ id }) => id)).toEqual([1, 13])
  })

  test.each([false, true])('checkDescendants=%s controls whether a deep check loads pending descendants', async (checkDescendants) => {
    const { instance, host } = await mountTree({
      data: [], lazy: true, checkDescendants, defaultExpandAll: false,
      load(node, resolve) {
        resolve(node.level === 0
          ? [{ id: 1, label: 'Lazy parent', leaf: false }]
          : node.level === 1 ? [{ id: 11, label: 'Lazy child', leaf: true }] : [])
      },
    })
    instance.setChecked(1, true, true)
    await settle()
    expect(instance.getNode(1)?.checked).toBe(true)
    if (checkDescendants) {
      expect(instance.getNode(1)?.loaded).toBe(true)
      expect(instance.getCheckedKeys()).toEqual([1, 11])
    } else {
      expect(instance.getNode(1)?.loaded).toBe(false)
      expect(instance.getNode(11)).toBeNull()
    }
    row(host, 'Lazy parent').querySelector<HTMLElement>('.expand-icon')!.click()
    await settle()
    expect(labels(host)).toEqual(['Lazy parent', 'Lazy child'])
    expect(instance.getCheckedKeys()).toEqual([1, 11])
    expect(checkbox(host, 'Lazy child').checked).toBe(true)
  })

  test.each([false, true])('autoExpandParent=%s controls whether a default expanded descendant reveals its path', async (autoExpandParent) => {
    const { instance, host } = await mountTree({
      defaultExpandAll: false, defaultExpandedKeys: [11], autoExpandParent,
    })
    expect(instance.getNode(11)?.expanded).toBe(true)
    expect(instance.getNode(1)?.expanded).toBe(autoExpandParent)
    expect(labels(host)).toEqual(autoExpandParent
      ? ['Parent', 'Alpha', 'Beta', 'Sibling']
      : ['Parent', 'Sibling'])
  })
})
