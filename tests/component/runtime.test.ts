import { afterEach, describe, expect, test, vi } from 'vitest'
import * as VueRuntime from 'vue'

import DemoApp from '../../examples/shared/App.vue'
import { countTreeNodes } from '../../examples/shared/data'
import type { DemoTreeNode } from '../../examples/shared/data'
import VirtualList from '../../src/components/virtualList'
import TreeComponent from '@zjinh/vue-virtual-tree'
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
  height?: string | number
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

interface DemoAsyncContext {
  beginTreeGeneration(): number
  cleanupAsyncWork(): void
  pendingAnimationFrames: Map<number, (timestamp: number | null) => void>
  pendingTimeouts: Map<number, () => void>
  waitForDelay(delayMs: number, generation?: number): Promise<boolean>
  waitForNextFrame(generation?: number): Promise<number | null>
  workGeneration: number
}

interface DemoAppMethodRegistry {
  applyAndRemount(this: {
    appliedOptions: Record<string, string | number | boolean>
    draftOptions: Record<string, string | number | boolean>
    refreshObservedMetrics(): Promise<void>
    targetKey: string
    totalNodes: number
    treeData: DemoTreeNode[]
    treeVersion: number
  }): void
  loadLazyNode(
    this: {
      $nextTick(): Promise<void>
      refreshObservedMetrics(): Promise<void>
    },
    node: { data: DemoTreeNode | DemoTreeNode[]; level: number },
    resolve: (children: DemoTreeNode[]) => void,
  ): void
  beginTreeGeneration(this: DemoAsyncContext): number
  beginBusy(this: {
    busy: boolean
    busyLabel: string
    busyOwner: number | null
    busySequence: number
  }, label: string): number
  cleanupAsyncWork(this: DemoAsyncContext): void
  endBusy(this: {
    busy: boolean
    busyLabel: string
    busyOwner: number | null
  }, owner: number | null): void
  setDraftBoolean(
    this: {
      appliedOptions: Record<string, string | number | boolean>
      draftOptions: Record<string, string | number | boolean>
    },
    name: string,
    event: Event,
  ): void
  serializeValue(this: object, value: unknown): string
  sampleScrollFrames(this: {
    addBenchmark(name: string, durationMs: number, detail: string): void
    beginBusy(label: string): number
    benchmarks: unknown[]
    busy: boolean
    endBusy(owner: number | null): void
    frameSummary: { frameCount: number; p95Ms: number | null; longFrames: number }
    recordMethodResult(name: string, startedAt: number, value?: unknown, error?: unknown): void
    refreshObservedMetrics(): Promise<void>
  }): Promise<void>
  waitForDelay(this: DemoAsyncContext, delayMs: number, generation?: number): Promise<boolean>
  waitForNextFrame(this: DemoAsyncContext, generation?: number): Promise<number | null>
}

interface DemoAppPublicInstance {
  getTree(): VueVirtualTreeInstance<DemoTreeNode>
  appliedOptions: Record<string, string | number | boolean>
  applyAndRemount(): void
  benchmarks: unknown[]
  busy: boolean
  busyLabel: string
  draftOptions: Record<string, string | number | boolean>
  eventLog: Array<{ name: string }>
  loadDataset(total: number): Promise<void>
  resetScenario(): void
  runNamedMethod(name: string): Promise<void>
  targetKey: string
  totalNodes: number
  treeData: DemoTreeNode[]
}

interface DemoAppMountResult extends MountedResource {
  instance: DemoAppPublicInstance
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
  component(name: string, component: unknown): Vue3Application
  mount(element: Element): unknown
  unmount(): void
}

const mounted: MountedResource[] = []
const demoAppMethods = (DemoApp as unknown as { methods: DemoAppMethodRegistry }).methods

const createDemoAsyncContext = (): DemoAsyncContext => {
  const context: DemoAsyncContext = {
    beginTreeGeneration: () => demoAppMethods.beginTreeGeneration.call(context),
    cleanupAsyncWork: () => demoAppMethods.cleanupAsyncWork.call(context),
    pendingAnimationFrames: new Map(),
    pendingTimeouts: new Map(),
    waitForDelay: (delayMs, generation) =>
      demoAppMethods.waitForDelay.call(context, delayMs, generation),
    waitForNextFrame: (generation) =>
      demoAppMethods.waitForNextFrame.call(context, generation),
    workGeneration: 0,
  }
  return context
}

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
    height: options.height ?? '260px',
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

