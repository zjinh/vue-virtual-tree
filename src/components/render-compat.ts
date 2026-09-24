import { h, version } from 'vue'
import * as Vue from 'vue'
import type { Component, VNode } from 'vue'

export const isVue2 = version.startsWith('2.')

// These optional exports are read dynamically: Vue 2 bundlers must not try to
// resolve Vue 3-only named exports, even in branches that never execute there.
const vue3Comment = isVue2 ? undefined : Reflect.get(Vue, 'Comment')
const vue3Fragment = isVue2 ? undefined : Reflect.get(Vue, 'Fragment')
const vue3DisplayString = isVue2 ? undefined : Reflect.get(Vue, 'toDisplayString') as
  ((value: unknown) => string) | undefined

type Renderer = (
  type: string | Component,
  data: Record<string, unknown>,
  children?: unknown,
) => VNode

interface RenderContext {
  $createElement?: Renderer
}

type Slot = (props: Record<string, unknown>) => VNode[] | undefined

export function getDefaultSlot(context: object): Slot | undefined {
  const instance = context as { $scopedSlots?: { default?: Slot }; $slots: { default?: Slot } }
  return isVue2 ? instance.$scopedSlots?.default : instance.$slots.default
}

export function hasSlotContent(nodes: VNode[] | undefined): boolean {
  if (isVue2) {
    if (!nodes?.length) return false
    // Vue 2 falls back only for a single ordinary comment. Multiple conditional
    // placeholders remain valid slot content, as do pending async components.
    const first = nodes[0] as unknown as { isComment?: boolean; asyncFactory?: unknown }
    return nodes.length > 1 || !first.isComment || !!first.asyncFactory
  }
  return !!nodes?.some((node) => {
    if ((node as unknown as { type: unknown }).type === vue3Comment) return false
    if ((node as unknown as { type: unknown }).type === vue3Fragment) return hasSlotContent(node.children as VNode[])
    return true
  })
}

export function displayLabel(context: object, value: unknown): string {
  if (!isVue2) return vue3DisplayString!(value)
  return (context as { _s(value: unknown): string })._s(value)
}

interface RenderData {
  class?: unknown
  style?: unknown
  ref?: string
  key?: string | number
  attrs?: Record<string, unknown>
  props?: Record<string, unknown>
  domProps?: Record<string, unknown>
  on?: Record<string, Function>
  nativeOn?: Record<string, Function>
  scopedSlots?: Record<string, Function>
}

// Keep the Vue 2 VNode data boundary in one place. Only APIs shared by Vue 2.7
// and Vue 3 are imported, so the exact same bundle can load in either runtime.
export function renderCompat(
  context: object,
  type: string | Component,
  data: RenderData = {},
  children?: unknown,
): VNode {
  if (isVue2) {
    return ((context as RenderContext).$createElement ?? h as Renderer)(type, { ...data }, children)
  }
  const { attrs, props, domProps, on, nativeOn, scopedSlots, ...shared } = data
  const vnodeProps: Record<string, unknown> = {
    ...shared, ...attrs, ...props, ...domProps,
  }
  for (const [event, handler] of Object.entries({ ...on, ...nativeOn })) {
    const name = event.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    vnodeProps[`on${name[0].toUpperCase()}${name.slice(1)}`] = handler
  }
  return (h as Renderer)(type, vnodeProps, scopedSlots ?? children)
}

export function stopEvent<Args extends unknown[]>(
  handler?: (event: Event, ...args: Args) => void,
): (event: Event, ...args: Args) => void {
  return (event, ...args) => {
    event.stopPropagation()
    handler?.(event, ...args)
  }
}
