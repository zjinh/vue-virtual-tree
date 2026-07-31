export interface FrameSummary {
  frameCount: number
  p95Ms: number | null
  longFrames: number
}

export interface LogicalTreeNode {
  childNodes?: LogicalTreeNode[]
}

export interface ScrollCompletionDependencies {
  nextTick(): Promise<void>
  wait?(delayMs: number): Promise<void>
  afterPaint?(): Promise<void>
}

export const SCROLL_POSITIONING_COMPLETION_DELAY_MS = 55

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
  const percentage = Math.round((1 - renderedNodes / logicalNodes) * 1_000) / 10
  return Math.max(0, Math.min(100, percentage))
}

export function countLogicalTreeNodes(root: LogicalTreeNode): number {
  const queue = [...(root.childNodes ?? [])]
  let count = 0
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]
    if (!node) continue
    count += 1
    if (node.childNodes) queue.push(...node.childNodes)
  }
  return count
}

export function nextAnimationFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

export async function waitForStablePaint(nextTick: () => Promise<void>): Promise<void> {
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()
}

export async function waitForScrollToItemCompletion({
  nextTick,
  wait = (delayMs) => new Promise((resolve) => window.setTimeout(resolve, delayMs)),
  afterPaint = async () => {
    await nextAnimationFrame()
    await nextAnimationFrame()
  },
}: ScrollCompletionDependencies): Promise<void> {
  await nextTick()
  await wait(SCROLL_POSITIONING_COMPLETION_DELAY_MS)
  await afterPaint()
}

export function readBrowserMemory(): number | null {
  const candidate = performance as Performance & {
    memory?: { usedJSHeapSize?: number }
  }
  return typeof candidate.memory?.usedJSHeapSize === 'number'
    ? candidate.memory.usedJSHeapSize
    : null
}
