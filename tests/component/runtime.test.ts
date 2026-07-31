import { afterEach, describe, expect, test, vi } from 'vitest'
import * as VueRuntime from 'vue'

import VirtualList from '../../src/components/virtualList'
import TreeComponent from '../../src/index.vue'
import type {
  TreeNode,
  TreeStore,
  VueVirtualTreeInstance,
} from '../../src/index'

declare const __VUE_RUNTIME__: 'vue2' | 'vue3'

interface Item {
  id: number
  label: string
  children?: Item[]
}

interface RuntimeTreeInstance extends VueVirtualTreeInstance<Item> {
  root: TreeNode<Item>
  store: TreeStore<Item>
}

interface MountOptions {
  data?: Item[]
  highlightCurrent?: boolean
  useSlot?: boolean
}

interface MountResult {
  host: HTMLElement
  instance: RuntimeTreeInstance
  events: {
    check: unknown[][]
    currentChange: unknown[][]
    nodeClick: unknown[][]
    nodeCollapse: unknown[][]
    nodeExpand: unknown[][]
  }
  unmount(): void
}

interface VirtualListMountResult {
  events: {
    scroll: unknown[][]
    scrollEnd: unknown[][]
  }
  host: HTMLElement
  unmount(): void
}

interface MountedResource {
  host: HTMLElement
  unmount(): void
}

interface Vue2Constructor {
  new (options: Record<string, unknown>): {
    $destroy(): void
    $el: Element
    $mount(): void
    $refs: Record<string, unknown>
  }
}

interface Vue3Application {
  mount(element: Element): unknown
  unmount(): void
}

const mounted: MountedResource[] = []

const createTreeData = (): Item[] => [
  {
    id: 1,
    label: 'Root',
    children: [{ id: 2, label: 'Child' }],
  },
]

const settle = async (): Promise<void> => {
  for (let index = 0; index < 5; index += 1) {
    await VueRuntime.nextTick()
  }
}

const mountTree = async (options: MountOptions = {}): Promise<MountResult> => {
  const host = document.createElement('div')
  document.body.appendChild(host)

  const events = {
    check: [] as unknown[][],
    currentChange: [] as unknown[][],
    nodeClick: [] as unknown[][],
    nodeCollapse: [] as unknown[][],
    nodeExpand: [] as unknown[][],
  }
  const props = {
    data: options.data ?? createTreeData(),
    defaultExpandAll: true,
    filterNodeMethod: (value: string, data: Item) => data.label.includes(value),
    height: '260px',
    highlightCurrent: options.highlightCurrent ?? false,
    itemSize: 26,
    nodeKey: 'id',
    props: {
      children: 'children',
      label: 'label',
    },
    showCheckbox: true,
  }

  let instance: RuntimeTreeInstance | undefined
  let unmount: () => void

  if (__VUE_RUNTIME__ === 'vue2') {
    const Vue2 = (
      VueRuntime as unknown as { default: Vue2Constructor }
    ).default
    const parent = new Vue2({
      render(createElement: (...args: unknown[]) => unknown) {
        return createElement(TreeComponent, {
          on: {
            check: (...args: unknown[]) => events.check.push(args),
            'current-change': (...args: unknown[]) => events.currentChange.push(args),
            'node-click': (...args: unknown[]) => events.nodeClick.push(args),
            'node-collapse': (...args: unknown[]) => events.nodeCollapse.push(args),
            'node-expand': (...args: unknown[]) => events.nodeExpand.push(args),
          },
          props,
          ref: 'tree',
          scopedSlots: options.useSlot
            ? {
                default: ({ item }: { item: Item }) =>
                  createElement('span', { class: 'slot-label' }, [`slot:${item.label}`]),
              }
            : undefined,
        })
      },
    })
    parent.$mount()
    host.appendChild(parent.$el)
    instance = parent.$refs.tree as RuntimeTreeInstance
    unmount = () => parent.$destroy()
  } else {
    const runtime = VueRuntime as typeof VueRuntime & {
      createApp(root: unknown): Vue3Application
    }
    const Root = runtime.defineComponent({
      setup() {
        return () =>
          runtime.h(
            TreeComponent,
            {
              ...props,
              onCheck: (...args: unknown[]) => events.check.push(args),
              onCurrentChange: (...args: unknown[]) => events.currentChange.push(args),
              onNodeClick: (...args: unknown[]) => events.nodeClick.push(args),
              onNodeCollapse: (...args: unknown[]) => events.nodeCollapse.push(args),
              onNodeExpand: (...args: unknown[]) => events.nodeExpand.push(args),
              ref: (value: unknown) => {
                instance = value as RuntimeTreeInstance
              },
            },
            options.useSlot
              ? {
                  default: ({ item }: { item: Item }) =>
                    runtime.h('span', { class: 'slot-label' }, `slot:${item.label}`),
                }
              : undefined,
          )
      },
    })
    const app = runtime.createApp(Root)
    app.mount(host)
    unmount = () => app.unmount()
  }

  await settle()
  if (!instance) throw new Error('tree component instance was not mounted')

  const result = { host, instance, events, unmount }
  mounted.push(result)
  return result
}

