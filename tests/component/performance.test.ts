import { afterEach, describe, expect, test, vi } from 'vitest'
import type { TreeNode } from '@zjinh/vue-virtual-tree'
import { checkbox, cleanupTrees, labels, mountTree, settle } from './tree-harness'
import type { Item } from './tree-harness'
import TreeComponent from '../../src/tree'
import ModelNode from '../../src/model/node'
import TreeStore from '../../src/model/tree-store'

afterEach(() => { cleanupTrees(); vi.restoreAllMocks() })

describe('selection performance and compatibility', () => {
  test('flattens a wide subtree without spreading it into function arguments', () => {
    const store = new TreeStore<Item>({ data: [], key: 'id' })
    const parent = new ModelNode<Item>({ data: { id: -1, label: 'parent' }, store, expanded: true })
    parent.childNodes = Array.from({ length: 150000 }, (_, id) =>
      new ModelNode<Item>({ data: { id, label: String(id) }, store }))
    const context = { showCheckbox: true, smoothTree: TreeComponent.methods!.smoothTree }
    const result = context.smoothTree.call(context as never, [parent])
    expect(result).toHaveLength(150001)
    expect(result[0]).toBe(parent)
    expect(result[150000]).toBe(parent.childNodes[149999])
  })
  test('flattens a deep existing model without recursive calls', () => {
    const store = new TreeStore<Item>({ data: [], key: 'id' })
    const nodes = Array.from({ length: 12000 }, (_, id) =>
      new ModelNode<Item>({ data: { id, label: String(id) }, store, expanded: true }))
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].childNodes.push(nodes[i + 1])
    const context = { showCheckbox: true, smoothTree: TreeComponent.methods!.smoothTree }
    const result = context.smoothTree.call(context as never, [nodes[0]])
    expect(result).toHaveLength(12000)
    expect(result[0]).toBe(nodes[0])
    expect(result[11999]).toBe(nodes[11999])
  })

  test('keeps preorder, hidden-parent descent and collapsed-child exclusion', () => {
    const store = new TreeStore<Item>({ data: [
      { id: 1, label: 'hidden', children: [{ id: 11, label: 'visible child' }] },
      { id: 2, label: 'collapsed', children: [{ id: 21, label: 'excluded' }] },
      { id: 3, label: 'last' },
    ], key: 'id', defaultExpandAll: true })
    store.getNode(1)!.visible = false
    store.getNode(2)!.collapse()
    const context = { showCheckbox: false, smoothTree: TreeComponent.methods!.smoothTree }
    const result = context.smoothTree.call(context as never, store.root!.childNodes)
    expect(result.map(node => node.key)).toEqual([11, 2, 3])
    expect(store.getNode(1)!.type).toBeNull()
    expect(store.getNode(21)!.type).toBeNull()
    expect(result.map(node => node.type)).toEqual(['2-true', '1-false', '1-true'])
  })

  test.each([null, undefined, false, 0, 'custom', Symbol('custom')])('preserves custom type %s and restores display mode', async value => {
    const { instance, props } = await mountTree()
    const node = instance.getNode(11)!
    node.type = value
    expect(node.type).toBe(value)
    expect({ ...node }.type).toBe(value)
    props.showCheckbox = false
    await settle()
    expect(node.type).toBe('2-true')
    props.showCheckbox = true
    await settle()
    expect(node.type).toBe('2-false-false')
  })
  test('keeps scoped-slot type output reactive with legacy stored type updates', async () => {
    const { instance, host } = await mountTree({}, ({ node }, h) =>
      h('span', { class: 'display-type' }, String(node.type)))
    instance.setChecked(11, true)
    await settle()
    expect(Array.from(host.querySelectorAll('.display-type'), element => element.textContent))
      .toEqual(['1-false-true', '2-true-false', '2-false-false', '1-false-false'])
  })
  test('refreshes legacy types on selection while updating rows and public node types', async () => {
    const { instance, host, props } = await mountTree()
    const internal = instance as typeof instance & { dataList: TreeNode<Item>[] }
    const before = internal.dataList
    const alpha = instance.getNode(11)!
    expect(Object.prototype.hasOwnProperty.call(alpha, 'type')).toBe(true)
    expect({ ...alpha }.type).toBe('2-false-false')
    expect(alpha.type).toBe('2-false-false')
    instance.setChecked(11, true)
    await settle()
    expect(checkbox(host, 'Alpha').checked).toBe(true)
    expect(checkbox(host, 'Parent').indeterminate).toBe(true)
    expect(alpha.type).toBe('2-true-false')
    expect(instance.getNode(1)!.type).toBe('1-false-true')
    expect(internal.dataList).not.toBe(before)
    expect(internal.dataList).toEqual(before)
    alpha.type = 'custom'
    expect(alpha.type).toBe('custom')
    props.showCheckbox = false
    await settle()
    expect(alpha.type).toBe('2-true')
    instance.getNode(1)!.collapse()
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Sibling'])
    instance.getNode(1)!.expand()
    await settle()
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
  })

  test.each([false, true])('generates one selection snapshot per click (children only: %s)', async (selectChildrenOnly) => {
    const { instance, host, events } = await mountTree({ selectChildrenOnly })
    const store = (instance as any).store
    const checked = vi.spyOn(store, 'getCheckedNodes')
    const half = vi.spyOn(store, 'getHalfCheckedNodes')
    const leaves = vi.spyOn(store, 'getSelectedLeafNodes')
    checkbox(host, 'Alpha').click()
    await settle()
    expect(events.check).toHaveLength(1)
    const state = events.check[0][1] as any
    expect(state.checkedKeys).toEqual([11])
    expect(state.checkedNodes.map((node: Item) => node.id)).toEqual([11])
    expect(state.halfCheckedKeys).toEqual([1])
    expect(state.halfCheckedNodes.map((node: Item) => node.id)).toEqual([1])
    if (selectChildrenOnly) {
      expect(state.selectedLeafKeys).toEqual([11])
      expect(state.selectedLeafNodes.map((node: Item) => node.id)).toEqual([11])
      expect(leaves).toHaveBeenCalledTimes(1)
    }
    expect(checked).toHaveBeenCalledTimes(1)
    expect(half).toHaveBeenCalledTimes(1)
  })
})
