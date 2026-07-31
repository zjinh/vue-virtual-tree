import Vue from 'vue'
import type { Component } from 'vue'
import VueVirtualTree, {
  VueVirtualTree as NamedVueVirtualTree,
  type VueVirtualTreePlugin,
  type VueVirtualTreeRegistrar,
} from '@zjinh/vue-virtual-tree/vue2'
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
  type VueVirtualTreePlugin as SourceVueVirtualTreePlugin,
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
} from '@zjinh/vue-virtual-tree/vue2'

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
  disabled?: boolean
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

void modelNode
void sourceNode
void nodeConstructor
void sourceData
void sourceProps
void sourceLoad
void sourceFilter

const plugin: VueVirtualTreePlugin = VueVirtualTree
const namedPlugin: typeof VueVirtualTree = NamedVueVirtualTree
const registrar: VueVirtualTreeRegistrar = Vue

plugin.install(registrar)
registrar.component('LocalTree', namedPlugin)
Vue.use(plugin)

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
}
