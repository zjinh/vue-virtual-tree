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
  type TreeKey,
  type TreeNode,
  type TreeNodeData,
  type TreeOptionProps,
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

interface ConsumerTreeNode extends TreeNodeData {
  id: TreeKey
  name: string
  children?: ConsumerTreeNode[]
  disabled?: boolean
}

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
})
const modelNode: TreeNode<ConsumerTreeNode> | null = modelStore.getNode(1)
const sourceStore = new SourceTreeStore<ConsumerTreeNode>({ data: [], key: 'id' })
const sourceNode: SourceTreeNode<ConsumerTreeNode> | null = sourceStore.getNode(1)
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
const registrar: VueVirtualTreeRegistrar = createApp(defineComponent({}))

plugin.install(registrar)
registrar.component('LocalTree', namedPlugin)
createApp(defineComponent({})).use(plugin)

export type {
  DefaultExportMatchesPlugin,
  InstallRegistrarMatches,
  NamedExportMatchesDefault,
  RegistrarComponentMatches,
  SourceDefaultMatchesDist,
  SourceNamedMatchesDefault,
  SourcePluginMatchesDist,
  SourceRegistrarMatchesDist,
}
