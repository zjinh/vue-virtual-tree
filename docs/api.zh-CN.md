[English](./api.md) | [简体中文](./api.zh-CN.md) | [README](../README.zh-CN.md)

# API 参考

默认入口和 `/vue3` 提供 Vue 3 构建，Vue 2.7 构建从 `/vue2` 导入。两个构建使用本页所列的相同契约。

完整可运行示例见[使用指南](./guide.zh-CN.md)。

<!-- section:props -->
## Props

组件公开契约包含 21 个受支持的 prop。

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data` | `T[]` | 未设置 | 树数据。省略时，组件内部按空数组处理。 |
| `emptyText` | `string` | `暂无数据` | 没有可见节点时显示的文字。 |
| `nodeKey` | `TreeNodeKey<T>` | 未设置 | 节点中唯一的字符串或数字字段。store 初始化时读取它，下文标记的 key 相关方法依赖它。 |
| `checkStrictly` | `boolean` | `false` | 停止父子复选状态联动，运行时变化会更新 store。 |
| `defaultExpandAll` | `boolean` | `false` | 初始化时展开节点；改变这个初始化选项后需要重新挂载。 |
| `checkDescendants` | `boolean` | `false` | 控制懒加载场景后代节点选中处理的初始化选项。 |
| `selectChildrenOnly` | `boolean` | `false` | 启用叶子选择行为，并向 `check` 状态加入叶子结果。请在挂载前配置。 |
| `itemSize` | `number` | `26` | 固定行高，单位为像素，必须大于零。 |
| `autoExpandParent` | `boolean` | `true` | 初始化时展开默认展开 key 的祖先节点。 |
| `defaultCheckedKeys` | `TreeKey[]` | 未设置 | 初始选中的 key；省略时内部按空数组处理，并依赖 `nodeKey`。挂载后替换该 prop 只会选中新数组中的 key，不会取消已移除 key 的选中状态；如需替换完整选中集合，请调用 `setCheckedKeys()`。 |
| `defaultExpandedKeys` | `TreeKey[]` | 未设置 | 初始展开的 key；省略时内部按空数组处理，并依赖 `nodeKey`。挂载后替换该 prop 会展开新数组中的 key；启用 `autoExpandParent` 时也会展开祖先，但不会收起已移除的 key；如需收起，请调用 `getNode(key)?.collapse()`。 |
| `currentNodeKey` | `TreeKey` | 未设置 | 初始当前节点 key，需要 `nodeKey`；后续变更请调用方法。 |
| `showCheckbox` | `boolean` | `false` | 使用内置行内容时渲染复选框。 |
| `props` | `TreeOptionProps<T>` | children / label / disabled | 初始化时映射 `children`、`label`、`disabled` 和 `isLeaf`；每项可使用字段名或 getter。 |
| `lazy` | `boolean` | `false` | 初始化时启用按需加载子节点。 |
| `highlightCurrent` | `boolean` | `false` | 控制 current 行样式，不会禁用当前节点状态。 |
| `load` | `LoadFunction<T>` | 未设置 | 初始化时传入、在 `lazy` 为 true 时使用的加载函数。 |
| `filterNodeMethod` | `FilterFunction<T>` | 未设置 | 调用 `filter()` 前必须提供；替换函数后需要重新挂载。 |
| `indent` | `number` | `18` | 内置行每级缩进的像素数。 |
| `iconClass` | `string` | 未设置 | 内置展开图标的自定义 class。 |
| `height` | `string \| number` | `100%` | 虚拟列表高度。百分比需要父元素已有高度，数字按像素处理。 |

`renderContent` 只作为不受支持的兼容占位保留：

| Prop | 类型 | 状态 | 替代方案 |
| --- | --- | --- | --- |
| `renderContent` | `never` | deprecated，unsupported | 使用默认 scoped slot。 |

`VueVirtualTreeProps<T>` 不包含其他组件 props。特别是拖拽、accordion 和点击展开选项都不是公开组件 props。

<!-- section:methods -->
## 方法

以下 23 个方法均由 `VueVirtualTreeInstance<T>` 暴露。

1. `filter<Value = unknown>(value: Value): void` 使用 `filterNodeMethod` 过滤。未提供该 prop 时抛错。
2. `scrollToItem(key: TreeKey, levelStepPadding?: number, animation?: boolean): void` 安排滚动到当前已扁平化且可见的目标。两个可选值默认是 `18` 和 `false`。匹配依赖 `nodeKey`，内部异步定位完成前方法已经返回。空树或 falsy 高度会导致抛错。
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

结构变更方法也会修改传入原始数据对象中对应的 `children` 数组。`insertBefore()` 与 `insertAfter()` 要求引用有效，无法解析时可能失败。

<!-- section:events -->
## 事件

公开事件映射包含 7 个事件。

| 事件 | Payload | 类型 | 说明 |
| --- | --- | --- | --- |
| `node-click` | `data, node, instance` | `[data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | 点击某一行。 |
| `node-expand` | `data, node, instance` | `[data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | 内置展开控件展开节点。 |
| `node-collapse` | `data, node, instance` | `[data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | 内置展开控件收起节点。 |
| `node-contextmenu` | `event, data, node, instance` | `[event: MouseEvent, data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | 第一个参数是原生 `MouseEvent`。 |
| `current-change` | `data, node` | `[data: T \| null, node: Node<T> \| null]` | 公开事件类型中的两个值都允许为 `null`。 |
| `check-change` | `data, checked, indeterminate` | `[data: T, checked: boolean, indeterminate: boolean]` | 节点复选状态发生变化。 |
| `check` | `data, state` | `[data: T, state: VueVirtualTreeCheckState<T>]` | `state` 为 `VueVirtualTreeCheckState<T>`。 |

`VueVirtualTreeCheckState<T>` 包含 `checkedNodes`、`checkedKeys`、`halfCheckedNodes` 和 `halfCheckedKeys`。启用 `selectChildrenOnly` 时，还可能包含 `selectedLeafNodes` 与 `selectedLeafKeys`。

如果要在两个 Vue 构建中一致地阻止原生右键菜单，请在 `node-contextmenu` 处理函数中调用 `event.preventDefault()`。

<!-- section:slot -->
## 默认 slot

默认 slot 接收 `{ node, item, selectChange }`，类型是 `VueVirtualTreeDefaultSlotProps<T>`：

| 值 | 类型 | 含义 |
| --- | --- | --- |
| `node` | `Node<T>` | 树模型包装和状态。 |
| `item` | `T` | 原始节点数据。 |
| `selectChange` | `VueVirtualTreeSelectChange` | 通过树触发复选状态变化。 |

传入该 slot 会替换整段内置行内容，包括缩进、展开控件、加载状态、复选框和标签。

<!-- section:types -->
## 导出类型

包入口导出以下 32 个类型与接口。

| 类型 | 用途 |
| --- | --- |
| `TreeKey` | 节点 key，即 `string \| number`。 |
| `TreeNodeData` | 原始节点数据的基础约束，即 `object`。 |
| `TreeDataKey<T>` | 原始节点类型中的字符串 key。 |
| `KeysMatching<T, Value>` | 非空值可匹配 `Value` 的字符串 key。 |
| `TreeNodeKey<T>` | 值可作为 `TreeKey` 的原始数据 key。 |
| `TreeChildrenKey<T>` | 值可作为子节点数组的原始数据 key。 |
| `TreeBooleanKey<T>` | 值可作为 boolean 的原始数据 key。 |
| `TreePropertyGetter<T, Value>` | 接收原始数据与模型节点的 getter。 |
| `TreeProperty<T, Value>` | 匹配的字段名或属性 getter。 |
| `TreeOptionProps<T>` | 节点属性的字段名与 getter 映射。 |
| `LoadResolve<T>` | 接收已加载子节点数组的回调。 |
| `LoadFunction<T>` | 接收节点与 `LoadResolve<T>` 的懒加载函数。 |
| `FilterFunction<T, Value>` | 接收过滤值、原始数据和模型节点的过滤函数。 |
| `NodeOptions<T>` | 模型节点构造选项。 |
| `NodeChildOptions<T>` | 创建子模型节点时使用的选项。 |
| `NodeChildDefaults<T>` | 子节点初始复选、展开和可见状态。 |
| `Node<T>` | 公开模型节点接口。 |
| `TreeNode<T>` | `Node<T>` 的别名。 |
| `TreeStoreOptions<T>` | 模型 store 构造选项。 |
| `TreeNodeReference<T>` | key、原始数据对象或 `Node<T>`。 |
| `VueVirtualTreeProps<T>` | 组件公开 prop 契约。 |
| `VueVirtualTreeCheckState<T>` | `check` 事件传出的状态。 |
| `VueVirtualTreeSelectChange` | 签名为 `(checked: boolean) => void` 的 slot 回调。 |
| `VueVirtualTreeDefaultSlotProps<T>` | 默认 slot 参数契约。 |
| `VueVirtualTreeNodeInstance<T>` | 节点事件传出的组件实例包装。 |
| `VueVirtualTreeEventMap<T>` | 7 个事件名到参数元组的映射。 |
| `VueVirtualTreeInstance<T>` | 模板 ref 的公开方法契约。 |
| `TreeStore<T>` | 公开模型 store 接口。 |
| `NodeConstructor` | `Node` 运行时导出的泛型构造器契约。 |
| `TreeStoreConstructor` | `TreeStore` 运行时导出的泛型构造器契约。 |
| `VueVirtualTreeRegistrar` | `install()` 接受的最小应用或 Vue 构造器形状。 |
| `VueVirtualTreePlugin` | 默认导出使用的可安装组件类型。 |

运行时导出如下：

| 导出 | 含义 |
| --- | --- |
| `VueVirtualTree` | 具名组件与插件导出。 |
| `default` | 与 `VueVirtualTree` 相同的组件和插件。 |
| `Node` | 实现 `Node<T>` 的模型节点构造器。 |
| `TreeStore` | 实现 `TreeStore<T>` 的模型 store 构造器。 |

<!-- section:constraints -->
## 运行说明

- Vue 2 支持范围仅为 Vue 2.7.x，另一个构建支持 Vue 3 >= 3.2，二者共用同一份类型声明。
- 包格式仅为 ESM，目标环境需要支持 ESM 与 ES2020。项目没有单独的传统浏览器构建。
- 组件需要 `ResizeObserver`。
- 虚拟化依赖固定行高布局和 `itemSize > 0`。可变行高、内容换行或零高度容器会导致可见区间计算错误。
- 虚拟化减少的是挂载到 DOM 的行数，不是完整模型数据成本。过滤、批量选中和其他全树操作仍可能随逻辑节点数增长。
- 按 key 调用的方法和稳定状态需要唯一的 `nodeKey`。`setCheckedAll(checked?: boolean): void` 在没有 `nodeKey` 时不会处理节点，因为节点不会注册进 key 映射。
- 懒加载要求应用加载器调用 `resolve(T[])`。重试、取消和服务端错误处理由应用负责。
- 即使运行时仍保留兼容 prop，`renderContent` 也已经 deprecated 且 unsupported，请使用默认 slot。