const mountDemoApp = async (): Promise<DemoAppMountResult> => {
  const host = document.createElement('div')
  document.body.appendChild(host)

  let instance: DemoAppPublicInstance | undefined
  let rawUnmount: () => void
  if (__VUE_RUNTIME__ === 'vue2') {
    const Vue2 = (
      VueRuntime as unknown as { default: Vue2Constructor }
    ).default
    const appOptions = DemoApp as unknown as {
      components?: Record<string, unknown>
    }
    appOptions.components = {
      ...appOptions.components,
      VueVirtualTree: TreeComponent,
    }
    const parent = new Vue2({
      render(createElement: (...args: unknown[]) => unknown) {
        return createElement(DemoApp, { ref: 'app' })
      },
    })
    parent.$mount()
    host.appendChild(parent.$el)
    instance = parent.$refs.app as DemoAppPublicInstance
    rawUnmount = () => parent.$destroy()
  } else {
    const runtime = VueRuntime as typeof VueRuntime & {
      createApp(root: unknown): Vue3Application
    }
    const app = runtime.createApp(DemoApp)
    app.component('VueVirtualTree', TreeComponent)
    instance = app.mount(host) as DemoAppPublicInstance
    rawUnmount = () => app.unmount()
  }

  let unmounted = false
  const unmount = (): void => {
    if (unmounted) return
    unmounted = true
    rawUnmount()
  }
  if (!instance) throw new Error('demo app instance was not mounted')
  const result = { host, instance, unmount }
  mounted.push(result)
  await settle()
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
  window.localStorage.clear()
})

