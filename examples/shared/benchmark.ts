export interface FrameSummary {
  frameCount: number
  p95Ms: number | null
  longFrames: number
}

export function percentile(values: number[], quantile: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const clampedQuantile = Math.max(0, Math.min(1, quantile))
  const position = (sorted.length - 1) * clampedQuantile
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const lower = sorted[lowerIndex] ?? 0
  const upper = sorted[upperIndex] ?? lower
  return lower + (upper - lower) * (position - lowerIndex)
}

export function summarizeFrameSample(frameDurations: number[]): FrameSummary {
  return {
    frameCount: frameDurations.length,
    p95Ms: percentile(frameDurations, 0.95),
    longFrames: frameDurations.filter((duration) => duration > 50).length,
  }
}

export function calculateVirtualizationRatio(
  renderedNodes: number,
  logicalNodes: number,
): number | null {
  if (logicalNodes <= 0) return null
  return Math.round((1 - renderedNodes / logicalNodes) * 1_000) / 10
}

export function nextAnimationFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

export async function waitForStablePaint(nextTick: () => Promise<void>): Promise<void> {
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()
}

export function readBrowserMemory(): number | null {
  const candidate = performance as Performance & {
    memory?: { usedJSHeapSize?: number }
  }
  return typeof candidate.memory?.usedJSHeapSize === 'number'
    ? candidate.memory.usedJSHeapSize
    : null
}
