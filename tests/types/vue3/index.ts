import { createApp, defineComponent } from 'vue'
import type { Component } from 'vue'
import VueVirtualTree, {
  VueVirtualTree as NamedVueVirtualTree,
  type VueVirtualTreePlugin,
  type VueVirtualTreeRegistrar,
} from '@zjinh/vue-virtual-tree'
import SourceVueVirtualTree, {
  VueVirtualTree as SourceNamedVueVirtualTree,
  type VueVirtualTreePlugin as SourceVueVirtualTreePlugin,
  type VueVirtualTreeRegistrar as SourceVueVirtualTreeRegistrar,
} from '../../../src/index'

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
