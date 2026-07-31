import type { Component } from 'vue'

import TreeComponent from './index.vue'
import ModelNode from './model/node'
import ModelTreeStore from './model/tree-store'

export type TreeKey = string | number
export type TreeNodeData = object
export type TreeDataKey<T extends TreeNodeData> = Extract<keyof T, string>
export type KeysMatching<T extends object, Value> = {
  [Key in keyof T]-?:
    [NonNullable<T[Key]>] extends [never]
      ? never
      : NonNullable<T[Key]> extends Value
        ? Key
        : never
}[keyof T] & string
export type TreeNodeKey<T extends TreeNodeData> = KeysMatching<T, TreeKey>
export type TreeChildrenKey<T extends TreeNodeData> = KeysMatching<T, T[]>
export type TreeBooleanKey<T extends TreeNodeData> = KeysMatching<T, boolean>
export type TreePropertyGetter<
  T extends TreeNodeData,
  Value = unknown,
> = (data: T, node: Node<T>) => Value
export type TreeProperty<
  T extends TreeNodeData,
  Value = unknown,
> = KeysMatching<T, Value> | TreePropertyGetter<T, Value>
export type TreeOptionProps<T extends TreeNodeData = TreeNodeData> = {
  children?: TreeChildrenKey<T>
  label?: TreeProperty<T>
  disabled?: TreeProperty<T>
  isLeaf?: TreeProperty<T, boolean>
} & Partial<Record<string, TreeProperty<T>>>

export type LoadResolve<T extends TreeNodeData> = (data: T[]) => void
export type LoadFunction<T extends TreeNodeData = TreeNodeData> = (
  node: Node<T>,
  resolve: LoadResolve<T>,
) => void
export type FilterFunction<
  T extends TreeNodeData = TreeNodeData,
  Value = unknown,
> = {
  bivarianceHack(value: Value, data: T, node: Node<T>): boolean
}['bivarianceHack']

export interface NodeOptions<T extends TreeNodeData> {
  data: T | T[]
  store: TreeStore<T>
  parent?: Node<T> | null
  checked?: boolean
  indeterminate?: boolean
  expanded?: boolean
  visible?: boolean
  isCurrent?: boolean
}

export type NodeChildOptions<T extends TreeNodeData> = Omit<
  NodeOptions<T>,
  'data' | 'store'
> & { data: T; store?: TreeStore<T> }

export type NodeChildDefaults<T extends TreeNodeData> = Partial<
  Pick<Node<T>, 'checked' | 'indeterminate' | 'expanded' | 'visible'>
>

export interface Node<T extends TreeNodeData = TreeNodeData> {
  id: number
  text: unknown | null
  checked: boolean
  indeterminate: boolean
  data: T
  expanded: boolean
  parent: Node<T> | null
  visible: boolean
  isCurrent: boolean
  type: unknown | null
  store: TreeStore<T>
  level: number
  loaded: boolean
  childNodes: Node<T>[]
  loading: boolean
  isLeafByUser?: boolean
  isLeaf: boolean
  readonly label: unknown
  readonly key: TreeKey | null | undefined
  readonly disabled: unknown
  readonly nextSibling: Node<T> | null | undefined
  readonly previousSibling: Node<T> | null
  setData(data: T | T[]): void
  contains(target: Node<T>, deep?: boolean): boolean
  remove(): void
  insertChild(child: Node<T> | NodeChildOptions<T>, index?: number, batch?: boolean): void
  insertBefore(child: Node<T> | NodeChildOptions<T>, ref?: Node<T>): void
  insertAfter(child: Node<T> | NodeChildOptions<T>, ref?: Node<T>): void
  removeChild(child: Node<T>): void
  removeChildByData(data: T): void
  expand(callback?: (() => void) | null, expandParent?: boolean): void
  doCreateChildren(data: T[], defaults?: NodeChildDefaults<T>): void
  collapse(): void
  shouldLoadData(): boolean | LoadFunction<T> | null | undefined
  updateLeafState(): void
  setChecked(
    value: boolean | 'half',
    deep?: boolean,
    recursion?: boolean,
    passValue?: boolean,
  ): void
  getChildren(forceInit?: boolean): T[] | null
  updateChildren(): void
  loadData(
    callback?: (children?: T[]) => void,
    defaults?: NodeChildDefaults<T>,
  ): void
}

export type TreeNode<T extends TreeNodeData = TreeNodeData> = Node<T>

