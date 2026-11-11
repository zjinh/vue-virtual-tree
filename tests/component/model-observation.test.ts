import { afterEach, expect, test, vi } from 'vitest'
import { version, watch } from 'vue'
import { generateTreeData } from '../../examples/shared/data'
import { cleanupTrees, mountTree, settle } from './tree-harness'
import type { TreeNode } from '@zjinh/vue-virtual-tree'
import type { Item } from './tree-harness'

const isVue2 = version.startsWith('2.')

afterEach(() => { cleanupTrees(); vi.restoreAllMocks() })
const data = () => Array.from({ length: 200 }, (_, id) => ({ id, label: `Node ${id}`, children: [] as { id: number; label: string }[] }))

test('preserves public childNodes identity notifications when scrolling reuses rows', async () => {
  const { instance, host } = await mountTree({ data: data(), height: 520 })
  const node = instance.getNode(100)!
  const before = node.childNodes
  const notifications: unknown[] = []
  const stop = watch(() => node.childNodes, value => notifications.push(value))
  const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
  scroller.scrollTop = 150 * 26
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
  stop()
  expect(node.childNodes).not.toBe(before)
  expect(notifications).toHaveLength(1)
  expect(notifications[0]).toBe(node.childNodes)
})

test('retains legacy model refresh while reused rows normalize missing children', async () => {
  const { instance, host } = await mountTree({ data: generateTreeData(50000) as unknown as Item[], height: 520 })
  const flatten = vi.spyOn(instance as any, 'smoothTree')
  const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
  scroller.scrollTop = 100 * 26
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
  expect(flatten).toHaveBeenCalled()
}, 30000)

test('retains array replacement when raw children are explicitly reassigned on the same node', async () => {
  const { instance, props } = await mountTree()
  const parent = instance.getNode(1)!
  const before = parent.childNodes
  props.data![0].children = [...props.data![0].children!]
  await settle()
  expect(parent.childNodes).not.toBe(before)
  expect(parent.childNodes[0]).toBe(before[0])
})

test('supports attaching and removing selection listeners after mount', async () => {
  const { instance, events, listening } = await mountTree({ data: data(), checkStrictly: true }, undefined, undefined, false)
  instance.setChecked(30, true)
  await settle()
  listening.value = true
  await settle()
  expect(events['check-change'] ?? []).toEqual([])
  instance.setChecked(30, false)
  await settle()
  expect(events['check-change']?.map(args => [(args[0] as Item).id, args[1]])).toEqual([[30, false]])
  listening.value = false
  await settle()
  instance.setChecked(30, true)
  await settle()
  listening.value = true
  await settle()
  expect(events['check-change']).toHaveLength(1)
  instance.setChecked(30, false)
  await settle()
  expect(events['check-change']).toHaveLength(2)
})

test.each([true, false])('preserves row notifications when raw children replace a checked node (expanded: %s)', async expanded => {
  const { instance, props, events } = await mountTree({ checkStrictly: true, defaultExpandAll: expanded })
  instance.setChecked(11, true)
  await settle()
  events['check-change'] = []
  props.data![0].children = [{ id: 11, label: 'replacement' }, props.data![0].children![1]]
  await settle()
  expect(instance.getCheckedKeys()).toEqual([])
  expect(events['check-change']?.map(args => [(args[0] as Item).id, args[1], args[2]]))
    .toEqual(expanded ? [[11, false, false]] : [])
})

test('preserves reused-row notification when whole data replaces checked keys', async () => {
  const { instance, props, events } = await mountTree({ checkStrictly: true })
  instance.setChecked(11, true)
  await settle()
  events['check-change'] = []
  props.data = [{ id: 1, label: 'new parent', children: [{ id: 11, label: 'new child' }] }]
  await settle()
  expect(instance.getCheckedKeys()).toEqual([])
  expect(events['check-change'].map(args => [(args[0] as Item).id, args[1], args[2]])).toEqual([[11, false, false]])
})

test('preserves filtered-node silence and resumes row observation after filtering', async () => {
  const { instance, props, events } = await mountTree({ checkStrictly: true })
  instance.filter('Alpha')
  await settle()
  props.data!.reverse()
  instance.setChecked(12, true)
  await settle()
  expect(events['check-change'] ?? []).toEqual([])
  instance.filter('')
  await settle()
  instance.setChecked(12, false)
  await settle()
  expect(events['check-change']?.map(args => [(args[0] as Item).id, args[1]]))
    .toEqual([[12, false]])
})

