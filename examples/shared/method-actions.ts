import type { DemoTreeNode } from './data'

export interface DemoTreeApi {
  [method: string]: (...args: any[]) => any
}

export interface MethodActionContext {
  tree: DemoTreeApi
  targetKey: string
  targetNode: DemoTreeNode
  query: string
  createMutationNode(label: string): DemoTreeNode
}

export interface MethodAction {
  label: string
  run(context: MethodActionContext): unknown
}

export const METHOD_ACTIONS: Record<string, MethodAction> = {
  filter: {
    label: 'Apply current filter',
    run: ({ tree, query }) => tree.filter(query),
  },
  scrollToItem: {
    label: 'Scroll to target',
    run: ({ tree, targetKey }) => tree.scrollToItem(targetKey, 18, false),
  },
  getNodePath: {
    label: 'Read target path',
    run: ({ tree, targetKey }) => tree.getNodePath(targetKey),
  },
  getCheckedNodes: {
    label: 'Read checked nodes',
    run: ({ tree }) => tree.getCheckedNodes(false, true),
  },
  getCheckedKeys: {
    label: 'Read checked keys',
    run: ({ tree }) => tree.getCheckedKeys(false),
  },
  getCurrentNode: {
    label: 'Read current node',
    run: ({ tree }) => tree.getCurrentNode(),
  },
  getCurrentKey: {
    label: 'Read current key',
    run: ({ tree }) => tree.getCurrentKey(),
  },
  setCheckedNodes: {
    label: 'Check target node',
    run: ({ tree, targetNode }) => tree.setCheckedNodes([targetNode], false),
  },
  setCheckedKeys: {
    label: 'Check target key',
    run: ({ tree, targetKey }) => tree.setCheckedKeys([targetKey], false),
  },
  setChecked: {
    label: 'Deep-check target',
    run: ({ tree, targetKey }) => tree.setChecked(targetKey, true, true),
  },
  setCheckedAll: {
    label: 'Check all nodes',
    run: ({ tree }) => tree.setCheckedAll(true),
  },
  getHalfCheckedNodes: {
    label: 'Read half-checked nodes',
    run: ({ tree }) => tree.getHalfCheckedNodes(),
  },
  getHalfCheckedKeys: {
    label: 'Read half-checked keys',
    run: ({ tree }) => tree.getHalfCheckedKeys(),
  },
  getSelectedLeafNodes: {
    label: 'Read selected leaves',
    run: ({ tree }) => tree.getSelectedLeafNodes(),
  },
  getSelectedLeafKeys: {
    label: 'Read selected leaf keys',
    run: ({ tree }) => tree.getSelectedLeafKeys(),
  },
  setCurrentNode: {
    label: 'Set current node',
    run: ({ tree, targetNode }) => tree.setCurrentNode(targetNode),
  },
  setCurrentKey: {
    label: 'Set current key',
    run: ({ tree, targetKey }) => tree.setCurrentKey(targetKey),
  },
  getNode: {
    label: 'Read wrapped node',
    run: ({ tree, targetKey }) => tree.getNode(targetKey),
  },
  remove: {
    label: 'Remove target node',
    run: ({ tree, targetKey }) => tree.remove(targetKey),
  },
  append: {
    label: 'Append child',
    run: ({ tree, targetKey, createMutationNode }) => tree.append(
      createMutationNode('Appended child'),
      targetKey,
    ),
  },
  insertBefore: {
    label: 'Insert before target',
    run: ({ tree, targetKey, createMutationNode }) => tree.insertBefore(
      createMutationNode('Inserted before'),
      targetKey,
    ),
  },
  insertAfter: {
    label: 'Insert after target',
    run: ({ tree, targetKey, createMutationNode }) => tree.insertAfter(
      createMutationNode('Inserted after'),
      targetKey,
    ),
  },
  updateKeyChildren: {
    label: 'Replace target children',
    run: ({ tree, targetKey, createMutationNode }) => tree.updateKeyChildren(
      targetKey,
      [createMutationNode('Replacement child A'), createMutationNode('Replacement child B')],
    ),
  },
}
