[English](./README.md) | [简体中文](./README.zh-CN.md)

# @zjinh/vue-virtual-tree

<!-- section:positioning -->
## 定位与兼容范围

`@zjinh/vue-virtual-tree` 是一个固定行高的虚拟树组件，以同一套公开 API 支持 Vue 2.7 和 Vue 3。组件提供复选框选择、当前节点、过滤、懒加载、数据变更方法和默认 scoped slot。

| 运行时 | 支持版本 | 导入入口 |
| --- | --- | --- |
| Vue 2 | 仅 Vue 2.7.x | `@zjinh/vue-virtual-tree/vue2` |
| Vue 3 | Vue 3 >= 3.2 | `@zjinh/vue-virtual-tree` 或 `@zjinh/vue-virtual-tree/vue3` |

发布包为 ESM。默认入口和 `/vue3` 都指向 Vue 3 构建，`/vue2` 指向 Vue 2.7 构建。样式从 `@zjinh/vue-virtual-tree/style.css` 导出。

Node.js 22.22.3 和 pnpm 10.33.4 只是仓库固定的开发与发布工具链，并非浏览器消费者的运行时要求。

<!-- section:demos -->
## 在线演示

- [Workbench](https://zjinh.github.io/vue-virtual-tree/)
- [Vue 2.7 演示](https://zjinh.github.io/vue-virtual-tree/vue2/)
- [Vue 3 演示](https://zjinh.github.io/vue-virtual-tree/vue3/)

仓库 Pages 的 **Settings** 将 source 设置为 **GitHub Actions**，且部署成功后，上述 GitHub Pages 链接才会生效。这里给出的是配置目标，不代表当前已经完成在线部署。

Workbench 运行真实组件，并为两个 Vue 运行时提供受支持的 props、方法、事件、数据规模和本机浏览器测量功能。

<!-- section:installation -->
## 安装

以下 registry 安装命令在 npm 首次发布完成后才可用。任选一种包管理器：

```sh
pnpm add @zjinh/vue-virtual-tree
```

```sh
npm install @zjinh/vue-virtual-tree
```

```sh
yarn add @zjinh/vue-virtual-tree
```

应用还需要安装兼容的 Vue peer：`/vue2` 入口使用 Vue 2.7.x，默认入口和 `/vue3` 使用 Vue 3 >= 3.2。

如果包尚未发布，请先在 checkout 中构建已验证的 tarball，再到消费应用中安装该文件：

```sh
# 在 vue-virtual-tree checkout 中
pnpm install --frozen-lockfile
pnpm run publish:check

# 在消费应用中
pnpm add file:../vue-virtual-tree/.release/package.tgz
```

<!-- section:quick-start -->
## 快速开始

### Vue 3 全局注册

```ts
import { createApp } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'
import App from './App.vue'

createApp(App).use(VueVirtualTree).mount('#app')
```

显式 Vue 3 入口与默认入口等价：

```ts
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue3'
```

### Vue 3 局部注册

```ts
import { defineComponent } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

export default defineComponent({
  components: { VueVirtualTree },
})
```

### Vue 2.7 全局注册

```ts
import Vue from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue2'
import '@zjinh/vue-virtual-tree/style.css'

Vue.use(VueVirtualTree)
```

### Vue 2.7 局部注册

```vue
<script lang="ts">
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue2'
import '@zjinh/vue-virtual-tree/style.css'

interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

export default {
  components: { VueVirtualTree },
  data(): { data: DemoNode[] } {
    return {
      data: [{
        id: 1,
        label: 'Root',
        children: [{ id: 2, label: 'Child' }],
      }],
    }
  },
}
</script>

<template>
  <VueVirtualTree :data="data" :height="320" node-key="id"></VueVirtualTree>
</template>
```

### 最小 Vue 3 树示例

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
    label: '根节点',
    children: [
      { id: 2, label: '第一个子节点' },
      { id: 3, label: '第二个子节点' },
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
## 实用用法

本节完整示例均为 Vue 3 SFC。Vue 2.7 使用相同公开 API，但需要采用 `/vue2` 入口和 [Vue 2.7 快速开始](#vue-27-局部注册)中的 Options API。

### 布局与数据约束

- 为树提供固定且能实际计算出的高度。直接传数字 `height`，例如 `320`，最简单。使用默认 `height="100%"` 时，父元素必须有非零计算高度。
- 保证 `itemSize > 0`，并让实际渲染行高与它一致。可变行高或内容换行会破坏虚拟滚动计算。
- 为按 key 调用的方法、默认选中或展开、当前节点以及可靠更新设置稳定且唯一的 `nodeKey`。
- 在应用入口或其他统一位置导入一次 CSS。

### 大数据与虚拟化建议

虚拟化限制的是挂载到 DOM 的行数，它不会移除内存中的树模型，也不会让所有树操作变为常量时间。处理大数据时：

- 更新前后保持 key 稳定；
- 局部变化时避免重建整个 data 数组；
- 子节点可按需获取时使用 `lazy`；
- 只展开用户当前需要的分支；
- 在目标浏览器和硬件上运行 Workbench 预设，再确定生产数据上限。

### 复选框与当前节点

<!-- readme-example:checkbox-current:start -->
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
<!-- readme-example:checkbox-current:end -->

`highlightCurrent` 只门控当前行的 `is-current` 样式。关闭高亮后，点击或设置当前节点仍会更新 current 状态。

### 过滤

调用 `filter()` 前必须提供 `filterNodeMethod`。下面直接使用原生输入框，不依赖其他 UI 库。

<!-- readme-example:filter:start -->
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
<!-- readme-example:filter:end -->

### 懒加载

<!-- readme-example:lazy:start -->
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
<!-- readme-example:lazy:end -->

启用 `lazy` 后，应用必须调用 `resolve()` 并传入子节点数组。如果能提前确定叶子状态，可通过 `props.isLeaf` 映射布尔字段。

### 默认 scoped slot

真实 slot 契约是 `{ node, item, selectChange }`，其中 `item` 是原始节点数据。下面把 `item` 局部别名为 `data`，并用提供的回调改变复选状态：

<!-- readme-example:slot:start -->
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
<!-- readme-example:slot:end -->

传入默认 slot 会替换内置行内容，包括展开控件和内置复选框。自定义内容需要自行提供所需控件。

### 通过 ref 调用方法

<!-- readme-example:ref-methods:start -->
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
<!-- readme-example:ref-methods:end -->

<!-- section:api -->
## 公开 API

### Props

受支持的 prop 恰好为 21 项。

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data` | `T[]` | `[]` | 树数据。 |
| `emptyText` | `string` | `暂无数据` | 没有可见节点时显示的文字。 |
| `nodeKey` | `TreeNodeKey<T>` | 未设置 | 节点中唯一的字符串或数字字段，在 store 初始化时读取，下文标记的 key 相关方法依赖它。 |
| `checkStrictly` | `boolean` | `false` | 停止父子复选状态联动。 |
| `defaultExpandAll` | `boolean` | `false` | 初始化时展开节点，改变这个初始化选项后需要重新挂载。 |
| `checkDescendants` | `boolean` | `false` | 控制懒加载场景后代节点选中处理的初始化选项。 |
| `selectChildrenOnly` | `boolean` | `false` | 启用叶子选择行为并向 `check` 状态加入叶子结果的初始化选项。 |
| `itemSize` | `number` | `26` | 固定行高，单位为像素，必须大于零。 |
| `autoExpandParent` | `boolean` | `true` | 初始化时展开默认展开 key 的祖先节点。 |
| `defaultCheckedKeys` | `TreeKey[]` | `[]` | 初始选中 key，需要 `nodeKey`。 |
| `defaultExpandedKeys` | `TreeKey[]` | `[]` | 初始展开 key，需要 `nodeKey`。 |
| `currentNodeKey` | `TreeKey` | 未设置 | 初始当前节点 key，需要 `nodeKey`，后续变更请调用方法。 |
| `showCheckbox` | `boolean` | `false` | 使用内置行内容时渲染复选框。 |
| `props` | `TreeOptionProps<T>` | label / children / disabled | 初始化时把 `label`、`children`、`disabled`、`isLeaf` 或自定义属性映射到数据。 |
| `lazy` | `boolean` | `false` | 初始化时启用按需加载子节点。 |
| `highlightCurrent` | `boolean` | `false` | 门控当前行样式，不会禁用 current 状态。 |
| `load` | `LoadFunction<T>` | 未设置 | 初始化时传入、在 `lazy` 为 true 时使用的加载函数。 |
| `filterNodeMethod` | `FilterFunction<T, Value>` | 未设置 | 调用 `filter()` 前必须提供，替换函数后需要重新挂载。 |
| `indent` | `number` | `18` | 内置行每级缩进的像素数。 |
| `iconClass` | `string` | 未设置 | 内置展开图标的自定义 class。 |
| `height` | `string \| number` | `100%` | 虚拟列表高度，百分比需要父元素已有高度。 |

`renderContent` 只作为不受支持的兼容占位保留：

| Prop | 类型 | 状态 | 替代方案 |
| --- | --- | --- | --- |
| `renderContent` | `never` | deprecated，unsupported | 使用默认 scoped slot。 |

`VueVirtualTreeProps<T>` 的公开契约不包含其他组件 props。

### 方法

以下 23 个方法均由 `VueVirtualTreeInstance<T>` 暴露。

1. `filter<Value = unknown>(value: Value): void` 使用 `filterNodeMethod` 过滤。未提供该 prop 时抛错。
2. `scrollToItem(key: TreeKey, levelStepPadding?: number, animation?: boolean): void` 安排滚动到当前已扁平化且可见的目标。两个可选值默认是 `18` 和 `false`。匹配依赖 `nodeKey`，内部异步定位完成前方法已经返回。
3. `getNodePath(data: TreeNodeReference<T>): T[]` 返回从根到节点的原始数据路径。引用不存在时返回 `[]`，未设置 `nodeKey` 时抛错。
4. `getCheckedNodes(leafOnly?: boolean, includeHalfChecked?: boolean): T[]` 返回选中数据，两个标志默认均为 `false`。
5. `getCheckedKeys(leafOnly?: boolean): Array<TreeKey | undefined>` 使用 `nodeKey` 映射选中数据，未配置 key 时结果项可能为 `undefined`。
6. `getCurrentNode(): T | null` 返回当前节点原始数据，没有当前节点时返回 `null`。
7. `getCurrentKey(): TreeKey | null` 返回当前 key 或 `null`，未设置 `nodeKey` 时抛错。
8. `setCheckedNodes(nodes: T[], leafOnly?: boolean): void` 使用原始数据替换复选状态，需要 `nodeKey`。
9. `setCheckedKeys(keys: TreeKey[], leafOnly?: boolean): void` 使用 key 替换复选状态，需要 `nodeKey`。
10. `setChecked(data: TreeNodeReference<T>, checked: boolean, deep?: boolean): void` 改变一个可解析节点，无法解析的引用会被忽略。
11. `setCheckedAll(checked?: boolean): void` 需要 `nodeKey`，否则不执行任何节点。它会改变全部已注册节点，`checked` 默认是 `true`。
12. `getHalfCheckedNodes(): T[]` 返回半选节点数据。
13. `getHalfCheckedKeys(): Array<TreeKey | undefined>` 返回半选节点 key。
14. `getSelectedLeafNodes(): T[]` 返回已选叶子数据。未启用 `selectChildrenOnly` 时等价于已选叶子节点。
15. `getSelectedLeafKeys(): Array<TreeKey | undefined>` 返回已选叶子 key。
16. `setCurrentNode(node: T): void` 把树中已有的原始数据设为当前节点，需要 `nodeKey`。传入数据必须已存在于树中。
17. `setCurrentKey(key: TreeKey | null): void` 把已有 key 设为当前节点，传 `null` 清空当前状态，需要 `nodeKey`。
18. `getNode(data: TreeNodeReference<T>): Node<T> | null` 解析 key、原始数据对象或 `Node<T>`，无法解析时返回 `null`。
19. `remove(data: TreeNodeReference<T>): void` 删除可解析节点，未知引用会被忽略。
20. `append(data: T, parentNode?: TreeNodeReference<T> | null): void` 添加到可解析父节点下，省略父节点时添加到虚拟根下。
21. `insertBefore(data: T, refNode: TreeNodeReference<T>): void` 在已有引用前插入，引用必须能解析。
22. `insertAfter(data: T, refNode: TreeNodeReference<T>): void` 在已有引用后插入，引用必须能解析。
23. `updateKeyChildren(key: TreeKey, data: T[]): void` 替换已有 key 的直接子节点，需要 `nodeKey`，未知 key 会被忽略。

结构变更方法也会修改传入数据对象中对应的 `children` 数组。

### 事件

| 事件 | Payload | 说明 |
| --- | --- | --- |
| `node-click` | `data, node, instance` | 点击某一行。 |
| `node-expand` | `data, node, instance` | 内置展开控件展开节点。 |
| `node-collapse` | `data, node, instance` | 内置展开控件收起节点。 |
| `node-contextmenu` | `event, data, node, instance` | 第一个参数是原生 `MouseEvent`。 |
| `current-change` | `data, node` | 公开事件类型中的两个值都允许为 null。 |
| `check-change` | `data, checked, indeterminate` | 节点复选状态发生变化。 |
| `check` | `data, state` | `state` 为 `VueVirtualTreeCheckState<T>`。 |

`VueVirtualTreeCheckState<T>` 包含 `checkedNodes`、`checkedKeys`、`halfCheckedNodes` 和 `halfCheckedKeys`。启用 `selectChildrenOnly` 时，还可能包含 `selectedLeafNodes` 与 `selectedLeafKeys`。

### 默认 slot

默认 slot 接收 `{ node, item, selectChange }`，类型是 `VueVirtualTreeDefaultSlotProps<T>`：

| 值 | 类型 | 含义 |
| --- | --- | --- |
| `node` | `Node<T>` | 树模型包装和状态。 |
| `item` | `T` | 原始节点数据。 |
| `selectChange` | `(checked: boolean) => void` | 通过树触发复选状态变化。 |

### 关键导出类型

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

- `TreeKey` 是 `string | number`。
- `TreeNodeData` 是 `object`。
- `TreeNodeReference<T>` 是 `TreeKey | T | Node<T>`。
- `TreeOptionProps<T>` 把 children、label、disabled、leaf 和自定义属性映射到有类型约束的字段或 getter 函数。
- `LoadFunction<T>` 是 `(node: Node<T>, resolve: (data: T[]) => void) => void`。
- `FilterFunction<T, Value>` 是 `(value: Value, data: T, node: Node<T>) => boolean`。
- `Node<T>` 是公开模型节点接口。`Node` 和 `TreeStore` 构造器也作为具名运行时值导出。
- `VueVirtualTreeCheckState<T>` 描述 `check` 事件状态。
- `VueVirtualTreeDefaultSlotProps<T>` 描述 `{ node, item, selectChange }`。
- `VueVirtualTreeEventMap<T>` 把 7 个公开事件名映射到参数元组。
- `VueVirtualTreeProps<T>` 和 `VueVirtualTreeInstance<T>` 分别是组件 prop 与 ref 契约。

<!-- section:limitations -->
## 限制与兼容边界

- Vue 2 支持范围仅为 Vue 2.7.x，更早的 Vue 2 不在 peer 和构建契约内。
- 发布包仅提供 ESM，消费者需要支持 ESM 的构建工具或运行时。
- 虚拟化假设行高固定且为正数。可变行高、内容换行或零高度容器会导致区间计算错误。
- 组件需要支持 ESM 的环境和 `ResizeObserver`。项目没有单独验证传统浏览器构建。
- 虚拟化减少的是渲染 DOM 行数，不是完整模型数据成本。过滤、批量选中和其他全树操作仍可能随逻辑节点数增长。
- 懒加载要求应用加载器调用 `resolve(T[])`。加载策略、重试、取消和服务端错误处理属于应用职责。
- 即使运行时仍保留兼容 prop，`renderContent` 也已经 deprecated 且 unsupported，请使用默认 scoped slot。

Workbench 测量代码使用 `requestAnimationFrame` 和可选的 `performance` API。其中的耗时、帧采样、渲染行数和虚拟化比例都是当前浏览器、硬件、数据与交互下的实时测量，只用于诊断，不承诺固定性能数字。JS heap 使用 Chromium 可选的 `performance.memory` API，其他浏览器可能显示不可用。

<!-- section:development -->
## 开发与质量门禁

使用仓库固定工具链：

```sh
node --version  # v22.22.3
pnpm --version  # 10.33.4
pnpm install --frozen-lockfile
```

| 命令 | 能证明的范围 |
| --- | --- |
| `pnpm run build` | 把 Vue 2、Vue 3 ESM 入口、共享 CSS 和声明构建到 `dist`。 |
| `pnpm test` | 运行 package 和 source tests、两个运行时的模型与组件测试、类型检查、构建、built artifacts 检查、类型消费者和 demo 检查。 |
| `pnpm run publish:check` | 运行 release 检查与 `publint`，构建 `.release/package.tgz`，把 tarball 安装进隔离的 Vue 2.7 consumer 和 Vue 3 consumer，并执行 Are the Types Wrong。 |
| `pnpm run ci:check` | 先运行 `publish:check`，再运行 GitHub Pages 构建与契约。 |
| `pnpm run test:pages` | 构建 `_site`，测试 Pages 启动页和两个运行时资产，不执行部署。 |
| `pnpm run dev:vue2` | 先构建包，再启动本地 Vue 2.7 Workbench。 |
| `pnpm run dev:vue3` | 先构建包，再启动本地 Vue 3 Workbench。 |

各门禁的证据边界不同：source tests 覆盖源码行为，built artifacts 检查覆盖 `dist`，tarball 契约覆盖实际打包文件与两个隔离消费者，Are the Types Wrong 检查包类型解析，`publint` 检查包元数据与产物，Pages 测试覆盖静态站点组装。本地命令通过不能证明 npm 发布或 Pages 在线部署已经发生。

<!-- section:release -->
## 发布与 Pages 运维

### npm 首次发布

如果包在 npm 上尚未存在，请从干净的检出目录使用 Node.js 22.22.3 和 pnpm 10.33.4 人工 bootstrap：

```sh
pnpm install --frozen-lockfile
pnpm run publish:check
npm publish .release/package.tgz --access public
```

`publish:check` 会生成并验证 `.release/package.tgz`。最后一条命令要求 npm 账号具有该 scope 的发布权限，并完成所需的 2FA。不要用工作目录代替已经验证的 tarball 发布。

### Trusted Publisher 发布

npm 包存在后，在 npmjs 按照 [Trusted Publisher 官方文档](https://docs.npmjs.com/trusted-publishers/) 配置：

- repository owner：`zjinh`
- repository：`vue-virtual-tree`
- workflow filename：`publish.yml`

工作流只接受 stable 的已发布 GitHub Release，并要求 tag 精确等于 `v<package.version>`。prerelease 不发布。GitHub Actions 通过 OIDC 与 npm 交换身份，因此工作流不配置 `NPM_TOKEN`，trusted publishing 会自动附加 provenance。

### GitHub Pages

在仓库 **Settings** 中将 Pages source 设为 **GitHub Actions**。Pages 工作流会先构建并测试 Workbench、Vue 2.7 应用和 Vue 3 应用，再执行部署。

<!-- section:license -->
## 许可证

[MIT](./LICENSE)