test('preserves row reuse notifications across checkbox mode and visibility changes', async () => {
  const { instance, props, events } = await mountTree({ checkStrictly: true })
  instance.getNode(1)!.collapse()
  await settle()
  instance.setChecked(11, true)
  await settle()
  props.showCheckbox = false
  await settle()
  instance.setChecked(11, false)
  instance.setChecked(2, true)
  await settle()
  props.showCheckbox = true
  instance.getNode(1)!.expand()
  await settle()
  instance.setChecked(11, true)
  await settle()
  expect(events['check-change'].map(args => [(args[0] as Item).id, args[1]]))
    .toEqual([[2, true], [11, false], [11, true]])
})

test('notifies selection without flattening when checkbox display is disabled', async () => {
  const { instance, events } = await mountTree({ showCheckbox: false, checkStrictly: true })
  const flatten = vi.spyOn(instance as typeof instance & { smoothTree: (...args: unknown[]) => unknown }, 'smoothTree')
  instance.setChecked(11, true)
  await settle()
  expect(flatten).not.toHaveBeenCalled()
  expect(events['check-change']?.map(args => [(args[0] as Item).id, args[1]]))
    .toEqual([[11, true]])
})

test('follows direct node data replacement outside the rendered window', async () => {
  const { instance } = await mountTree({ data: data(), height: 520 })
  const node = instance.getNode(60)!
  node.data = { id: 60, label: 'replacement', children: [{ id: 999, label: 'first' }] }
  await settle()
  expect(instance.getNode(999)?.parent).toBe(node)
  node.data.children!.push({ id: 1000, label: 'later' })
  await settle()
  expect(node.childNodes.map(child => child.key)).toEqual(isVue2 ? [999, 1000] : [999])
  node.data.children = [...node.data.children!]
  await settle()
  expect(node.childNodes.map(child => child.key)).toEqual([999, 1000])
})

test('reconciles a replaced raw children array even when it contains the same objects', async () => {
  const { instance, props } = await mountTree()
  const original = props.data![0].children![0]
  instance.getNode(11)!.data = { id: 11, label: 'model replacement' }
  await settle()
  expect(instance.getNode(11)!.data.label).toBe('model replacement')
  props.data![0].children = [...props.data![0].children!]
  await settle()
  expect(instance.getNode(11)!.data).toBe(original)
})

test('preserves visible row DOM progress between selection callbacks', async () => {
  const trace: unknown[] = []
  const { instance, host } = await mountTree({ checkStrictly: true }, undefined, (name, args) => {
    if (name === 'check-change') trace.push([(args[0] as Item).id,
      Array.from(host.querySelectorAll<HTMLInputElement>('input'), input => input.checked)])
  })
  instance.setChecked(2, true)
  instance.setChecked(11, true)
  await settle()
  expect(trace).toEqual([
    [11, [false, false, false, false]],
    [2, [false, true, false, false]],
  ])
})

test('preserves deferred row-reuse notification after a same-batch scroll', async () => {
  const { instance, host, events } = await mountTree({ data: data(), height: 520, checkStrictly: true })
  instance.setChecked(5, true)
  const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
  scroller.scrollTop = 100 * 26
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
  expect(events['check-change'] ?? []).toEqual([])
  scroller.scrollTop = 0
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
  expect(events['check-change']?.map(args => [(args[0] as Item).id, args[1]])).toEqual([[5, true]])
})

test('cleans up queued row notifications when an earlier listener unmounts the tree', async () => {
  const notified: number[] = []
  const { instance } = await mountTree({ checkStrictly: true }, undefined, (name, args) => {
    if (name !== 'check-change') return
    notified.push((args[0] as Item).id)
    cleanupTrees()
  })
  instance.setChecked(11, true)
  instance.setChecked(2, true)
  await settle()
  expect(notified).toEqual([11])
})

test('does not invoke listeners for nodes beyond the legacy observation window', async () => {
  const notified: unknown[] = []
  const { instance } = await mountTree({ data: data(), height: 520, checkStrictly: true }, undefined, (name, args) => {
    if (name !== 'check-change') return
    const id = (args[0] as Item).id
    notified.push([id, args[1]])
    if (id === 100) instance.setChecked(5, false)
  })
  instance.setChecked(5, true)
  instance.setChecked(100, true)
  await settle()
  expect(notified).toEqual([[5, true]])
  expect(instance.getCheckedKeys()).toEqual([5, 100])
})

test('preserves selection state and row-reuse event timing across a same-tick reorder', async () => {
  const { instance, props, events } = await mountTree({ data: data(), checkStrictly: true })
  instance.setChecked(60, true)
  await settle()
  events['check-change'] = []
  instance.setChecked(61, true)
  props.data!.reverse()
  await settle()
  expect(events['check-change'].map(args => [(args[0] as { id: number }).id, args[1]]))
    .toEqual([])
  expect(instance.getNode(60)!.checked).toBe(true)
  expect(instance.getNode(61)!.checked).toBe(true)
})

