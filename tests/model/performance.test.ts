import { describe, expect, it } from 'vitest'
import TreeStore from '../../src/model/tree-store'

interface Item { id: string | number; label?: string; disabled?: boolean; children?: Item[] }

describe('model performance contracts', () => {
  it('replaces the public child array during explicit synchronization', () => {
    const store = new TreeStore<Item>({ data: [{ id: 1, children: [{ id: 11 }] }], key: 'id' })
    const parent = store.getNode(1)!
    const before = parent.childNodes
    parent.updateChildren()
    expect(parent.childNodes).not.toBe(before)
    expect(parent.childNodes[0]).toBe(before[0])
  })
  it('preserves redefining and deleting the load version field', () => {
    const store = new TreeStore<Item>({ data: [{ id: 1 }], key: 'id' })
    const node = store.getNode(1)!
    Object.defineProperty(node, '_loadVersion', { value: 7, configurable: true, writable: true, enumerable: true })
    expect(node._loadVersion).toBe(7)
    expect(Object.keys(node)).toContain('_loadVersion')
    expect(Reflect.deleteProperty(node, '_loadVersion')).toBe(true)
    node._loadVersion = 0
    expect(node._loadVersion).toBe(0)
  })
  it('clears selection state on ancestors without registered keys', () => {
    const store = new TreeStore<Item>({
      data: [{ children: [{ id: 1 }, { id: 2 }] } as Item], key: 'id',
    })
    store.setCheckedKeys([1, 2])
    const parent = store.root!.childNodes[0]
    expect(parent.checked).toBe(true)
    store.setCheckedKeys([])
    expect(parent.checked).toBe(false)
    expect(parent.indeterminate).toBe(false)
    expect(store.getCheckedNodes()).toEqual([])
  })
  it('constructs wide sibling lists without searching data already being traversed', () => {
    let reads = 0
    const children = new Proxy(Array.from({ length: 200 }, (_, id) => ({ id })), {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads += 1
        return Reflect.get(target, key, receiver)
      },
    })
    const store = new TreeStore<Item>({ data: children, key: 'id' })
    expect(store.root!.childNodes.map(node => node.key)).toEqual(Array.from({ length: 200 }, (_, id) => id))
    expect(store.root!.data).toBe(children)
    expect(reads).toBeLessThan(1000)
  })

  it('replaces a wide selection while preserving parent propagation', () => {
    const store = new TreeStore<Item>({
      data: [{ id: 'p', children: Array.from({ length: 200 }, (_, id) => ({ id })) }],
      key: 'id',
      props: { disabled(data) { return !!data.disabled } },
    })
    store.setCheckedAll(true)
    store.setCheckedKeys([0])
    expect(store.getCheckedKeys()).toEqual([0])
    expect(store.getHalfCheckedKeys()).toEqual(['p'])
  })

  it('keeps key coercion, replacement and disabled parent/child behavior', () => {
    const store = new TreeStore<Item>({ data: [{ id: 'p', children: [
      { id: 0 }, { id: 'b', disabled: true },
    ] }, { id: 'other' }], key: 'id' })
    store.setCheckedAll(true)
    store.setCheckedKeys(['0', 'missing'])
    expect(store.getCheckedKeys()).toEqual([0])
    expect(store.getHalfCheckedKeys()).toEqual(['p'])
    store.setCheckedKeys(['p'])
    expect(store.getCheckedKeys()).toEqual([0])
    expect(store.getHalfCheckedKeys()).toEqual(['p'])
    store.setCheckedKeys([])
    expect(store.getCheckedKeys()).toEqual([])
    expect(store.getHalfCheckedKeys()).toEqual([])
  })
})
