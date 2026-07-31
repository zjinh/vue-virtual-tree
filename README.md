[English](./README.md) | [简体中文](./README.zh-CN.md)

# @zjinh/vue-virtual-tree

<!-- section:positioning -->
## Positioning and compatibility

`@zjinh/vue-virtual-tree` is a fixed-row-height virtual tree component with one public API for Vue 2.7 and Vue 3. It provides checkbox selection, current-node state, filtering, lazy loading, mutation methods, and a default scoped slot.

| Runtime | Supported version | Import |
| --- | --- | --- |
| Vue 2 | Vue 2.7.x only | `@zjinh/vue-virtual-tree/vue2` |
| Vue 3 | Vue 3 >= 3.2 | `@zjinh/vue-virtual-tree` or `@zjinh/vue-virtual-tree/vue3` |

The package is ESM. The default entry and `/vue3` are the Vue 3 build; `/vue2` is the Vue 2.7 build. Styles are exported from `@zjinh/vue-virtual-tree/style.css`.

Node.js 22.22.3 and pnpm 10.33.4 are the repository's pinned development and release toolchain. They are not browser runtime requirements for package consumers.

<!-- section:demos -->
## Online demos

- [Workbench](https://zjinh.github.io/vue-virtual-tree/)
- [Vue 2.7 demo](https://zjinh.github.io/vue-virtual-tree/vue2/)
- [Vue 3 demo](https://zjinh.github.io/vue-virtual-tree/vue3/)

These GitHub Pages URLs become available after the repository's Pages setting uses **GitHub Actions** as its source and a deployment completes successfully. The links describe the configured target; their presence here does not claim that a deployment is currently live.

The Workbench runs the real component and exposes the supported props, methods, events, data scales, and local browser measurements for both runtimes.

<!-- section:installation -->
## Installation

Choose one package manager:

```sh
pnpm add @zjinh/vue-virtual-tree
```

```sh
npm install @zjinh/vue-virtual-tree
```

```sh
yarn add @zjinh/vue-virtual-tree
```

Install a compatible Vue peer in the application: Vue 2.7.x for the `/vue2` entry, or Vue 3 >= 3.2 for the default and `/vue3` entries.

<!-- section:quick-start -->
## Quick start

### Vue 3 global registration

```ts
import { createApp } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'
import App from './App.vue'

createApp(App).use(VueVirtualTree).mount('#app')
```

The explicit Vue 3 entry is equivalent:

```ts
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue3'
```

### Vue 3 local registration

```ts
import { defineComponent } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

export default defineComponent({
  components: { VueVirtualTree },
})
```

### Vue 2.7 global registration

```ts
import Vue from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue2'
import '@zjinh/vue-virtual-tree/style.css'

Vue.use(VueVirtualTree)
```

### Vue 2.7 local registration

```ts
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue2'
import '@zjinh/vue-virtual-tree/style.css'

export default {
  components: { VueVirtualTree },
}
```

### Minimal Vue 3 tree

```vue
<script setup lang="ts">
import { ref } from 'vue'
import VueVirtualTree, {
  type VueVirtualTreeInstance,
  type VueVirtualTreeProps,
} from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

const data: DemoNode[] = [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 2, label: 'First child' },
      { id: 3, label: 'Second child' },
    ],
  },
]

const options: VueVirtualTreeProps<DemoNode> = {
  nodeKey: 'id',
  itemSize: 26,
  height: 320,
}
const tree = ref<VueVirtualTreeInstance<DemoNode> | null>(null)
</script>

<template>
  <VueVirtualTree
    ref="tree"
    :data="data"
    :height="options.height"
    :item-size="options.itemSize"
    node-key="id"
  ></VueVirtualTree>
</template>
```

<!-- section:practical-usage -->
## Practical usage

### Layout and data rules

- Give the tree a fixed, resolvable height. A numeric `height`, such as `320`, is the simplest option. With the default `height="100%"`, its parent must have a non-zero computed height.
- Keep `itemSize > 0` and make the rendered row height match it. Variable-height or wrapping rows invalidate the virtual scroll calculation.
- Set a stable, unique `nodeKey` for key-based methods, default checked or expanded keys, current-node keys, and reliable updates.
- Keep the CSS import in an application entry or another location bundled exactly once.

### Large data and virtualization

Virtualization limits mounted DOM rows; it does not remove the in-memory tree model or make all tree operations constant-time. For large data sets:

- keep keys stable across updates;
- avoid recreating the complete data array for small mutations;
- use `lazy` when children can be fetched on demand;
- expand only the branches users need;
- use the Workbench presets on the target browser and hardware before choosing a production data limit.

### Checkbox and current-node state

```vue
<VueVirtualTree
  ref="tree"
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
```

`highlightCurrent` only gates the `is-current` row styling. Clicking or setting a current node still updates current-node state when highlighting is off.

### Filtering

`filter()` requires `filterNodeMethod`. The native input below has no UI-library dependency.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type {
  FilterFunction,
  VueVirtualTreeInstance,
} from '@zjinh/vue-virtual-tree'

const query = ref('')
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

### Lazy loading

```vue
<script setup lang="ts">
import type { LoadFunction } from '@zjinh/vue-virtual-tree'

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

When `lazy` is enabled, call `resolve()` with the child array. Map a boolean leaf field through `props.isLeaf` when the leaf state is known in advance.

### Default scoped slot

The actual slot contract is `{ node, item, selectChange }`. `item` is the raw node data. This example aliases `item` to the local name `data` and uses the supplied checkbox callback:

```vue
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
        @change="selectChange($event.target.checked)"
      >
      {{ data.label }}
    </label>
  </template>
</VueVirtualTree>
```

Providing the default slot replaces the built-in row body, including its expansion affordance and built-in checkbox. Custom content owns the controls it needs.

### Calling methods through a ref

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { VueVirtualTreeInstance } from '@zjinh/vue-virtual-tree'

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

<!-- section:api -->
## Public API

### Props

The supported prop set contains exactly 21 entries.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `T[]` | `[]` | Tree data. |
| `emptyText` | `string` | `暂无数据` | Text shown when no node is visible. |
| `nodeKey` | `TreeNodeKey<T>` | not set | Unique string or number field. Read when the store initializes and required by the key-dependent methods noted below. |
| `checkStrictly` | `boolean` | `false` | Stops parent and child checkbox propagation. |
| `defaultExpandAll` | `boolean` | `false` | Expands nodes during initialization; remount to change this initialization option. |
| `checkDescendants` | `boolean` | `false` | Initialization option controlling descendant checking around lazy loading. |
| `selectChildrenOnly` | `boolean` | `false` | Initialization option adding leaf-selection behavior and leaf results to the `check` state. |
| `itemSize` | `number` | `26` | Fixed row height in pixels; must be greater than zero. |
| `autoExpandParent` | `boolean` | `true` | Initialization option that expands ancestors of default expanded keys. |
| `defaultCheckedKeys` | `TreeKey[]` | `[]` | Initial checked keys; requires `nodeKey`. |
| `defaultExpandedKeys` | `TreeKey[]` | `[]` | Initial expanded keys; requires `nodeKey`. |
| `currentNodeKey` | `TreeKey` | not set | Initial current key; requires `nodeKey`. Use a method for later changes. |
| `showCheckbox` | `boolean` | `false` | Renders built-in checkboxes when the default row content is used. |
| `props` | `TreeOptionProps<T>` | label / children / disabled | Initialization mapping for `label`, `children`, `disabled`, `isLeaf`, or custom property getters. |
| `lazy` | `boolean` | `false` | Initialization option enabling on-demand child loading. |
| `highlightCurrent` | `boolean` | `false` | Gates current-row styling; it does not disable current state. |
| `load` | `LoadFunction<T>` | not set | Initialization-time lazy loader used when `lazy` is true. |
| `filterNodeMethod` | `FilterFunction<T, Value>` | not set | Predicate required before calling `filter()`; remount after replacing the function. |
| `indent` | `number` | `18` | Indentation step in pixels for built-in rows. |
| `iconClass` | `string` | not set | Custom class for the built-in expand icon. |
| `height` | `string \| number` | `100%` | Virtual list height. Percentage values need a sized parent. |

`renderContent` is retained only as an unsupported compatibility placeholder:

| Prop | Type | Status | Replacement |
| --- | --- | --- | --- |
| `renderContent` | `never` | deprecated and unsupported | Use the default scoped slot. |

No other component props are part of the public `VueVirtualTreeProps<T>` contract.

### Methods

All methods below are exposed on `VueVirtualTreeInstance<T>`.

1. `filter<Value = unknown>(value: Value): void` applies `filterNodeMethod`. It throws when that prop is absent.
2. `scrollToItem(key: TreeKey, levelStepPadding?: number, animation?: boolean): void` schedules scrolling to a currently flattened visible item. The optional values default to `18` and `false`. Matching requires `nodeKey`; the method returns before its internal asynchronous positioning finishes.
3. `getNodePath(data: TreeNodeReference<T>): T[]` returns root-to-node raw data, returns `[]` for an unknown reference, and throws when `nodeKey` is absent.
4. `getCheckedNodes(leafOnly?: boolean, includeHalfChecked?: boolean): T[]` returns checked data. Both flags default to `false`.
5. `getCheckedKeys(leafOnly?: boolean): Array<TreeKey | undefined>` maps checked data through `nodeKey`; without a configured key an entry can be `undefined`.
6. `getCurrentNode(): T | null` returns current raw data or `null`.
7. `getCurrentKey(): TreeKey | null` returns the current key or `null` and throws when `nodeKey` is absent.
8. `setCheckedNodes(nodes: T[], leafOnly?: boolean): void` replaces checkbox selection from raw data and requires `nodeKey`.
9. `setCheckedKeys(keys: TreeKey[], leafOnly?: boolean): void` replaces checkbox selection from keys and requires `nodeKey`.
10. `setChecked(data: TreeNodeReference<T>, checked: boolean, deep?: boolean): void` changes one resolved node; an unknown reference is ignored.
11. `setCheckedAll(checked?: boolean): void` changes all registered nodes; `checked` defaults to `true`.
12. `getHalfCheckedNodes(): T[]` returns indeterminate-node data.
13. `getHalfCheckedKeys(): Array<TreeKey | undefined>` returns indeterminate-node keys.
14. `getSelectedLeafNodes(): T[]` returns selected leaf data. Outside `selectChildrenOnly` mode it is equivalent to checked leaf nodes.
15. `getSelectedLeafKeys(): Array<TreeKey | undefined>` returns selected leaf keys.
16. `setCurrentNode(node: T): void` makes existing raw data current and requires `nodeKey`; pass data already present in the tree.
17. `setCurrentKey(key: TreeKey | null): void` sets an existing key current or clears current state with `null`; it requires `nodeKey`.
18. `getNode(data: TreeNodeReference<T>): Node<T> | null` resolves a key, raw data object, or `Node<T>` and returns `null` when unresolved.
19. `remove(data: TreeNodeReference<T>): void` removes a resolved node; an unknown reference is ignored.
20. `append(data: T, parentNode?: TreeNodeReference<T> | null): void` appends under a resolved parent, or under the virtual root when the parent is omitted.
21. `insertBefore(data: T, refNode: TreeNodeReference<T>): void` inserts next to an existing reference; the reference must resolve.
22. `insertAfter(data: T, refNode: TreeNodeReference<T>): void` inserts next to an existing reference; the reference must resolve.
23. `updateKeyChildren(key: TreeKey, data: T[]): void` replaces the direct children of an existing key, requires `nodeKey`, and ignores an unknown key.

Methods that mutate structure also mutate the corresponding `children` array in the supplied data objects.

### Events

| Event | Payload | Notes |
| --- | --- | --- |
| `node-click` | `data, node, instance` | A row was clicked. |
| `node-expand` | `data, node, instance` | The built-in expand control expanded a node. |
| `node-collapse` | `data, node, instance` | The built-in expand control collapsed a node. |
| `node-contextmenu` | `event, data, node, instance` | Native `MouseEvent` first. |
| `current-change` | `data, node` | Both values are nullable in the public event type. |
| `check-change` | `data, checked, indeterminate` | Emitted when a node's checkbox state changes. |
| `check` | `data, state` | `state` is `VueVirtualTreeCheckState<T>`. |

`VueVirtualTreeCheckState<T>` contains `checkedNodes`, `checkedKeys`, `halfCheckedNodes`, and `halfCheckedKeys`. It can also contain `selectedLeafNodes` and `selectedLeafKeys` when `selectChildrenOnly` is enabled.

### Default slot

The default slot receives `{ node, item, selectChange }` as `VueVirtualTreeDefaultSlotProps<T>`:

| Value | Type | Meaning |
| --- | --- | --- |
| `node` | `Node<T>` | Tree model wrapper and state. |
| `item` | `T` | Raw node data. |
| `selectChange` | `(checked: boolean) => void` | Sends a checkbox change through the tree. |

### Key exported types

```ts
import type {
  FilterFunction,
  LoadFunction,
  Node,
  TreeKey,
  TreeNodeData,
  TreeNodeReference,
  TreeOptionProps,
  VueVirtualTreeCheckState,
  VueVirtualTreeDefaultSlotProps,
  VueVirtualTreeEventMap,
  VueVirtualTreeInstance,
  VueVirtualTreeProps,
} from '@zjinh/vue-virtual-tree'
```

- `TreeKey` is `string | number`.
- `TreeNodeData` is `object`.
- `TreeNodeReference<T>` is `TreeKey | T | Node<T>`.
- `TreeOptionProps<T>` maps children, label, disabled, leaf, and custom properties to typed fields or getter functions.
- `LoadFunction<T>` is `(node: Node<T>, resolve: (data: T[]) => void) => void`.
- `FilterFunction<T, Value>` is `(value: Value, data: T, node: Node<T>) => boolean`.
- `Node<T>` is the public model-node interface. `Node` and `TreeStore` constructors are also named runtime exports.
- `VueVirtualTreeCheckState<T>` describes the `check` event state.
- `VueVirtualTreeDefaultSlotProps<T>` describes `{ node, item, selectChange }`.
- `VueVirtualTreeEventMap<T>` maps the seven public event names to their tuples.
- `VueVirtualTreeProps<T>` and `VueVirtualTreeInstance<T>` are the component prop and ref contracts.

<!-- section:limitations -->
## Limits and compatibility boundaries

- Vue 2 support is limited to Vue 2.7.x. Earlier Vue 2 releases are outside the peer and build contract.
- The published package is ESM only. Consumers need an ESM-aware bundler or runtime.
- Virtualization assumes a positive fixed row size. Variable row heights, wrapping content, or a zero-height container can produce incorrect ranges.
- Modern browsers must provide ESM, `ResizeObserver`, and `requestAnimationFrame`. There is no separately tested legacy-browser build.
- Virtualization reduces rendered DOM rows, not the full model-data cost. Filtering, bulk checking, and other tree-wide operations can still scale with logical node count.
- Lazy loading expects the application loader to call `resolve(T[])`. Loading policy, retries, cancellation, and server errors remain application concerns.
- `renderContent` is deprecated and unsupported even though a runtime compatibility prop remains. Use the default scoped slot.

Workbench durations, frame samples, rendered-row counts, and virtualization ratios are real-time measurements from the current browser, hardware, data, and interaction. They are diagnostics, not fixed performance promises. JS heap reporting uses the optional Chromium `performance.memory` API; other browsers can show it as unavailable.

<!-- section:development -->
## Development and quality gates

Use the pinned toolchain:

```sh
node --version  # v22.22.3
pnpm --version  # 10.33.4
pnpm install --frozen-lockfile
```

| Command | What it proves |
| --- | --- |
| `pnpm run build` | Builds Vue 2 and Vue 3 ESM entries, shared CSS, and declarations into `dist`. |
| `pnpm test` | Runs package and source tests, model and component suites for both runtimes, type checks, the build, built artifacts checks, type consumers, and demo checks. |
| `pnpm run publish:check` | Runs the release checks plus `publint`, builds `.release/package.tgz`, installs the tarball into isolated Vue 2.7 consumer and Vue 3 consumer projects, and runs Are the Types Wrong. |
| `pnpm run ci:check` | Runs `publish:check` and then the GitHub Pages build and contract. |
| `pnpm run test:pages` | Builds `_site` and tests the Pages launcher and both runtime assets. It does not deploy them. |
| `pnpm run dev:vue2` | Builds the package and starts the Vue 2.7 Workbench locally. |
| `pnpm run dev:vue3` | Builds the package and starts the Vue 3 Workbench locally. |

These gates have separate evidence boundaries: source tests cover source behavior, built artifacts checks cover `dist`, the tarball contract covers the exact packed files and two isolated consumers, Are the Types Wrong checks package type resolution, `publint` checks package metadata and artifacts, and Pages tests cover the static site assembly. A green local command is not proof that npm publication or a Pages deployment happened.

<!-- section:release -->
## Publishing and Pages operations

### First npm publication

If the package does not yet exist on npm, bootstrap it manually from a clean checkout with Node.js 22.22.3 and pnpm 10.33.4:

```sh
pnpm install --frozen-lockfile
pnpm run publish:check
npm publish .release/package.tgz --access public
```

`publish:check` creates and validates `.release/package.tgz`. The final command requires an npm account with publish permission for the scope and any required 2FA. Do not publish the working directory in place of the verified tarball.

### Trusted Publisher releases

After the npm package exists, configure an npmjs [Trusted Publisher](https://docs.npmjs.com/trusted-publishers/) with:

- repository owner: `zjinh`
- repository: `vue-virtual-tree`
- workflow filename: `publish.yml`

The workflow accepts a stable published GitHub Release only when its tag is exactly `v<package.version>`. A prerelease does not publish. GitHub Actions exchanges OIDC identity with npm, so the workflow has no `NPM_TOKEN`; npm provenance is attached automatically by trusted publishing.

### GitHub Pages

In repository **Settings**, set Pages source to **GitHub Actions**. The Pages workflow builds and tests the Workbench plus the Vue 2.7 and Vue 3 apps before deployment.

<!-- section:license -->
## License

[MIT](./LICENSE)
