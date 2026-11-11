import { afterEach, expect, test } from 'vitest'
import { cleanupTrees, mountTree, settle } from './tree-harness'

afterEach(cleanupTrees)

test('raw children reassignment after null-to-null row reuse retains array replacement', async () => {
  const data = Array.from({ length: 200 }, (_, id) => ({ id, label: 'Node ' + id, children: null as any }))
  const { instance, host, props } = await mountTree({ data, height: 520 })
  const scroller = host.querySelector<HTMLElement>('.virtual-tree')!
  scroller.scrollTop = 100 * 26
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
  const node = instance.getNode(100)!
  const before = node.childNodes
  props.data![100].children = []
  await settle()
  expect(node.childNodes).not.toBe(before)
})
