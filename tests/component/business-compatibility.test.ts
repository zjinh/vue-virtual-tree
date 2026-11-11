import { afterEach, expect, test } from 'vitest'
import { watch } from 'vue'
import { cleanupTrees, mountTree, settle } from './tree-harness'

afterEach(cleanupTrees)

test('preserves stored type timing, custom override reset and spread shape', async () => {
  const { instance } = await mountTree()
  const node = instance.getNode(11)!
  node.checked = true
  expect(node.type).toBe('2-false-false')
  await settle()
  expect(node.type).toBe('2-true-false')
  node.type = 'business-value'
  node.checked = false
  await settle()
  expect(node.type).toBe('2-false-false')
  expect(Object.keys({ ...node }).filter(key => key.toLowerCase().includes('type'))).toEqual(['type'])
})

test('preserves synchronous observer state sequence during selection replacement', async () => {
  const { instance } = await mountTree()
  instance.setCheckedAll(true)
  const parent = instance.getNode(1)!
  const a = instance.getNode(11)!, b = instance.getNode(12)!
  const trace: boolean[][] = []
  const stop = watch(() => [parent.checked, parent.indeterminate, a.checked, b.checked],
    values => trace.push(values), { flush: 'sync' })
  instance.setCheckedKeys([])
  stop()
  expect(trace).toEqual([
    [true, false, false, true], [false, false, false, true],
    [false, true, false, true], [false, true, false, false], [false, false, false, false],
  ])
})

test.each([false, true])('omits absent control placeholders without changing row elements (checkbox: %s)', async showCheckbox => {
  const { host } = await mountTree({ showCheckbox })
  const rows = Array.from(host.querySelectorAll('.virtual-tree-node'))
  expect(rows).toHaveLength(4)
  for (const row of rows) {
    expect(Array.from(row.childNodes).filter(node => node.nodeType === 8)).toHaveLength(0)
    expect(row.children).toHaveLength(showCheckbox ? 4 : 3)
    expect(row.querySelector('.name')).not.toBeNull()
    expect(row.querySelector('.expand-icon')).not.toBeNull()
    expect(row.querySelectorAll('input')).toHaveLength(showCheckbox ? 1 : 0)
  }
})
