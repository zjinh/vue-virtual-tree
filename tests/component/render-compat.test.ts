import { afterEach, describe, expect, test } from 'vitest'
import * as Vue from 'vue'
import { checkbox, cleanupTrees, labels, mountTree, row, settle } from './tree-harness'

declare const __VUE_RUNTIME__: 'vue2' | 'vue3'

afterEach(cleanupTrees)

describe(`${__VUE_RUNTIME__} universal rendering`, () => {
  test('retains scoped selectors on rows, native checkboxes and their wrappers', async () => {
    const { host } = await mountTree()
    expect(row(host, 'Alpha').hasAttribute('data-v-vvt-node')).toBe(true)
    expect(checkbox(host, 'Alpha').hasAttribute('data-v-vvt-checkbox')).toBe(true)
    expect(checkbox(host, 'Alpha').parentElement?.hasAttribute('data-v-vvt-checkbox')).toBe(true)
  })

  test('uses built-in row content when the custom slot returns an empty array', async () => {
    const { host } = await mountTree({}, () => [])
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
  })

  test('uses built-in row content for a conditional slot containing only a comment', async () => {
    const { host } = await mountTree({}, (_scope, h) => __VUE_RUNTIME__ === 'vue2'
      ? h()
      : Vue.createCommentVNode('v-if'))
    expect(labels(host)).toEqual(['Parent', 'Alpha', 'Beta', 'Sibling'])
  })

  test('preserves each runtime fallback for two hidden conditional slot children', async () => {
    const { host } = await mountTree({}, (_scope, h) => __VUE_RUNTIME__ === 'vue2'
      ? [h(), h()]
      : [Vue.createCommentVNode('v-if'), Vue.createCommentVNode('v-if')])
    expect(labels(host)).toEqual(__VUE_RUNTIME__ === 'vue2'
      ? []
      : ['Parent', 'Alpha', 'Beta', 'Sibling'])
    expect(host.querySelector('input') === null).toBe(__VUE_RUNTIME__ === 'vue2')
  })

  test('keeps pending async custom rows instead of flashing built-in controls', async () => {
    let resolveRow!: (value: object) => void
    const promise = new Promise<object>((resolve) => { resolveRow = resolve })
    const AsyncRow = Vue.defineAsyncComponent(() => promise)
    const { host } = await mountTree({}, (_scope, h) => h(AsyncRow))
    expect(labels(host)).toEqual([])
    expect(host.querySelector('input')).toBeNull()
    expect(host.querySelector('.expand-icon')).toBeNull()
    resolveRow({ render() { return Vue.h('span', 'Async row') } })
    await promise
    await settle()
    expect(host.textContent).toBe('Async row'.repeat(4))
    expect(host.querySelector('.name')).toBeNull()
  })

  test.each([
    [{ title: 'A' }, '{\n  "title": "A"\n}'],
    [['A', 'B'], '[\n  "A",\n  "B"\n]'],
    [0, '0'],
    [null, ''],
  ])('preserves Vue template interpolation for %j', async (value, expected) => {
    const { host } = await mountTree({ props: { label: () => value } })
    expect(labels(host)).toEqual(Array(4).fill(expected))
  })

  test('preserves existing native contextmenu behavior while emitting the original event', async () => {
    const { host, events } = await mountTree()
    let outerEvents = 0
    host.addEventListener('contextmenu', () => { outerEvents += 1 })
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    row(host, 'Alpha').dispatchEvent(event)
    expect(events['node-contextmenu']).toHaveLength(1)
    expect(event.defaultPrevented).toBe(__VUE_RUNTIME__ === 'vue2')
    expect(outerEvents).toBe(__VUE_RUNTIME__ === 'vue2' ? 0 : 1)
  })
})