export interface TreeStoreOptions<T extends TreeNodeData> {
  data: T[]
  key?: TreeNodeKey<T> | null
  props?: TreeOptionProps<T> | null
  lazy?: boolean | null
  load?: LoadFunction<T> | null
  currentNodeKey?: TreeKey | null
  checkStrictly?: boolean | null
  checkDescendants?: boolean | null
  defaultCheckedKeys?: TreeKey[] | null
  defaultExpandedKeys?: TreeKey[] | null
  autoExpandParent?: boolean | null
  defaultExpandAll?: boolean | null
  filterNodeMethod?: FilterFunction<T> | null
  selectChildrenOnly?: boolean | null
  renderAfterExpand?: boolean | null
  expandOnClickNode?: boolean | null
  checkOnClickNode?: boolean | null
  accordion?: boolean | null
  indent?: number | null
}

export type TreeNodeReference<T extends TreeNodeData> = TreeKey | T | Node<T>

export interface VueVirtualTreeRenderContext<
  T extends TreeNodeData = TreeNodeData,
> {
  node: Node<T>
  data: T
  store: TreeStore<T>
}

export type VueVirtualTreeRenderContent<
  T extends TreeNodeData = TreeNodeData,
> = (
  createElement: (...args: unknown[]) => unknown,
  context: VueVirtualTreeRenderContext<T>,
) => unknown

export interface VueVirtualTreeProps<
  T extends TreeNodeData = TreeNodeData,
> {
  data?: T[]
  emptyText?: string
  nodeKey?: TreeNodeKey<T>
  checkStrictly?: boolean
  defaultExpandAll?: boolean
  checkDescendants?: boolean
  selectChildrenOnly?: boolean
  itemSize?: number
  autoExpandParent?: boolean
  defaultCheckedKeys?: TreeKey[]
  defaultExpandedKeys?: TreeKey[]
  currentNodeKey?: TreeKey
  renderContent?: VueVirtualTreeRenderContent<T>
  showCheckbox?: boolean
  props?: TreeOptionProps<T>
  lazy?: boolean
  highlightCurrent?: boolean
  load?: LoadFunction<T>
  filterNodeMethod?: FilterFunction<T>
  indent?: number
  iconClass?: string
  height?: string | number
}

export interface VueVirtualTreeCheckState<
  T extends TreeNodeData = TreeNodeData,
> {
  checkedNodes: T[]
  checkedKeys: Array<TreeKey | undefined>
  halfCheckedNodes: T[]
  halfCheckedKeys: Array<TreeKey | undefined>
  selectedLeafNodes?: T[]
  selectedLeafKeys?: Array<TreeKey | undefined>
}

export type VueVirtualTreeSelectChange = (checked: boolean) => void

export interface VueVirtualTreeDefaultSlotProps<
  T extends TreeNodeData = TreeNodeData,
> {
  node: Node<T>
  item: T
  selectChange: VueVirtualTreeSelectChange
}

export interface VueVirtualTreeNodeInstance<
  T extends TreeNodeData = TreeNodeData,
> {
  node: Node<T>
}

export interface VueVirtualTreeEventMap<
  T extends TreeNodeData = TreeNodeData,
> {
  'node-click': [data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]
  'node-expand': [data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]
  'current-change': [data: T | null, node: Node<T> | null]
  'check-change': [data: T, checked: boolean, indeterminate: boolean]
  check: [data: T, state: VueVirtualTreeCheckState<T>]
}

export interface VueVirtualTreeInstance<
  T extends TreeNodeData = TreeNodeData,
> {
  filter<Value = unknown>(value: Value): void
  scrollToItem(key: TreeKey, levelStepPadding?: number, animation?: boolean): void
  getNodePath(data: TreeNodeReference<T>): T[]
  getCheckedNodes(leafOnly?: boolean, includeHalfChecked?: boolean): T[]
  getCheckedKeys(leafOnly?: boolean): Array<TreeKey | undefined>
  getCurrentNode(): T | null
  getCurrentKey(): TreeKey | null
  setCheckedNodes(nodes: T[], leafOnly?: boolean): void
  setCheckedKeys(keys: TreeKey[], leafOnly?: boolean): void
  setChecked(data: TreeNodeReference<T>, checked: boolean, deep?: boolean): void
  setCheckedAll(checked?: boolean): void
  getHalfCheckedNodes(): T[]
  getHalfCheckedKeys(): Array<TreeKey | undefined>
  getSelectedLeafNodes(): T[]
  getSelectedLeafKeys(): Array<TreeKey | undefined>
  setCurrentNode(node: T): void
  setCurrentKey(key: TreeKey | null): void
  getNode(data: TreeNodeReference<T>): Node<T> | null
  remove(data: TreeNodeReference<T>): void
  append(data: T, parentNode?: TreeNodeReference<T> | null): void
  insertBefore(data: T, refNode: TreeNodeReference<T>): void
  insertAfter(data: T, refNode: TreeNodeReference<T>): void
  updateKeyChildren(key: TreeKey, data: T[]): void
}