const mountVirtualList = async (): Promise<VirtualListMountResult> => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const events = {
    scroll: [] as unknown[][],
    scrollEnd: [] as unknown[][],
  }
  const props = {
    bufferScale: 1,
    height: '100px',
    itemHeight: 20,
    listData: Array.from({ length: 200 }, (_, index) => index),
  }

  let rawUnmount: () => void
  if (__VUE_RUNTIME__ === 'vue2') {
    const Vue2 = (
      VueRuntime as unknown as { default: Vue2Constructor }
    ).default
    const parent = new Vue2({
      render(createElement: (...args: unknown[]) => unknown) {
        return createElement(VirtualList, {
          on: {
            scroll: (...args: unknown[]) => events.scroll.push(args),
            scrollEnd: (...args: unknown[]) => events.scrollEnd.push(args),
          },
          props,
          scopedSlots: {
            default: ({ index }: { index: number }) =>
              createElement('div', { class: 'virtual-item' }, [String(index)]),
          },
        })
      },
    })
    parent.$mount()
    host.appendChild(parent.$el)
    rawUnmount = () => parent.$destroy()
  } else {
    const runtime = VueRuntime as typeof VueRuntime & {
      createApp(root: unknown): Vue3Application
    }
    const Root = runtime.defineComponent({
      setup() {
        return () => runtime.h(
          VirtualList,
          {
            ...props,
            onScroll: (...args: unknown[]) => events.scroll.push(args),
            onScrollEnd: (...args: unknown[]) => events.scrollEnd.push(args),
          },
          {
            default: ({ index }: { index: number }) =>
              runtime.h('div', { class: 'virtual-item' }, String(index)),
          },
        )
      },
    })
    const app = runtime.createApp(Root)
    app.mount(host)
    rawUnmount = () => app.unmount()
  }

  let unmounted = false
  const unmount = (): void => {
    if (unmounted) return
    unmounted = true
    rawUnmount()
  }
  const result = { events, host, unmount }
  mounted.push(result)
  await settle()
  return result
}

const triggerResizeObservers = (element: Element): void => {
  const runtimeGlobal = globalThis as typeof globalThis & {
    triggerResizeObservers(target?: Element): void
  }
  runtimeGlobal.triggerResizeObservers(element)
}

