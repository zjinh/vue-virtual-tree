[English](./guide.md) | [简体中文](./guide.zh-CN.md) | [README](../README.zh-CN.md)

# 使用指南

本页的 5 个完整示例均为 Vue 3 SFC。Vue 2.7 通过 `/vue2` 入口使用相同的组件 API，具体见下方[在 Vue 2.7 中使用](#在-vue-27-中使用)。

完整的 props、事件、slot、方法和类型契约见 [API 参考](./api.zh-CN.md)。

<!-- section:layout -->
## 尺寸与数据设置

- 为树提供固定且能实际计算出的高度。直接传数字 `height`，例如 `320`，最简单。使用默认 `height="100%"` 时，父元素必须有非零计算高度。
- 保证 `itemSize > 0`，并让实际渲染行高与它一致。可变行高或内容换行会破坏虚拟滚动计算。
- 为按 key 调用的方法、默认选中或展开、当前节点以及可靠更新设置稳定且唯一的 `nodeKey`。
- 在应用入口或其他统一位置导入一次 CSS。
- 运行环境需要提供 `ResizeObserver`；如果目标环境没有，请在挂载组件前加载兼容的 polyfill。

数据是对象数组。默认字段名是 `label`、`children` 和 `disabled`；如果数据字段不同，可通过 `props` 映射字段名或 getter 函数。

<!-- section:large-data -->
## 大规模树数据

虚拟化限制的是挂载到 DOM 的行数，它不会移除内存中的树模型，也不会让所有树操作变为常量时间。处理大数据时：

- 更新前后保持 key 稳定；
- 局部变化时避免重建整个 data 数组；
- 子节点可按需获取时使用 `lazy`；
- 只展开用户当前需要的分支；
- 在目标浏览器和硬件上运行 [Workbench](https://zjinh.github.io/vue-virtual-tree/) 预设，再确定应用的数据上限。

过滤、批量选中和其他全树操作仍可能随逻辑节点数增长。

<!-- section:checkbox-current -->
## 复选框与当前节点

使用 `show-checkbox` 和 `highlight-current` 分别启用内置复选框与当前行样式。默认 key 会在树初始化时应用。

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

`highlightCurrent` 只控制当前行的 `is-current` 样式。关闭高亮后，点击行或调用当前节点方法仍会更新 current 状态。

`checkStrictly` 会停止父子复选状态联动。`selectChildrenOnly` 会向 `check` 事件状态加入已选叶子结果，并改变分支选择方式。把这些选项与懒加载组合使用前，请先查看 API 说明。

<!-- section:filter -->
## 过滤

调用 `filter()` 前必须提供 `filterNodeMethod`。下面直接使用原生输入框，不依赖其他 UI 库。

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

过滤函数接收过滤值、原始节点数据和模型节点。后代节点命中时，其祖先路径也会保持可见。对于非懒加载数据，非空过滤值会展开命中路径。

<!-- section:lazy -->
## 懒加载

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

启用 `lazy` 后，每次加载完成都要调用 `resolve()` 并传入子节点数组。如果能提前确定叶子状态，可通过 `props.isLeaf` 映射布尔字段。请求重试、取消与错误界面由应用的加载函数处理。

<!-- section:slot -->
## 自定义行内容

默认 scoped slot 接收 `{ node, item, selectChange }`，其中 `item` 是原始节点数据。下面把 `item` 局部别名为 `data`，并用提供的回调改变复选状态：

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

传入默认 slot 会替换整段内置行内容，包括缩进、展开控件、加载状态、复选框和标签。自定义内容需要自行渲染所需控件。

<!-- section:ref-methods -->
## 通过 ref 调用方法

使用 `VueVirtualTreeInstance<T>` 标注模板 ref 的类型，在组件挂载后即可调用 23 个公开方法。

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

按 key 调用的方法需要稳定的 `nodeKey`。结构变更方法会同时更新内部模型与对应的原始 `children` 数组。缺少 key 或节点时的具体行为见[方法参考](./api.zh-CN.md#方法)。

<!-- section:vue2 -->
## 在 Vue 2.7 中使用

从 `@zjinh/vue-virtual-tree/vue2` 导入组件与类型，并继续导入公共 CSS。props、事件、slot 参数和 ref 方法与 Vue 3 相同。

使用 Options API 管理组件状态和局部注册：

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

通过 `$refs` 访问实例时，请给组件添加 `ref="tree"`。全局注册和最小模板见 [README 快速开始](../README.zh-CN.md#vue-27-快速开始)。