describe(`${__VUE_RUNTIME__} component runtime`, () => {
  test('mounts the shared demo with accessible prop controls', async () => {
    const result = await mountDemoApp()
    const rows = Array.from(result.host.querySelectorAll<HTMLElement>('.prop-row'))

    expect(rows).toHaveLength(22)
    for (const row of rows) {
      const name = row.querySelector('code')?.textContent
      expect(name).toBeTruthy()
      expect(row.id).toBe(`prop-row-${name}`)
      expect(row.getAttribute('aria-labelledby')).toBe(`prop-label-${name}`)
      expect(row.getAttribute('aria-describedby')).toBe(`prop-description-${name}`)
      expect(result.host.querySelector(`#prop-label-${name}`)?.textContent).toContain(name)
      expect(result.host.querySelector(`#prop-description-${name}`)?.textContent).toMatch(/default/i)

      const control = row.querySelector<HTMLInputElement>('input')
      if (control) {
        expect(control.getAttribute('aria-labelledby')).toBe(`prop-label-${name}`)
        expect(control.getAttribute('aria-describedby')).toBe(`prop-description-${name}`)
      }
    }
  })

  test('switches demo language while retaining the active tree, inputs and checked nodes', async () => {
    const result = await mountDemoApp()
    result.instance.targetKey = 'node-12'
    await result.instance.runNamedMethod('setChecked')
    const tree = result.host.querySelector('.tree-frame .virtual-tree')
    const data = result.instance.treeData
    const checkbox = result.host.querySelector<HTMLInputElement>('.tree-frame input[type="checkbox"]:checked')
    expect(checkbox).not.toBeNull()
    result.host.querySelector<HTMLButtonElement>('[lang="zh-CN"]')?.click()
    await settle()
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(result.host.querySelector('#props-heading')?.textContent).toContain('参数设置')
    expect(result.host.querySelector('.tree-frame .virtual-tree')).toBe(tree)
    expect(result.instance.treeData).toBe(data)
    expect(result.instance.targetKey).toBe('node-12')
    expect(checkbox?.checked).toBe(true)
    expect(window.localStorage.getItem('vue-virtual-tree:locale')).toBe('zh')
    result.host.querySelector<HTMLButtonElement>('[lang="en"]')?.click()
    await settle()
    expect(document.documentElement.lang).toBe('en')
    expect(result.host.querySelector('#props-heading')?.textContent).toContain('Settings')
    expect(result.host.querySelector('.tree-frame .virtual-tree')).toBe(tree)
  })

  test('does not reapply default checked or expanded nodes when translating the demo', async () => {
    const result = await mountDemoApp()
    const tree = result.instance.getTree()
    tree.setCheckedKeys([])
    const node = tree.getNode('node-2')!
    node.collapse()
    await settle()
    expect(tree.getCheckedKeys()).toEqual([])
    expect(node.expanded).toBe(false)
    result.host.querySelector<HTMLButtonElement>('[lang="zh-CN"]')?.click()
    await settle()
    expect(tree.getCheckedKeys()).toEqual([])
    expect(node.expanded).toBe(false)
  })

  test('keeps scoped checkbox clicks out of node click and current change events', async () => {
    const result = await mountDemoApp()
    result.host.querySelector<HTMLButtonElement>('.content-mode-button')?.click()
    await settle()
    result.instance.eventLog = []

    const checkbox = result.host.querySelector<HTMLInputElement>('.custom-node-content .node-checkbox')
    expect(checkbox).not.toBeNull()
    checkbox?.click()
    await settle()

    const names = result.instance.eventLog.map(({ name }) => name)
    expect(names).toContain('check')
    expect(names).not.toContain('node-click')
    expect(names).not.toContain('current-change')
  })

  test('normalizes unsafe numeric options before remounting the shared demo', async () => {
    const result = await mountDemoApp()
    Object.assign(result.instance.draftOptions, {
      height: Number.POSITIVE_INFINITY,
      indent: -20,
      itemSize: Number.NaN,
    })

    result.instance.applyAndRemount()
    await settle()

    expect(result.instance.appliedOptions).toMatchObject({
      height: 420,
      indent: 0,
      itemSize: 28,
    })

    Object.assign(result.instance.draftOptions, {
      height: 10_000,
      indent: 1_000,
      itemSize: 0,
    })
    result.instance.applyAndRemount()
    await settle()

    expect(result.instance.appliedOptions).toMatchObject({
      height: 2_000,
      indent: 100,
      itemSize: 1,
    })
  })

  test('keeps logical metrics equal to the external data after demo mutations', async () => {
    const result = await mountDemoApp()
    result.instance.targetKey = 'node-250'

    await result.instance.runNamedMethod('append')
    expect(result.instance.totalNodes).toBe(1_001)
    expect(result.instance.totalNodes).toBe(countTreeNodes(result.instance.treeData))

    result.instance.targetKey = 'mutation-1'
    await result.instance.runNamedMethod('remove')
    expect(result.instance.totalNodes).toBe(1_000)
    expect(result.instance.totalNodes).toBe(countTreeNodes(result.instance.treeData))
  })

  test('summarizes a 100k result before serialization traverses the full array', () => {
    let labelReads = 0
    const largeResult = Array.from({ length: 100_000 }, (_, index) => ({
      id: `node-${index}`,
      get label() {
        labelReads += 1
        return `Node ${index}`
      },
    }))

    const serialized = demoAppMethods.serializeValue.call({}, largeResult)
    const summary = JSON.parse(serialized) as { sample: unknown[]; total: number }

    expect(summary.total).toBe(100_000)
    expect(summary.sample.length).toBeGreaterThan(0)
    expect(summary.sample.length).toBeLessThanOrEqual(5)
    expect(labelReads).toBeLessThanOrEqual(5)
  })

  test('cancels demo timers on remount and unmount', async () => {
    const result = await mountDemoApp()
    vi.useFakeTimers()
    result.instance.draftOptions.lazy = true
    result.instance.applyAndRemount()
    await settle()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    result.instance.resetScenario()
    await settle()
    await vi.runAllTimersAsync()
    expect(result.instance.totalNodes).toBe(1_000)

    result.instance.draftOptions.lazy = true
    result.instance.applyAndRemount()
    await settle()
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    result.unmount()
    result.host.remove()
    expect(vi.getTimerCount()).toBe(0)
  })

  test('keeps a newer dataset load busy when it cancels an older method wait', async () => {
    const result = await mountDemoApp()
    vi.useFakeTimers()

    const staleMethodRun = result.instance.runNamedMethod('scrollToItem')
    await settle()
    expect(result.instance.busy).toBe(false)

    const datasetLoad = result.instance.loadDataset(100_000)
    expect(result.instance.busy).toBe(true)
    expect(result.instance.busyLabel).toBe('Generating 100,000 nodes')

    await staleMethodRun
    expect(result.instance.busy).toBe(true)
    expect(result.instance.busyLabel).toBe('Generating 100,000 nodes')

    await vi.runAllTimersAsync()
    await datasetLoad
    expect(result.instance.busy).toBe(false)
    expect(result.instance.busyLabel).toBe('')
  })

  test('does not start or report a frame sample without scroll distance', () => {
    const scroller = document.createElement('div')
    scroller.className = 'virtual-tree'
    scroller.style.height = '100px'
    const frame = document.createElement('div')
    frame.className = 'tree-frame'
    frame.appendChild(scroller)
    document.body.appendChild(frame)
    const context = {
      addBenchmark: vi.fn(),
      beginBusy: vi.fn(() => 1),
      benchmarks: [] as unknown[],
      busy: false,
      endBusy: vi.fn(),
      frameSummary: { frameCount: 0, p95Ms: null, longFrames: 0 },
      recordMethodResult: vi.fn(),
      refreshObservedMetrics: vi.fn(async () => {}),
    }

    void demoAppMethods.sampleScrollFrames.call(context)

    expect(context.beginBusy).not.toHaveBeenCalled()
    expect(context.addBenchmark).not.toHaveBeenCalled()
  })

  test('loads the demo virtual root key before resolving one lazy level at a time', async () => {
    vi.useFakeTimers()
    const context = Object.assign(createDemoAsyncContext(), {
      $nextTick: () => new Promise<void>(() => {}),
      refreshObservedMetrics: vi.fn(async () => {}),
      totalNodes: 0,
      treeData: [] as DemoTreeNode[],
      waitForStablePaint: vi.fn(async () => false),
    })
    const resolveNode = async (node: { data: DemoTreeNode | DemoTreeNode[]; level: number }) => {
      let resolved: DemoTreeNode[] | undefined
      demoAppMethods.loadLazyNode.call(context, node, (children) => {
        resolved = children
      })
      await vi.advanceTimersByTimeAsync(180)
      expect(resolved).toBeDefined()
      return resolved!
    }

    const roots = await resolveNode({ data: [], level: 0 })
    expect(roots.map(({ id }) => id)).toEqual(['lazy-root'])
    expect(roots[0]?.children).toBeUndefined()
    expect(context.totalNodes).toBe(1)

    const levelTwo = await resolveNode({ data: roots[0]!, level: 1 })
    expect(levelTwo.map(({ id }) => id)).toEqual(
      Array.from({ length: 6 }, (_, index) => `lazy-root-${index + 1}`),
    )
    expect(levelTwo.every(({ leaf, children }) => leaf === false && children === undefined)).toBe(true)
    expect(context.totalNodes).toBe(7)

    const levelThree = await resolveNode({ data: levelTwo[0]!, level: 2 })
    expect(levelThree.map(({ id }) => id)).toEqual(
      Array.from({ length: 6 }, (_, index) => `lazy-root-1-${index + 1}`),
    )
    expect(levelThree.every(({ leaf }) => leaf === true)).toBe(true)
    expect(context.totalNodes).toBe(13)
  })

  test('turns off default expansion only while the demo lazy mode is selected', () => {
    const state = {
      appliedOptions: { highlightCurrent: true },
      draftOptions: { defaultExpandAll: true, lazy: false },
    }
    const input = document.createElement('input')

    input.checked = true
    demoAppMethods.setDraftBoolean.call(state, 'lazy', { target: input } as unknown as Event)
    expect(state.draftOptions).toMatchObject({ lazy: true, defaultExpandAll: false })

    input.checked = false
    demoAppMethods.setDraftBoolean.call(state, 'lazy', { target: input } as unknown as Event)
    expect(state.draftOptions).toMatchObject({ lazy: false, defaultExpandAll: true })
  })

  test('enforces collapsed defaults when applying the demo lazy scenario', () => {
    const state = Object.assign(createDemoAsyncContext(), {
      appliedOptions: {},
      draftOptions: { defaultExpandAll: true, lazy: true },
      normalizeDraftNumbers: vi.fn(),
      refreshObservedMetrics: vi.fn(async () => {}),
      targetKey: '',
      totalNodes: 0,
      treeData: [] as DemoTreeNode[],
      treeVersion: 0,
    })

    demoAppMethods.applyAndRemount.call(state)

    expect(state.draftOptions.defaultExpandAll).toBe(false)
    expect(state.appliedOptions.defaultExpandAll).toBe(false)
    expect(state.targetKey).toBe('lazy-root')
  })

  test('mounts a minimal tree and renders scoped slot props', async () => {
    const result = await mountTree({ useSlot: true })

    expect(result.host.querySelectorAll('.virtual-tree-node')).toHaveLength(2)
    expect(
      Array.from(result.host.querySelectorAll('.slot-label'), (element) =>
        element.textContent,
      ),
    ).toEqual(['slot:Root', 'slot:Child'])
  })

  test('normalizes a numeric tree height to CSS pixels', async () => {
    const result = await mountTree({ height: 260 })
    const scroller = result.host.querySelector<HTMLElement>('.virtual-tree')

    expect(scroller?.style.height).toBe('260px')
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