test('preserves keyless model state without observing filtered-out rows', async () => {
  let child: TreeNode<Item> | undefined
  const { instance, props, events } = await mountTree({ nodeKey: undefined }, ({ node }, h) => {
    if (node.data.id === 11) child = node
    return h('span', node.data.label)
  })
  expect(child).toBeDefined()
  instance.filter('Sibling')
  await settle()
  child!.checked = true
  await settle()
  expect(events['check-change'] ?? []).toEqual([])
  expect(child!.checked).toBe(true)
  props.data![0].children!.push({ id: 13, label: 'hidden new child' })
  await settle()
  expect(child!.parent!.childNodes.map(node => node.data.id)).toEqual([11, 12])
})

test('preserves selection and reuse notifications within the legacy observation window', async () => {
  const { instance, host, events } = await mountTree({ data: data(), height: 520 })
  expect(host.querySelectorAll('.virtual-tree-node')).toHaveLength(40)
  instance.setChecked(60, true)
  await settle()
  expect(events['check-change']?.map(args => [(args[0] as { id: number }).id, args[1], args[2]]))
    .toEqual([[60, true, false]])
  instance.getNode(60)!.checked = false
  await settle()
  expect(events['check-change']).toHaveLength(2)
  instance.setChecked(5, true)
  await settle()
  expect(events['check-change']).toHaveLength(3)
  const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
  scroller.scrollTop = 100 * 26
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
  expect(events['check-change'].map(args => [(args[0] as Item).id, args[1], args[2]]))
    .toEqual([[60, true, false], [60, false, false], [5, true, false], [25, false, false]])
})

test('preserves runtime-specific shallow children observation in the legacy window', async () => {
  const { instance, props } = await mountTree({ data: data(), height: 520 })
  instance.getNode(60)!.collapse()
  props.data![60].children = [{ id: 999, label: 'new child' }]
  await settle()
  expect(instance.getNode(999)?.parent).toBe(instance.getNode(60))
  props.data![60].children!.push({ id: 1000, label: 'second child' })
  await settle()
  expect(instance.getNode(60)!.childNodes.map(node => node.key)).toEqual(isVue2 ? [999, 1000] : [999])
  props.data![60].children!.reverse()
  await settle()
  expect(instance.getNode(60)!.childNodes.map(node => node.key)).toEqual(isVue2 ? [1000, 999] : [999])
  props.data![60].children = [...props.data![60].children!]
  await settle()
  expect(instance.getNode(60)!.childNodes.map(node => node.key)).toEqual([1000, 999])
  props.data![60].children = []
  await settle()
  expect(instance.getNode(999)).toBeNull()
  expect(instance.getNode(1000)).toBeNull()
  expect(instance.getNode(60)!.isLeaf).toBe(true)
})

test('scrolling preserves legacy model refresh without emitting unchanged selection events', async () => {
  const { instance, host, events } = await mountTree({ data: data(), height: 520 })
  const internal = instance as typeof instance & { smoothTree: (...args: unknown[]) => unknown }
  const flatten = vi.spyOn(internal, 'smoothTree')
  const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
  for (const index of [60, 140, 0]) {
    scroller.scrollTop = index * 26
    scroller.dispatchEvent(new Event('scroll'))
    await settle()
  }
  expect(flatten).toHaveBeenCalled()
  expect(events['check-change'] ?? []).toEqual([])
})

test('stops observing removed nodes and cleans up pending selection notifications', async () => {
  const { instance, events } = await mountTree({ data: data(), height: 520 })
  const removed = instance.getNode(60)!
  instance.remove(60)
  await settle()
  removed.checked = true
  await settle()
  expect(events['check-change'] ?? []).toEqual([])
  instance.setChecked(61, true)
  cleanupTrees()
  await settle()
  expect(events['check-change'] ?? []).toEqual([])
})

test('observes inserted descendants and coalesces synchronous selection toggles', async () => {
  const { instance, props, events } = await mountTree({ data: data(), height: 520 })
  props.data![60].children = [{ id: 999, label: 'child' }]
  await settle()
  expect(events['check-change'] ?? []).toEqual([])
  instance.setChecked(999, true)
  await settle()
  expect(events['check-change'].map(args => (args[0] as { id: number }).id).sort((a, b) => a - b)).toEqual([60, 999])
  events['check-change'] = []
  instance.setChecked(999, false)
  instance.setChecked(999, true)
  await settle()
  expect(events['check-change']).toEqual([])
  props.data = data()
  await settle()
  expect(instance.getNode(999)).toBeNull()
  expect(events['check-change'].map(args => [(args[0] as Item).id, args[1], args[2]])).toEqual([[60, false, false], [61, false, false]])
})

