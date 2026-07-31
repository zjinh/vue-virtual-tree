export interface DemoTreeNode {
  id: string
  label: string
  level: number
  children?: DemoTreeNode[]
  disabled?: boolean
  leaf?: boolean
}

export interface TreeGenerationOptions {
  branchingFactor?: number
}

export const BENCHMARK_PRESETS = [1_000, 10_000, 50_000, 100_000] as const

export function generateTreeData(
  total: number,
  { branchingFactor = 10 }: TreeGenerationOptions = {},
): DemoTreeNode[] {
  const normalizedTotal = Math.max(0, Math.floor(total))
  if (normalizedTotal === 0) return []

  const normalizedBranchingFactor = Math.max(2, Math.floor(branchingFactor))
  const root: DemoTreeNode = {
    id: 'node-1',
    label: 'Workspace 1',
    level: 1,
    children: [],
  }
  const queue = [root]
  let parentIndex = 0
  let nextId = 2

  while (nextId <= normalizedTotal) {
    const parent = queue[parentIndex]
    if (!parent) break
    parent.children ??= []

    for (
      let childIndex = 0;
      childIndex < normalizedBranchingFactor && nextId <= normalizedTotal;
      childIndex += 1
    ) {
      const child: DemoTreeNode = {
        id: `node-${nextId}`,
        label: `Package node-${nextId}`,
        level: parent.level + 1,
        children: [],
        disabled: nextId % 29 === 0,
      }
      parent.children.push(child)
      queue.push(child)
      nextId += 1
    }
    parentIndex += 1
  }

  for (let index = queue.length - 1; index >= 0; index -= 1) {
    if (queue[index]?.children?.length === 0) delete queue[index]?.children
  }
  return [root]
}

export function countTreeNodes(nodes: DemoTreeNode[]): number {
  let total = 0
  const queue = [...nodes]
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]
    if (!node) continue
    total += 1
    if (node.children) queue.push(...node.children)
  }
  return total
}

export function listTreeKeys(nodes: DemoTreeNode[]): string[] {
  const keys: string[] = []
  const queue = [...nodes]
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]
    if (!node) continue
    keys.push(node.id)
    if (node.children) queue.push(...node.children)
  }
  return keys
}

export function findTreeNode(
  nodes: DemoTreeNode[],
  key: string,
): DemoTreeNode | null {
  const queue = [...nodes]
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]
    if (!node) continue
    if (node.id === key) return node
    if (node.children) queue.push(...node.children)
  }
  return null
}

export function createLazyDemoData(): DemoTreeNode[] {
  return [{
    id: 'lazy-root',
    label: 'Lazy workspace root',
    level: 1,
    leaf: false,
  }]
}

export function createLazyChildren(node: DemoTreeNode): DemoTreeNode[] {
  const nextLevel = node.level + 1
  return Array.from({ length: nextLevel >= 4 ? 0 : 6 }, (_, index) => ({
    id: `${node.id}-${index + 1}`,
    label: `Loaded ${node.id}-${index + 1}`,
    level: nextLevel,
    leaf: nextLevel >= 3,
  }))
}
