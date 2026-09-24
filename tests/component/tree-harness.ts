import * as Vue from 'vue'
import TreeComponent from '@zjinh/vue-virtual-tree'
import type {
  VueVirtualTreeDefaultSlotProps,
  VueVirtualTreeInstance,
  VueVirtualTreeProps,
} from '@zjinh/vue-virtual-tree'

declare const __VUE_RUNTIME__: 'vue2' | 'vue3'

export interface Item {
  id: number
  label: string
  disabled?: boolean
  leaf?: boolean
  children?: Item[]
}

export const fixture = (): Item[] => [
  { id: 1, label: 'Parent', children: [
    { id: 11, label: 'Alpha' },
    { id: 12, label: 'Beta' },
  ] },
  { id: 2, label: 'Sibling' },
]

export const settle = async (): Promise<void> => {
  for (let index = 0; index < 6; index += 1) await Vue.nextTick()
}

type CreateElement = (...args: any[]) => any
type Slot = (scope: VueVirtualTreeDefaultSlotProps<Item>, element: CreateElement) => unknown
const mounted: Array<() => void> = []

export function cleanupTrees(): void {
  while (mounted.length) mounted.pop()!()
}

export async function mountTree(overrides: VueVirtualTreeProps<Item> = {}, slot?: Slot) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const props = Vue.reactive({
    data: fixture(),
    nodeKey: 'id',
    height: 260,
    itemSize: 26,
    defaultExpandAll: true,
    defaultExpandedKeys: undefined,
    defaultCheckedKeys: undefined,
    checkStrictly: false,
    showCheckbox: true,
    highlightCurrent: true,
    props: { label: 'label', children: 'children', disabled: 'disabled', isLeaf: 'leaf' },
    filterNodeMethod: (value: string, data: Item) => data.label.includes(value),
    ...overrides,
  }) as VueVirtualTreeProps<Item>
  const events: Record<string, unknown[][]> = {}
  const names = ['node-click', 'node-expand', 'node-collapse', 'node-contextmenu', 'current-change', 'check-change', 'check']
  const listeners = Object.fromEntries(names.map((name) => [name, (...args: unknown[]) => {
    (events[name] ??= []).push(args)
  }]))
  let instance: VueVirtualTreeInstance<Item> | undefined
  let unmount: () => void
  if (__VUE_RUNTIME__ === 'vue2') {
    const Vue2 = (Vue as unknown as { default: new (options: any) => any }).default
    const app = new Vue2({
      render(h: CreateElement) {
        return h(TreeComponent, {
          props: { ...props },
          ref: 'tree',
          on: listeners,
          scopedSlots: slot ? { default: (scope: VueVirtualTreeDefaultSlotProps<Item>) => slot(scope, h) } : undefined,
        })
      },
    })
    app.$mount()
    host.appendChild(app.$el)
    instance = app.$refs.tree
    unmount = () => app.$destroy()
  } else {
    const runtime = Vue as typeof Vue & { createApp(options: unknown): any }
    const vue3Listeners = Object.fromEntries(Object.entries(listeners).map(([name, listener]) => [
      `on${name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}`, listener,
    ]))
    const app = runtime.createApp({
      render() {
        return runtime.h(TreeComponent, {
          ...props,
          ...vue3Listeners,
          ref: (value: unknown) => { instance = value as VueVirtualTreeInstance<Item> },
        }, slot ? { default: (scope: VueVirtualTreeDefaultSlotProps<Item>) => slot(scope, runtime.h) } : undefined)
      },
    })
    app.mount(host)
    unmount = () => app.unmount()
  }
  mounted.push(() => { unmount(); host.remove() })
  await settle()
  if (!instance) throw new Error('Tree did not mount')
  return { host, instance, props, events }
}

export const labels = (host: HTMLElement): string[] =>
  Array.from(host.querySelectorAll('.virtual-tree-node .name'), (node) => node.textContent ?? '')

export const row = (host: HTMLElement, label: string): HTMLElement => {
  const result = Array.from(host.querySelectorAll<HTMLElement>('.virtual-tree-node'))
    .find((node) => node.querySelector('.name')?.textContent === label)
  if (!result) throw new Error(`Missing rendered tree row: ${label}`)
  return result
}

export const checkbox = (host: HTMLElement, label: string): HTMLInputElement => {
  const result = row(host, label).querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (!result) throw new Error(`Missing checkbox: ${label}`)
  return result
}

export const buttonData = (click: () => void): Record<string, unknown> =>
  __VUE_RUNTIME__ === 'vue2' ? { on: { click } } : { onClick: click }