test('updates mapped children on offscreen nodes without reacting to label-only edits', async () => {
  const mapped = Array.from({ length: 200 }, (_, id) => ({ id, label: `Node ${id}`, items: [] as { id: number; label: string }[] }))
  const { instance, props } = await mountTree({ data: mapped, props: { children: 'items' as never, label: 'label' }, height: 520 })
  const flatten = vi.spyOn(instance as any, 'smoothTree')
  props.data![60].label = 'renamed'
  await settle()
  expect(flatten.mock.calls.length).toBe(0)
  ;(props.data![60] as typeof mapped[number]).items.push({ id: 999, label: 'mapped child' })
  await settle()
  expect(instance.getNode(999)?.parent?.key).toBe(isVue2 ? 60 : undefined)
  ;(props.data![60] as typeof mapped[number]).items = [...(props.data![60] as typeof mapped[number]).items]
  await settle()
  expect(instance.getNode(999)?.parent?.key).toBe(60)
})

test('does not hydrate raw children of an unloaded lazy node during observation', async () => {
  const { instance } = await mountTree({
    data: [], lazy: true, defaultExpandAll: false,
    load(node, resolve) {
      if (node.level === 0) resolve([{ id: 1, label: 'lazy', children: [{ id: 11, label: 'raw child' }] }])
      else resolve([{ id: 12, label: 'loaded child' }])
    },
  })
  expect(instance.getNode(1)!.childNodes).toHaveLength(0)
  expect(instance.getNode(11)).toBeNull()
  instance.getNode(1)!.expand()
  await settle()
  expect(instance.getNode(1)!.childNodes.map(node => node.key)).toEqual([12])
})

test('publishes current display types before notifying selection listeners', async () => {
  const observed: unknown[][] = []
  const { instance } = await mountTree({}, undefined, (name, args) => {
    if (name === 'check-change') {
      const id = (args[0] as { id: number }).id
      observed.push([id, instance.getNode(id)!.type])
    }
  })
  instance.setChecked(11, true)
  await settle()
  expect(observed).toEqual([[1, '1-false-true'], [11, '2-true-false']])
})

test('preserves sibling row reuse when a selection listener removes an ancestor', async () => {
  const notified: number[] = []
  const { instance } = await mountTree({}, undefined, (name, args) => {
    if (name !== 'check-change') return
    const id = (args[0] as { id: number }).id
    notified.push(id)
    if (id === 1) instance.remove(1)
  })
  instance.setChecked(1, true, true)
  await settle()
  expect(notified).toEqual([1, 2])
  expect(instance.getNode(11)).toBeNull()
})

test('handles selection changes made by event listeners without duplicate notifications', async () => {
  const notified: number[] = []
  const { instance } = await mountTree({ checkStrictly: true }, undefined, (name, args) => {
    if (name !== 'check-change') return
    const id = (args[0] as { id: number }).id
    notified.push(id)
    if (id === 11) instance.setChecked(12, true)
  })
  instance.setChecked(11, true)
  await settle()
  expect(notified).toEqual([11, 12])
})

test('does not publish stale child state after a parent listener changes it', async () => {
  const notified: unknown[][] = []
  const { instance } = await mountTree({}, undefined, (name, args) => {
    if (name !== 'check-change') return
    const id = (args[0] as { id: number }).id
    notified.push([id, args[1], args[2]])
    if (id === 1 && args[1] === true) instance.setChecked(11, false)
  })
  instance.setChecked(1, true, true)
  await settle()
  expect(notified.filter(args => args[0] === 11)).toEqual([])
  expect(instance.getCheckedKeys()).toEqual([12])
})

test('preserves shallow root edits and supports explicit descendant updates outside the window', async () => {
  const { instance, props } = await mountTree({ data: data(), height: 520 })
  props.data!.push({ id: 999, label: 'new root', children: [] })
  await settle()
  expect(instance.getNode(999) !== null).toBe(isVue2)
  props.data = [...props.data!]
  await settle()
  expect(instance.getNode(999)).not.toBeNull()
  props.data![200].children!.push({ id: 1000, label: 'new descendant', children: [] })
  await settle()
  expect(instance.getNode(1000)).toBeNull()
  instance.updateKeyChildren(999, [{ id: 1000, label: 'new descendant', children: [] }])
  await settle()
  instance.updateKeyChildren(1000, [{ id: 1001, label: 'nested' }])
  await settle()
  expect(instance.getNodePath(1001).map(node => node.id)).toEqual([999, 1000, 1001])
  props.data = props.data!.filter(node => node.id !== 999)
  await settle()
  expect(instance.getNode(1001)).toBeNull()
})