afterEach(() => {
  while (mounted.length > 0) {
    const result = mounted.pop()
    if (result?.host.isConnected) {
      result.unmount()
      result.host.remove()
    }
  }
  vi.clearAllTimers()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe(`${__VUE_RUNTIME__} component runtime`, () => {
  test('mounts a minimal tree and renders scoped slot props', async () => {
    const result = await mountTree({ useSlot: true })

    expect(result.host.querySelectorAll('.virtual-tree-node')).toHaveLength(2)
    expect(
      Array.from(result.host.querySelectorAll('.slot-label'), (element) =>
        element.textContent,
      ),
    ).toEqual(['slot:Root', 'slot:Child'])
  })

  test('emits node click, current change, and check event paths', async () => {
    const result = await mountTree()
    const firstNode = result.host.querySelector<HTMLElement>('.virtual-tree-node')
    const firstCheckbox = result.host.querySelector<HTMLInputElement>('.checkbox')

    expect(firstNode).not.toBeNull()
    expect(firstCheckbox).not.toBeNull()
    firstNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    firstCheckbox!.checked = true
    firstCheckbox?.dispatchEvent(new Event('change', { bubbles: true }))
    await settle()

    expect(result.events.nodeClick.at(-1)?.[0]).toMatchObject({ id: 1 })
    expect(result.events.currentChange.at(-1)?.[0]).toMatchObject({ id: 1 })
    expect(result.events.check.at(-1)?.[0]).toMatchObject({ id: 1 })
    expect(result.events.check.at(-1)?.[1]).toMatchObject({
      checkedKeys: expect.arrayContaining([1, 2]),
    })
  })

  test('emits collapse and expand only through the built-in node control', async () => {
    const result = await mountTree()
    const expandControl = result.host.querySelector<HTMLElement>('.expand-icon')

    expect(expandControl).not.toBeNull()
    expandControl?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()
    expect(result.events.nodeCollapse.at(-1)?.[0]).toMatchObject({ id: 1 })

    expandControl?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()
    expect(result.events.nodeExpand.at(-1)?.[0]).toMatchObject({ id: 1 })
  })

  test('gates current-node styling with highlightCurrent without changing current state', async () => {
    const disabled = await mountTree({ highlightCurrent: false })
    const disabledNode = disabled.host.querySelector<HTMLElement>('.virtual-tree-node')
    disabledNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()

    expect(disabled.instance.getCurrentKey()).toBe(1)
    expect(disabledNode?.classList.contains('is-current')).toBe(false)

    const enabled = await mountTree({ highlightCurrent: true })
    const enabledNode = enabled.host.querySelector<HTMLElement>('.virtual-tree-node')
    enabledNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()

    expect(enabled.instance.getCurrentKey()).toBe(1)
    expect(enabledNode?.classList.contains('is-current')).toBe(true)
  })

  test('supports representative filter, path, check, current, and mutation methods', async () => {
    const { instance } = await mountTree()

    expect(instance.getNodePath(2).map((item) => item.id)).toEqual([1, 2])
    instance.setChecked(2, true)
    expect(instance.getCheckedKeys()).toEqual(expect.arrayContaining([1, 2]))
    instance.setCurrentKey(2)
    expect(instance.getCurrentKey()).toBe(2)
    instance.filter('Child')
    instance.append({ id: 3, label: 'Appended' }, 1)
    expect(instance.getNode(3)?.data.label).toBe('Appended')
    instance.updateKeyChildren(1, [{ id: 4, label: 'Updated' }])
    expect(instance.getNode(4)?.data.label).toBe('Updated')
    instance.remove(4)
    expect(instance.getNode(4)).toBeNull()
  })

  test('destroys the tree exactly once during real runtime unmount', async () => {
    const result = await mountTree()
    const rootRemove = vi.spyOn(result.instance.root, 'remove')
    const storeDestroy = vi.spyOn(result.instance.store, 'destroy')

    expect(() => result.unmount()).not.toThrow()
    result.host.remove()

    expect(rootRemove).toHaveBeenCalledTimes(1)
    expect(storeDestroy).toHaveBeenCalledTimes(1)
  })

  test('renders substantially fewer DOM nodes than a large flat data set', async () => {
    const data = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      label: `Node ${index + 1}`,
    }))
    const result = await mountTree({ data })
    const rendered = result.host.querySelectorAll('.virtual-tree-node').length

    expect(rendered).toBeGreaterThan(0)
    expect(rendered).toBeLessThan(150)
  })

  test('isolates scroll state between two virtual list instances', async () => {
    const first = await mountVirtualList()
    const second = await mountVirtualList()
    const firstElement = first.host.querySelector<HTMLElement>('.virtual-tree')!
    const secondElement = second.host.querySelector<HTMLElement>('.virtual-tree')!

    firstElement.scrollTop = 40
    secondElement.scrollTop = 40
    firstElement.dispatchEvent(new Event('scroll'))
    secondElement.dispatchEvent(new Event('scroll'))
    await settle()

    expect(first.events.scroll).toHaveLength(1)
    expect(second.events.scroll).toHaveLength(1)

    first.unmount()
    first.host.remove()
    secondElement.dispatchEvent(new Event('scroll'))
    await settle()

    expect(second.events.scroll).toHaveLength(1)
  })

  test('recomputes the rendered window after an observed height change', async () => {
    vi.useFakeTimers()
    const result = await mountVirtualList()
    const element = result.host.querySelector<HTMLElement>('.virtual-tree')!
    const initialCount = result.host.querySelectorAll('.virtual-item').length

    element.style.height = '200px'
    triggerResizeObservers(element)
    await vi.advanceTimersByTimeAsync(100)
    await settle()

    expect(result.host.querySelectorAll('.virtual-item').length).toBeGreaterThan(
      initialCount,
    )
  })

  test('cancels delayed virtual list emissions during unmount', async () => {
    vi.useFakeTimers()
    const result = await mountVirtualList()
    const element = result.host.querySelector<HTMLElement>('.virtual-tree')!

    element.scrollTop = 40
    element.dispatchEvent(new Event('scroll'))
    expect(result.events.scrollEnd).toHaveLength(0)
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    result.unmount()
    result.host.remove()
    expect(vi.getTimerCount()).toBe(0)
    await vi.runAllTimersAsync()

    expect(result.events.scrollEnd).toHaveLength(0)
  })
})
