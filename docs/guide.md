[English](./guide.md) | [简体中文](./guide.zh-CN.md) | [README](../README.md)

# Usage guide

The complete examples on this page are Vue 3 SFCs. Vue 2.7 uses the same component API through the `/vue2` entry; see [Using Vue 2.7](#using-vue-27) below.

For the full prop, event, slot, method, and type contracts, see the [API reference](./api.md).

<!-- section:layout -->
## Size and data setup

- Give the tree a fixed, resolvable height. A numeric `height`, such as `320`, is the simplest option. With the default `height="100%"`, its parent must have a non-zero computed height.
- Keep `itemSize > 0` and make the rendered row height match it. Variable-height or wrapping rows invalidate the virtual scroll calculation.
- Set a stable, unique `nodeKey` for key-based methods, default checked or expanded keys, current-node keys, and reliable updates.
- Keep the CSS import in an application entry or another location bundled exactly once.
- Run the component in an environment that provides `ResizeObserver`, or supply a compatible polyfill before mounting it.

Data is an array of objects. The default field names are `label`, `children`, and `disabled`; use the `props` option to map different field names or getter functions.

<!-- section:large-data -->
## Large trees

Virtualization limits mounted DOM rows. It does not remove the in-memory tree model or make every tree operation constant-time. For large data sets:

- keep keys stable across updates;
- avoid recreating the complete data array for a small mutation;
- use `lazy` when children can be fetched on demand;
- expand only the branches users need;
- use the [Workbench](https://zjinh.github.io/vue-virtual-tree/) presets in the target browser and hardware before choosing an application limit.

Filtering, bulk checking, and other whole-tree operations can still scale with the number of logical nodes.

<!-- section:checkbox-current -->
## Checkbox and current-node state

Enable the built-in checkbox and current-row styles with `show-checkbox` and `highlight-current`. Default keys are applied when the tree initializes.

<!-- guide-example:checkbox-current:start -->
```vue
<script setup lang="ts">
import VueVirtualTree, {
  type TreeNode,
  type VueVirtualTreeCheckState,
} from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

const data: DemoNode[] = [{
  id: 1,
  label: 'Root',
  children: [{ id: 2, label: 'Child' }],
}]

function onCheck(
  nodeData: DemoNode,
  state: VueVirtualTreeCheckState<DemoNode>,
): void {
  console.log(nodeData.id, state.checkedKeys)
}

function onCurrentChange(
  nodeData: DemoNode | null,
  node: TreeNode<DemoNode> | null,
): void {
  console.log(nodeData?.id, node?.key)
}
</script>

<template>
  <VueVirtualTree
    :data="data"
    :height="320"
    node-key="id"
    show-checkbox
    highlight-current
    :default-expanded-keys="[1]"
    :default-checked-keys="[2]"
    @check="onCheck"
    @current-change="onCurrentChange"
  ></VueVirtualTree>
</template>
```
<!-- guide-example:checkbox-current:end -->

`highlightCurrent` only controls the `is-current` row style. Clicking a row or calling a current-node method still updates current state when highlighting is off.

`checkStrictly` stops parent and child checkbox propagation. `selectChildrenOnly` adds selected-leaf results to the `check` event state and changes how branch selection is handled. See the API notes before combining those options with lazy data.

<!-- section:filter -->
## Filtering

`filter()` requires `filterNodeMethod`. The native input below has no UI-library dependency.

<!-- guide-example:filter:start -->
```vue
<script setup lang="ts">
import { ref } from 'vue'
import VueVirtualTree, {
  type FilterFunction,
  type VueVirtualTreeInstance,
} from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

const query = ref('')
const data: DemoNode[] = [{
  id: 1,
  label: 'Root',
  children: [{ id: 2, label: 'Searchable child' }],
}]
const tree = ref<VueVirtualTreeInstance<DemoNode> | null>(null)
const filterNode: FilterFunction<DemoNode, string> = (value, data) =>
  data.label.toLowerCase().includes(value.toLowerCase())

function applyFilter() {
  tree.value?.filter(query.value)
}
</script>

<template>
  <input v-model="query" type="search" @input="applyFilter">
  <VueVirtualTree
    ref="tree"
    :data="data"
    :height="320"
    node-key="id"
    :filter-node-method="filterNode"
  ></VueVirtualTree>
</template>
```
<!-- guide-example:filter:end -->

The predicate receives the filter value, raw node data, and the model node. A matching descendant also keeps its ancestor path visible. With non-lazy data, a non-empty filter expands matching paths.

<!-- section:lazy -->
## Lazy loading

<!-- guide-example:lazy:start -->
```vue
<script setup lang="ts">
import VueVirtualTree, {
  type LoadFunction,
} from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

interface DemoNode {
  id: number
  label: string
}

const load: LoadFunction<DemoNode> = (node, resolve) => {
  if (node.level === 0) {
    resolve([{ id: 1, label: 'Lazy root' }])
    return
  }
  resolve(node.level < 2
    ? [{ id: node.data.id + 10, label: `Child of ${node.data.label}` }]
    : [])
}
</script>

<template>
  <VueVirtualTree
    :height="320"
    node-key="id"
    lazy
    :load="load"
  ></VueVirtualTree>
</template>
```
<!-- guide-example:lazy:end -->

When `lazy` is enabled, call `resolve()` with the child array for every completed load. Map a boolean leaf field through `props.isLeaf` when the leaf state is known in advance. Request retries, cancellation, and error UI belong in the application loader.

<!-- section:slot -->
## Custom row content

The default scoped slot receives `{ node, item, selectChange }`. `item` is the raw node data. This example aliases `item` to the local name `data` and uses the supplied checkbox callback:

<!-- guide-example:slot:start -->
```vue
<script setup lang="ts">
import VueVirtualTree, {
  type VueVirtualTreeSelectChange,
} from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

const data: DemoNode[] = [{
  id: 1,
  label: 'Root',
  children: [{ id: 2, label: 'Child' }],
}]

function labelOf(item: object): string {
  return (item as DemoNode).label
}

function updateSelection(
  selectChange: VueVirtualTreeSelectChange,
  event: Event,
): void {
  const input = event.target
  if (input instanceof HTMLInputElement) selectChange(input.checked)
}
</script>

<template>
  <VueVirtualTree
    :data="data"
    :height="320"
    node-key="id"
    show-checkbox
    :default-expanded-keys="[1]"
  >
    <template #default="{ node, item: data, selectChange }">
      <label :style="{ paddingLeft: `${(node.level - 1) * 18}px` }">
        <input
          type="checkbox"
          :checked="node.checked"
          :disabled="Boolean(node.disabled)"
          @change="updateSelection(selectChange, $event)"
        >
        {{ labelOf(data) }}
      </label>
    </template>
  </VueVirtualTree>
</template>
```
<!-- guide-example:slot:end -->

Providing the default slot replaces the complete built-in row body, including indentation, expansion control, loading state, checkbox, and label. Custom content must render each control it needs.

<!-- section:ref-methods -->
## Calling methods through a ref

Type the template ref with `VueVirtualTreeInstance<T>`, then call any of the 23 public methods after the component is mounted.

<!-- guide-example:ref-methods:start -->
```vue
<script setup lang="ts">
import { ref } from 'vue'
import VueVirtualTree, {
  type VueVirtualTreeInstance,
} from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

const data: DemoNode[] = [{
  id: 1,
  label: 'Root',
  children: [{ id: 2, label: 'Child' }],
}]

const tree = ref<VueVirtualTreeInstance<DemoNode> | null>(null)

function inspectSelection() {
  console.log(tree.value?.getCheckedKeys())
  console.log(tree.value?.getCurrentNode())
}

function selectFirstChild() {
  tree.value?.setChecked(2, true, true)
  tree.value?.scrollToItem(2)
}
</script>

<template>
  <button type="button" @click="inspectSelection">Inspect selection</button>
  <button type="button" @click="selectFirstChild">Select child</button>
  <VueVirtualTree ref="tree" :data="data" :height="320" node-key="id"></VueVirtualTree>
</template>
```
<!-- guide-example:ref-methods:end -->

Key-based calls need a stable `nodeKey`. Structural methods update both the internal model and the matching raw `children` arrays. See the [method reference](./api.md#methods) for missing-key and missing-node behavior.

<!-- section:vue2 -->
## Using Vue 2.7

Import the component and its types from `@zjinh/vue-virtual-tree/vue2`, and keep the shared CSS import. The props, events, slot values, and ref methods are the same as in Vue 3.

Use the Options API for component state and local registration:

```ts
import Vue from 'vue'
import VueVirtualTree, {
  type VueVirtualTreeInstance,
} from '@zjinh/vue-virtual-tree/vue2'
import '@zjinh/vue-virtual-tree/style.css'

export default Vue.extend({
  components: { VueVirtualTree },
  methods: {
    inspectTree() {
      const tree = this.$refs.tree as unknown as VueVirtualTreeInstance
      console.log(tree.getCheckedKeys())
    },
  },
})
```

Add `ref="tree"` to the component when using `$refs`. The [README quick start](../README.md#vue-27-quick-start) shows global registration and a minimal template.