export interface TreeStore<T extends TreeNodeData = TreeNodeData> {
  currentNode: Node<T> | null
  currentNodeKey: TreeKey | null | undefined
  data: T[] | null
  key?: TreeNodeKey<T> | null
  props?: TreeOptionProps<T> | null
  lazy?: boolean | null
  load?: LoadFunction<T> | null
  checkStrictly?: boolean | null
  checkDescendants?: boolean | null
  defaultCheckedKeys?: TreeKey[] | null
  defaultExpandedKeys?: TreeKey[] | null
  autoExpandParent?: boolean | null
  defaultExpandAll?: boolean | null
  filterNodeMethod?: FilterFunction<T> | null
  selectChildrenOnly?: boolean | null
  renderAfterExpand?: boolean | null
  expandOnClickNode?: boolean | null
  checkOnClickNode?: boolean | null
  accordion?: boolean | null
  indent?: number | null
  nodesMap: Partial<Record<TreeKey, Node<T>>>
  filter<Value>(value: Value): void
  setData(newValue: T[]): void
  getNode(data: TreeNodeReference<T>): Node<T> | null
  insertBefore(data: T, reference: TreeNodeReference<T>): void
  insertAfter(data: T, reference: TreeNodeReference<T>): void
  remove(data: TreeNodeReference<T>): void
  append(data: T, parent?: TreeNodeReference<T> | null): void
  getCheckedNodes(leafOnly?: boolean, includeHalfChecked?: boolean): T[]
  getCheckedKeys(leafOnly?: boolean): Array<TreeKey | undefined>
  getHalfCheckedNodes(): T[]
  getHalfCheckedKeys(): Array<TreeKey | undefined>
  updateChildren(key: TreeKey, data: T[]): void
  setCheckedNodes(data: T[], leafOnly?: boolean): void
  setCheckedKeys(keys: TreeKey[], leafOnly?: boolean): void
  setDefaultExpandedKeys(keys: TreeKey[] | null | undefined): void
  setChecked(data: TreeNodeReference<T>, checked: boolean, deep?: boolean): void
  setCheckedAll(checked?: boolean): void
  getCurrentNode(): Node<T> | null
  setCurrentNode(node: Node<T>): void
  setUserCurrentNode(data: T): void
  setCurrentNodeKey(key: TreeKey | null | undefined): void
  getSelectedLeafNodes(): T[]
  getSelectedLeafKeys(): Array<TreeKey | undefined>
  destroy(): void
}

export interface NodeConstructor {
  new <T extends TreeNodeData = TreeNodeData>(options: NodeOptions<T>): Node<T>
}

export interface TreeStoreConstructor {
  new <T extends TreeNodeData = TreeNodeData>(
    options: TreeStoreOptions<T>,
  ): TreeStore<T>
}

// Internal constructors require lifecycle members that are intentionally absent
// from the public interfaces. Keep that structural bridge at this export boundary.
export const Node: NodeConstructor = ModelNode as typeof ModelNode & NodeConstructor
export const TreeStore: TreeStoreConstructor = ModelTreeStore as
  typeof ModelTreeStore & TreeStoreConstructor

export interface VueVirtualTreeRegistrar {
  component(name: string, component: Component): unknown
}

export type VueVirtualTreePlugin = Component & {
  name?: string
  install(appOrVue: VueVirtualTreeRegistrar): void
}

const VueVirtualTree: VueVirtualTreePlugin = Object.assign(TreeComponent, {
  install(appOrVue: VueVirtualTreeRegistrar) {
    appOrVue.component(TreeComponent.name || 'VueVirtualTree', TreeComponent)
  },
})

export { VueVirtualTree }
export default VueVirtualTree
