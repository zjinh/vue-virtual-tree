import { describe, expect, it } from 'vitest'

import {
  countTreeNodes,
  createLazyChildren,
  createLazyDemoData,
  generateTreeData,
  listTreeKeys,
} from '../../examples/shared/data'

describe('generateTreeData', () => {
  it.each([1, 1_000, 10_000])('generates exactly %i logical nodes', (total) => {
    const tree = generateTreeData(total)

    expect(countTreeNodes(tree)).toBe(total)
  })

  it('generates stable, unique keys and a deterministic hierarchy', () => {
    const first = generateTreeData(137, { branchingFactor: 6 })
    const second = generateTreeData(137, { branchingFactor: 6 })
    const keys = listTreeKeys(first)

    expect(first).toEqual(second)
    expect(new Set(keys).size).toBe(137)
    expect(keys).toEqual(Array.from({ length: 137 }, (_, index) => `node-${index + 1}`))
    expect(first[0]?.level).toBe(1)
    expect(first[0]?.children[0]?.level).toBe(2)
    expect(first[0]?.children[0]?.children[0]?.level).toBe(3)
  })

  it('returns no nodes for a non-positive total', () => {
    expect(generateTreeData(0)).toEqual([])
    expect(generateTreeData(-1)).toEqual([])
  })

  it('creates an unresolved lazy root without precomputed children', () => {
    expect(createLazyDemoData()).toEqual([
      {
        id: 'lazy-root',
        label: 'Lazy workspace root',
        level: 1,
        leaf: false,
      },
    ])
  })

  it('marks only the final lazy level as leaf nodes', () => {
    const levelTwo = createLazyChildren(createLazyDemoData()[0]!)
    const levelThree = createLazyChildren(levelTwo[0]!)

    expect(levelTwo).toHaveLength(6)
    expect(levelTwo.every(({ leaf }) => leaf === false)).toBe(true)
    expect(levelThree).toHaveLength(6)
    expect(levelThree.every(({ leaf }) => leaf === true)).toBe(true)
  })
})
