import { createApp, defineComponent } from 'vue'
import type { Component } from 'vue'
import VueVirtualTree, {
  VueVirtualTree as NamedVueVirtualTree,
  type VueVirtualTreePlugin,
  type VueVirtualTreeRegistrar,
} from '@zjinh/vue-virtual-tree'
import SourceVueVirtualTree, {
  Node as SourceNode,
  TreeStore as SourceTreeStore,
  VueVirtualTree as SourceNamedVueVirtualTree,
  type FilterFunction as SourceFilterFunction,
  type LoadFunction as SourceLoadFunction,
  type NodeChildOptions as SourceNodeChildOptions,
  type TreeKey as SourceTreeKey,
  type TreeNode as SourceTreeNode,
  type TreeNodeData as SourceTreeNodeData,
  type TreeOptionProps as SourceTreeOptionProps,
  type TreeProperty as SourceTreeProperty,
  type VueVirtualTreeCheckState as SourceVueVirtualTreeCheckState,
  type VueVirtualTreeDefaultSlotProps as SourceVueVirtualTreeDefaultSlotProps,
  type VueVirtualTreeEventMap as SourceVueVirtualTreeEventMap,
  type VueVirtualTreeInstance as SourceVueVirtualTreeInstance,
  type VueVirtualTreeNodeInstance as SourceVueVirtualTreeNodeInstance,
  type VueVirtualTreePlugin as SourceVueVirtualTreePlugin,
  type VueVirtualTreeProps as SourceVueVirtualTreeProps,
  type VueVirtualTreeRegistrar as SourceVueVirtualTreeRegistrar,
} from '../../../src/index'
import {
  Node,
  TreeStore,
  type FilterFunction,
  type LoadFunction,
  type NodeChildOptions,
  type TreeKey,
  type TreeNode,
  type TreeNodeData,
  type TreeOptionProps,
  type TreeProperty,
  type VueVirtualTreeCheckState,
  type VueVirtualTreeDefaultSlotProps,
  type VueVirtualTreeEventMap,
  type VueVirtualTreeInstance,
  type VueVirtualTreeNodeInstance,
  type VueVirtualTreeProps,
} from '@zjinh/vue-virtual-tree'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
    (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false
type Assert<Value extends true> = Value
type RegistrarComponentMatches = Assert<
  Equal<Parameters<VueVirtualTreeRegistrar['component']>[1], Component>
>
type InstallRegistrarMatches = Assert<
  Equal<Parameters<VueVirtualTreePlugin['install']>[0], VueVirtualTreeRegistrar>
>
type DefaultExportMatchesPlugin = Assert<Equal<typeof VueVirtualTree, VueVirtualTreePlugin>>
type NamedExportMatchesDefault = Assert<Equal<typeof NamedVueVirtualTree, typeof VueVirtualTree>>
type SourceRegistrarMatchesDist = Assert<
  Equal<SourceVueVirtualTreeRegistrar, VueVirtualTreeRegistrar>
>
type SourcePluginMatchesDist = Assert<Equal<SourceVueVirtualTreePlugin, VueVirtualTreePlugin>>
type SourceDefaultMatchesDist = Assert<Equal<typeof SourceVueVirtualTree, typeof VueVirtualTree>>
type SourceNamedMatchesDefault = Assert<
  Equal<typeof SourceNamedVueVirtualTree, typeof SourceVueVirtualTree>
>

interface ConsumerTreeNode {
  id: TreeKey
  name: string
  children?: ConsumerTreeNode[]
  disabled?: boolean | number | string
  leaf?: boolean
}

type PlainNodeMatchesDistBase = Assert<
  ConsumerTreeNode extends TreeNodeData ? true : false
>
type PlainNodeMatchesSourceBase = Assert<
  ConsumerTreeNode extends SourceTreeNodeData ? true : false
>

const props: TreeOptionProps<ConsumerTreeNode> = {
  children: 'children',
  label: (data) => data.name,
  disabled: 'disabled',
  isLeaf: 'leaf',
}
const load: LoadFunction<ConsumerTreeNode> = (_node, resolve) => resolve([])
const filter: FilterFunction<ConsumerTreeNode, string> = (value, data) =>
  data.name.includes(value)
const modelStore = new TreeStore<ConsumerTreeNode>({
  data: [{ id: 1, name: 'root' }],
  key: 'id',
  props,
  load,
  filterNodeMethod: filter,
  renderAfterExpand: false,
  expandOnClickNode: true,
  checkOnClickNode: false,
  accordion: true,
  indent: 18,
})
const modelNode: TreeNode<ConsumerTreeNode> | null = modelStore.getNode(1)
const sourceStore = new SourceTreeStore<ConsumerTreeNode>({
  data: [],
  key: 'id',
  renderAfterExpand: false,
  expandOnClickNode: true,
  checkOnClickNode: false,
  accordion: true,
  indent: 18,
})
// @ts-expect-error virtual root is intentionally not public
modelStore.root
// @ts-expect-error virtual root is intentionally not public
sourceStore.root

new TreeStore<ConsumerTreeNode>({
  data: [],
  // @ts-expect-error children arrays cannot be used as node keys
  key: 'children',
})
new SourceTreeStore<ConsumerTreeNode>({
  data: [],
  // @ts-expect-error children arrays cannot be used as node keys
  key: 'children',
})

const invalidDistChildrenProps: TreeOptionProps<ConsumerTreeNode> = {
  // @ts-expect-error string fields cannot be used as children mappings
  children: 'name',
}
const invalidSourceChildrenProps: SourceTreeOptionProps<ConsumerTreeNode> = {
  // @ts-expect-error string fields cannot be used as children mappings
  children: 'name',
}
const invalidDistLeafProps: TreeOptionProps<ConsumerTreeNode> = {
  // @ts-expect-error string fields cannot be used as isLeaf mappings
  isLeaf: 'name',
}
const invalidSourceLeafProps: SourceTreeOptionProps<ConsumerTreeNode> = {
  // @ts-expect-error string fields cannot be used as isLeaf mappings
  isLeaf: 'name',
}
// @ts-expect-error boolean properties cannot map to string fields
const invalidDistBooleanProperty: TreeProperty<ConsumerTreeNode, boolean> = 'name'
// @ts-expect-error boolean properties cannot map to string fields
const invalidSourceBooleanProperty: SourceTreeProperty<ConsumerTreeNode, boolean> = 'name'
const sourceNode: SourceTreeNode<ConsumerTreeNode> | null = sourceStore.getNode(1)
const childOptions: NodeChildOptions<ConsumerTreeNode> = {
  data: { id: 2, name: 'child' },
}
const sourceChildOptions: SourceNodeChildOptions<ConsumerTreeNode> = childOptions
modelNode?.insertChild(childOptions)
sourceNode?.insertChild(sourceChildOptions)
const nodeConstructor: typeof Node = SourceNode
const sourceKey: SourceTreeKey = 1
const sourceData: SourceTreeNodeData = { id: sourceKey }
const sourceProps: SourceTreeOptionProps<ConsumerTreeNode> = props
const sourceLoad: SourceLoadFunction<ConsumerTreeNode> = load
const sourceFilter: SourceFilterFunction<ConsumerTreeNode, string> = filter

// 21 supported props plus one unsupported compatibility placeholder.
type RuntimePropKeys =
  | 'data'
  | 'emptyText'
  | 'nodeKey'
  | 'checkStrictly'
  | 'defaultExpandAll'
  | 'checkDescendants'
  | 'selectChildrenOnly'
  | 'itemSize'
  | 'autoExpandParent'
  | 'defaultCheckedKeys'
  | 'defaultExpandedKeys'
  | 'currentNodeKey'
  | 'renderContent'
  | 'showCheckbox'
  | 'props'
  | 'lazy'
  | 'highlightCurrent'
  | 'load'
  | 'filterNodeMethod'
  | 'indent'
  | 'iconClass'
  | 'height'

type SupportedPropKeys = Exclude<RuntimePropKeys, 'renderContent'>

type ExpectedInstanceKeys =
  | 'filter'
  | 'scrollToItem'
  | 'getNodePath'
  | 'getCheckedNodes'
  | 'getCheckedKeys'
  | 'getCurrentNode'
  | 'getCurrentKey'
  | 'setCheckedNodes'
  | 'setCheckedKeys'
  | 'setChecked'
  | 'setCheckedAll'
  | 'getHalfCheckedNodes'
  | 'getHalfCheckedKeys'
  | 'getSelectedLeafNodes'
  | 'getSelectedLeafKeys'
  | 'setCurrentNode'
  | 'setCurrentKey'
  | 'getNode'
  | 'remove'
  | 'append'
  | 'insertBefore'
  | 'insertAfter'
  | 'updateKeyChildren'

type ExpectedEventKeys =
  | 'node-click'
  | 'node-expand'
  | 'node-collapse'
  | 'node-contextmenu'
  | 'current-change'
  | 'check-change'
  | 'check'

type PropsExposeRuntimeKeysIncludingPlaceholder = Assert<
  Equal<keyof VueVirtualTreeProps<ConsumerTreeNode>, RuntimePropKeys>
>
type PropsExposeExactlyTheSupportedRuntimeProps = Assert<
  Equal<
    keyof Omit<VueVirtualTreeProps<ConsumerTreeNode>, 'renderContent'>,
    SupportedPropKeys
  >
>
type RenderContentIsUnsupportedPlaceholder = Assert<
  Equal<VueVirtualTreeProps<ConsumerTreeNode>['renderContent'], undefined>
>
type InstanceExposesExactlyTheRuntimeMethods = Assert<
  Equal<keyof VueVirtualTreeInstance<ConsumerTreeNode>, ExpectedInstanceKeys>
>
type SourcePropsMatchDist = Assert<
  Equal<SourceVueVirtualTreeProps<ConsumerTreeNode>, VueVirtualTreeProps<ConsumerTreeNode>>
>
type SourceInstanceMatchesDist = Assert<
  Equal<SourceVueVirtualTreeInstance<ConsumerTreeNode>, VueVirtualTreeInstance<ConsumerTreeNode>>
>
type SourceCheckStateMatchesDist = Assert<
  Equal<SourceVueVirtualTreeCheckState<ConsumerTreeNode>, VueVirtualTreeCheckState<ConsumerTreeNode>>
>
type SourceSlotMatchesDist = Assert<
  Equal<SourceVueVirtualTreeDefaultSlotProps<ConsumerTreeNode>, VueVirtualTreeDefaultSlotProps<ConsumerTreeNode>>
>
type SourceEventsMatchDist = Assert<
  Equal<SourceVueVirtualTreeEventMap<ConsumerTreeNode>, VueVirtualTreeEventMap<ConsumerTreeNode>>
>
type EventsExposeExactlyTheRuntimeEvents = Assert<
  Equal<keyof VueVirtualTreeEventMap<ConsumerTreeNode>, ExpectedEventKeys>
>
type ContextMenuEventParametersMatch = Assert<
  Equal<
    VueVirtualTreeEventMap<ConsumerTreeNode>['node-contextmenu'],
    [
      event: MouseEvent,
      data: ConsumerTreeNode,
      node: TreeNode<ConsumerTreeNode>,
      instance: VueVirtualTreeNodeInstance<ConsumerTreeNode>,
    ]
  >
>
type CollapseEventParametersMatch = Assert<
  Equal<
    VueVirtualTreeEventMap<ConsumerTreeNode>['node-collapse'],
    [
      data: ConsumerTreeNode,
      node: TreeNode<ConsumerTreeNode>,
      instance: VueVirtualTreeNodeInstance<ConsumerTreeNode>,
    ]
  >
>

const componentProps: VueVirtualTreeProps<ConsumerTreeNode> = {
  data: [{ id: 1, name: 'root' }],
  emptyText: 'empty',
  nodeKey: 'id',
  checkStrictly: false,
  defaultExpandAll: false,
  checkDescendants: false,
  selectChildrenOnly: false,
  itemSize: 26,
  autoExpandParent: true,
  defaultCheckedKeys: [1],
  defaultExpandedKeys: [1],
  currentNodeKey: 1,
  showCheckbox: true,
  props,
  lazy: false,
  highlightCurrent: true,
  load,
  filterNodeMethod: filter,
  indent: 18,
  iconClass: 'caret',
  height: 240,
}
const sourceComponentProps: SourceVueVirtualTreeProps<ConsumerTreeNode> = componentProps
const unsupportedDistRenderContentProps: VueVirtualTreeProps<ConsumerTreeNode> = {
  // @ts-expect-error renderContent is an unsupported compatibility placeholder
  renderContent: () => null,
}
const unsupportedSourceRenderContentProps: SourceVueVirtualTreeProps<ConsumerTreeNode> = {
  // @ts-expect-error renderContent is an unsupported compatibility placeholder
  renderContent: () => null,
}

declare const componentInstance: VueVirtualTreeInstance<ConsumerTreeNode>
declare const sourceComponentInstance: SourceVueVirtualTreeInstance<ConsumerTreeNode>

function consumeComponentInstance(instance: VueVirtualTreeInstance<ConsumerTreeNode>) {
  instance.filter('root')
  instance.scrollToItem(1, 18, false)
  instance.getNodePath(1)
  instance.getCheckedNodes(false, true)
  instance.getCheckedKeys(false)
  instance.getCurrentNode()
  instance.getCurrentKey()
  instance.setCheckedNodes([{ id: 1, name: 'root' }], false)
  instance.setCheckedKeys([1], false)
  instance.setChecked(1, true, true)
  instance.setCheckedAll(false)
  instance.getHalfCheckedNodes()
  instance.getHalfCheckedKeys()
  instance.getSelectedLeafNodes()
  instance.getSelectedLeafKeys()
  instance.setCurrentNode({ id: 1, name: 'root' })
  instance.setCurrentKey(1)
  instance.getNode(1)
  instance.remove(1)
  instance.append({ id: 2, name: 'child' }, 1)
  instance.insertBefore({ id: 3, name: 'before' }, 2)
  instance.insertAfter({ id: 4, name: 'after' }, 2)
  instance.updateKeyChildren(1, [{ id: 5, name: 'updated' }])
}

consumeComponentInstance(componentInstance)
consumeComponentInstance(sourceComponentInstance)

const checkState: VueVirtualTreeCheckState<ConsumerTreeNode> = {
  checkedNodes: [{ id: 1, name: 'root' }],
  checkedKeys: [1],
  halfCheckedNodes: [],
  halfCheckedKeys: [],
  selectedLeafNodes: [],
  selectedLeafKeys: [],
}
const slotProps: VueVirtualTreeDefaultSlotProps<ConsumerTreeNode> = {
  node: modelNode!,
  item: { id: 1, name: 'root' },
  selectChange: (checked) => componentInstance.setChecked(1, checked),
}
const checkEvent: VueVirtualTreeEventMap<ConsumerTreeNode>['check'] = [
  slotProps.item,
  checkState,
]
const sourceCheckEvent: SourceVueVirtualTreeEventMap<ConsumerTreeNode>['check'] = checkEvent
declare const contextMenuMouseEvent: MouseEvent
const eventNodeInstance: VueVirtualTreeNodeInstance<ConsumerTreeNode> = {
  node: modelNode!,
}
const sourceEventNodeInstance: SourceVueVirtualTreeNodeInstance<ConsumerTreeNode> =
  eventNodeInstance
const contextMenuEvent: VueVirtualTreeEventMap<ConsumerTreeNode>['node-contextmenu'] = [
  contextMenuMouseEvent,
  slotProps.item,
  modelNode!,
  eventNodeInstance,
]
const sourceContextMenuEvent: SourceVueVirtualTreeEventMap<ConsumerTreeNode>['node-contextmenu'] =
  contextMenuEvent
const collapseEvent: VueVirtualTreeEventMap<ConsumerTreeNode>['node-collapse'] = [
  slotProps.item,
  modelNode!,
  eventNodeInstance,
]
const sourceCollapseEvent: SourceVueVirtualTreeEventMap<ConsumerTreeNode>['node-collapse'] =
  collapseEvent

void modelNode
void sourceNode
void nodeConstructor
void sourceData
void sourceProps
void sourceLoad
void sourceFilter
void componentProps
void sourceComponentProps
void checkState
void slotProps
void checkEvent
void sourceCheckEvent
void sourceEventNodeInstance
void contextMenuEvent
void sourceContextMenuEvent
void collapseEvent
void sourceCollapseEvent
void invalidDistChildrenProps
void invalidSourceChildrenProps
void invalidDistLeafProps
void invalidSourceLeafProps
void invalidDistBooleanProperty
void invalidSourceBooleanProperty

const plugin: VueVirtualTreePlugin = VueVirtualTree
const namedPlugin: typeof VueVirtualTree = NamedVueVirtualTree
const registrar: VueVirtualTreeRegistrar = createApp(defineComponent({}))

plugin.install(registrar)
registrar.component('LocalTree', namedPlugin)
createApp(defineComponent({})).use(plugin)

export type {
  DefaultExportMatchesPlugin,
  InstallRegistrarMatches,
  NamedExportMatchesDefault,
  PlainNodeMatchesDistBase,
  PlainNodeMatchesSourceBase,
  RegistrarComponentMatches,
  SourceDefaultMatchesDist,
  SourceNamedMatchesDefault,
  SourcePluginMatchesDist,
  SourceRegistrarMatchesDist,
  PropsExposeRuntimeKeysIncludingPlaceholder,
  PropsExposeExactlyTheSupportedRuntimeProps,
  RenderContentIsUnsupportedPlaceholder,
  InstanceExposesExactlyTheRuntimeMethods,
  SourcePropsMatchDist,
  SourceInstanceMatchesDist,
  SourceCheckStateMatchesDist,
  SourceSlotMatchesDist,
  SourceEventsMatchDist,
  EventsExposeExactlyTheRuntimeEvents,
  ContextMenuEventParametersMatch,
  CollapseEventParametersMatch,
}
