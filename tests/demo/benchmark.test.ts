import { describe, expect, it } from 'vitest'

import {
  calculateVirtualizationRatio,
  countLogicalTreeNodes,
  percentile,
  summarizeFrameSample,
  waitForScrollToItemCompletion,
} from '../../examples/shared/benchmark'

describe('percentile', () => {
  it('returns an interpolated percentile without mutating the sample', () => {
    const sample = [40, 10, 30, 20]

    expect(percentile(sample, 0.95)).toBeCloseTo(38.5)
    expect(sample).toEqual([40, 10, 30, 20])
  })

  it('returns null for an empty sample', () => {
    expect(percentile([], 0.95)).toBeNull()
  })
})

describe('benchmark summaries', () => {
  it('reports real frame count, p95, and long-frame count', () => {
    expect(summarizeFrameSample([8, 16, 18, 55])).toEqual({
      frameCount: 4,
      p95Ms: 49.44999999999999,
      longFrames: 1,
    })
  })

  it('calculates rendered-to-logical virtualization percentage', () => {
    expect(calculateVirtualizationRatio(60, 10_000)).toBe(99.4)
    expect(calculateVirtualizationRatio(0, 0)).toBeNull()
    expect(calculateVirtualizationRatio(4, 2)).toBe(0)
  })

  it('counts current model nodes after runtime mutations', () => {
    const root = {
      childNodes: [
        { childNodes: [] },
        { childNodes: [{ childNodes: [] }] },
      ],
    }

    expect(countLogicalTreeNodes(root)).toBe(3)
    root.childNodes.pop()
    expect(countLogicalTreeNodes(root)).toBe(1)
  })

  it('waits beyond the component 50ms positioning timer before reporting scroll completion', async () => {
    const order: string[] = []
    let requestedDelay = 0

    await waitForScrollToItemCompletion({
      nextTick: async () => { order.push('nextTick') },
      wait: async (delay) => {
        requestedDelay = delay
        order.push('wait')
      },
      afterPaint: async () => { order.push('paint') },
    })

    expect(requestedDelay).toBeGreaterThan(50)
    expect(order).toEqual(['nextTick', 'wait', 'paint'])
  })
})
