import { afterEach, expect, test } from 'vitest'
import { cleanupTrees, mountTree, settle } from './tree-harness'

afterEach(cleanupTrees)

test('retains the legacy rendering range for custom slot content', async () => {
  const { host } = await mountTree({ data: data(), height: 520 }, ({ node }, h) =>
    h('input', { class: 'slot-edit', value: node.data.label }))
  expect(host.querySelectorAll('.slot-edit')).toHaveLength(100)
  const editor = host.querySelectorAll<HTMLInputElement>('.slot-edit')[60]
  editor.value = 'uncommitted edit'
  const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
  await scroll(scroller, 26)
  expect(host.querySelectorAll('.slot-edit')[60]).toBe(editor)
  expect(editor.value).toBe('uncommitted edit')
})

const data = () => Array.from({ length: 2000 }, (_, id) => ({ id, label: `Node ${id}` }))
const ids = (host: HTMLElement) => Array.from(host.querySelectorAll('.name'), node =>
  Number(node.textContent!.replace('Node ', '')))
const scroll = async (element: HTMLElement, top: number) => {
  element.scrollTop = top
  element.dispatchEvent(new Event('scroll'))
  await settle()
}

test('defaults to two screens at the edges and three in the middle', async () => {
  const { host } = await mountTree({ data: data(), height: 520 })
  const element = host.querySelector<HTMLElement>('.virtual-tree')!
  expect(ids(host)).toEqual(Array.from({ length: 40 }, (_, i) => i))
  await scroll(element, 1000 * 26)
  expect(ids(host)).toEqual(Array.from({ length: 60 }, (_, i) => 980 + i))
  await scroll(element, 1980 * 26)
  expect(ids(host)).toEqual(Array.from({ length: 40 }, (_, i) => 1960 + i))
})

test('covers the viewport after large jumps, fractional rows and immediate reversals', async () => {
  const { host } = await mountTree({ data: data(), height: 515 })
  const element = host.querySelector<HTMLElement>('.virtual-tree')!
  for (const top of [0, 1, 25, 26, 27, 900 * 26 + 13, 1900 * 26, 50 * 26, 1001, 0]) {
    await scroll(element, top)
    const rendered = ids(host)
    expect(rendered.length).toBeLessThanOrEqual(60)
    const first = Math.floor(top / 26)
    const last = Math.ceil((top + 515) / 26) - 1
    for (let i = first; i <= last; i++) expect(rendered).toContain(i)
    expect(rendered).toEqual(Array.from({ length: rendered.length }, (_, i) => rendered[0] + i))
  }
  // Several scroll events in one turn must render the final viewport.
  for (const top of [30000, 500, 45000]) {
    element.scrollTop = top
    element.dispatchEvent(new Event('scroll'))
  }
  await settle()
  expect(ids(host)).toContain(Math.floor(45000 / 26))
  expect(ids(host)).toContain(Math.ceil((45000 + 515) / 26) - 1)
})

test('retains checked and current state across row unmounts and distant navigation', async () => {
  const { host, instance } = await mountTree({ data: data(), height: 520 })
  const element = host.querySelector<HTMLElement>('.virtual-tree')!
  instance.setChecked(5, true)
  instance.setCurrentKey(5)
  await settle()
  await instance.scrollToItem(1500, 18, false)
  await settle()
  expect(ids(host)).toContain(1500)
  expect(ids(host)).not.toContain(5)
  expect(instance.getCheckedKeys()).toEqual([5])
  expect(instance.getCurrentKey()).toBe(5)
  await scroll(element, 0)
  const row = Array.from(host.querySelectorAll('.virtual-tree-node'))
    .find(node => node.querySelector('.name')?.textContent === 'Node 5')!
  expect(row.classList.contains('is-current')).toBe(true)
  expect(row.querySelector<HTMLInputElement>('input')!.checked).toBe(true)
})

test('renders short, filtered, replaced and empty datasets within the reduced window', async () => {
  const { host, instance, props } = await mountTree({ data: data(), height: 520 })
  instance.filter('Node 1999')
  await settle()
  expect(ids(host)).toEqual([1999])
  instance.filter('')
  await settle()
  expect(ids(host)).toHaveLength(40)
  props.data = data().slice(0, 7)
  await settle()
  expect(ids(host)).toEqual([0, 1, 2, 3, 4, 5, 6])
  props.data = []
  await settle()
  expect(ids(host)).toEqual([])
  props.data = data()
  await settle()
  expect(ids(host)).toHaveLength(40)
})
