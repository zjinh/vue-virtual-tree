# API 行为测试覆盖

组件测试通过 `@zjinh/vue-virtual-tree` 根入口加载实际构建产物，同一组用例分别运行于 Vue 2.7 和 Vue 3。测试不替换树组件或模型；检查返回数据、Node 身份、节点映射、事件参数、真实 DOM 顺序、复选框状态及滚动位置。JSDOM 仅补齐尺寸、ResizeObserver 和 scrollTo 等浏览器环境能力。

运行：`pnpm run test:components`；模型测试：`pnpm run test:model`。

## 组件实例全部 23 个方法

主要用例文件：`tests/component/api.test.ts`。

| 方法 | 正常行为与边界 |
| --- | --- |
| `filter` | 匹配叶子时保留并展开祖先；无匹配显示空态；空过滤恢复；缺少 predicate 报错 |
| `scrollToItem` | 远端 key 改变真实 scrollTop 与虚拟列表内容；不存在的 key 不滚动；零 key 返回顶部；空树或无 height 报错 |
| `getNodePath` | key、data、Node 三种引用；完整祖先顺序；根路径；缺失 key 返回空数组；缺少 nodeKey 报错 |
| `getCheckedNodes` | 完选、半选、leafOnly、includeHalfChecked；空树与清空选择 |
| `getCheckedKeys` | 完选与 leafOnly；缺失 key 不进入结果；空选择 |
| `getCurrentNode` | 初始空值、程序设置、DOM 点击、清空、删除节点/祖先、替换数据 |
| `getCurrentKey` | 当前 key、零 key、清空、缺少 nodeKey 报错 |
| `setCheckedNodes` | 替换已有选择；选中父节点时 leafOnly；空数组；缺少 nodeKey 报错 |
| `setCheckedKeys` | 父子级联、leafOnly、忽略缺失 key、空数组清空、缺少 nodeKey 报错 |
| `setChecked` | key、data、Node 引用；单节点、深层级联、disabled、half state、缺失 key、lazy/checkDescendants |
| `setCheckedAll` | 默认全选包含 disabled；清除半选状态；false 全清；空树 |
| `getHalfCheckedNodes` | 部分子节点选中时返回父数据；清空后为空 |
| `getHalfCheckedKeys` | 部分子节点选中时返回父 key；清空后为空 |
| `getSelectedLeafNodes` | 普通和 selectChildrenOnly 模式；父节点排除；disabled 与清空 |
| `getSelectedLeafKeys` | 普通和 selectChildrenOnly 模式；父节点排除；disabled 与清空 |
| `setCurrentNode` | data 设置并更新 DOM 高亮；零 key；缺少 nodeKey 报错 |
| `setCurrentKey` | key 切换高亮；未知 key 保持当前值；null 清空；零 key；缺少 nodeKey 报错 |
| `getNode` | key、data、Node 引用保持身份；未知或已删除节点返回 null |
| `remove` | data、Node、key 引用；更新 DOM/数据/映射；删除当前节点或其祖先；未知 key |
| `append` | 根、null 父、Node 父、零 key 父；空树首次插入；未知父节点不插入 |
| `insertBefore` | data 引用定位；子节点数据顺序与 DOM 同步 |
| `insertAfter` | key 引用定位；子节点数据顺序与 DOM 同步 |
| `updateKeyChildren` | 替换完整子树、直接传入原 children 数组、注销后代、清空旧 current、空数组恢复叶子态及 DOM、未知 key、缺少 nodeKey 报错 |

## 公开 Node / TreeStore 方法

模型测试文件：`tests/model/tree-model.test.ts`。组件测试同时覆盖对应实例转发产生的界面结果。

| 类 | 方法 | 主要断言 |
| --- | --- | --- |
| Node | `setData` | 替换 descendants 后旧 map 注销；同步父数据与新 key；随后 reconcile 保留替换结果；新子节点父关系；清空后叶子态 |
| Node | `contains` | 直接/深层后代、self、无关节点 |
| Node | `insertChild`, `insertBefore`, `insertAfter` | options 或现有 Node、显式/省略位置、负索引、data 与 Node 顺序；脱离节点/子树重新接入、同父/跨父/跨 store 移动、注册/层级/叶子态同步、保留同树 current、拒绝环 |
| Node | `remove`, `removeChild`, `removeChildByData` | identity 匹配、子树注销、parent 解除、源数据与叶子态、不存在对象、root remove |
| Node | `expand`, `collapse` | callback 时的状态、祖先展开、单节点折叠、懒加载结果 |
| Node | `doCreateChildren` | 默认 checked/expanded/visible、注册与父关系、batch 不改源数组 |
| Node | `shouldLoadData`, `updateLeafState` | 非 lazy、待加载、加载完成、用户 isLeaf 提示、空加载结果 |
| Node | `setChecked` | strict 与 cascade、disabled、half 值、父半选传播 |
| Node | `getChildren` | 缺失/null、forceInit、数组身份、root data |
| Node | `updateChildren` | 保留 Node 身份、删除/插入、外部重排；懒加载后 append/insertBefore/insertAfter 经 watcher 和显式同步仍保留顺序 |
| Node | `loadData` | pending/loaded/loading、callback 时注册已完成、默认 child props、已加载后不重建；删除/替换/批量更新/销毁后旧回调失效 |
| TreeStore | `filter` | 隐藏未匹配节点、祖先可见、匹配路径展开、空结果 |
| TreeStore | `setData` | 新数组替换、旧 keys/current 注销、data 更新、同数组 reconcile 保留身份 |
| TreeStore | `getNode` | key/data/Node、未知节点 |
| TreeStore | `append`, `insertBefore`, `insertAfter`, `remove`, `updateChildren` | 排序与源数据、子树 map、零 key、当前节点/祖先删除、同数组替换、旧引用不误删新节点、未加载 lazy 节点的 raw children 替换 |
| TreeStore | `getCheckedNodes`, `getCheckedKeys`, `getHalfCheckedNodes`, `getHalfCheckedKeys` | 完选/半选/leafOnly/includeHalfChecked、空结果 |
| TreeStore | `setCheckedNodes`, `setCheckedKeys`, `setChecked`, `setCheckedAll` | 替换选择、空数组、未知 key、strict、disabled、leafOnly、全部清除 |
| TreeStore | `setDefaultExpandedKeys` | 祖先展开、truthy 配置、null、未知 key |
| TreeStore | `getCurrentNode`, `setCurrentNode`, `setUserCurrentNode`, `setCurrentNodeKey` | Node/data/key 设置、旧 isCurrent 清除、null/undefined 清空、未知 key |
| TreeStore | `getSelectedLeafNodes`, `getSelectedLeafKeys` | 普通/selectChildrenOnly 模式的叶子结果 |
| TreeStore | `destroy` | 清除 current/root/map/data、旧 current 标志、重复调用安全 |

## 组件兼容面

- `api.test.ts`：七类公开事件的参数、checkbox 与 expand 点击传播、默认 scoped slot 参数及 selectChange、props 默认值和 watcher、functional label、indent/icon/showCheckbox、autoExpandParent、selectChildrenOnly、lazy、checkDescendants。
- `runtime.test.ts`：真实 demo、虚拟列表、滚动实例隔离、resize、卸载与异步清理。
- `render-compat.test.ts`：作用域样式、空数组/单 comment/多 comment 的框架原生回退语义、异步插槽、结构化 label 插值和右键事件，由同一构建产物在两个运行时执行。
