<template>
  <section v-if="isEmpty" class="virtual-tree__empty-block">
    <span class="virtual-tree__empty-text">{{ emptyText }}</span>
  </section>
  <virtualList
      v-else
      ref="virtualList"
      :height="height"
      :item-height="itemSize"
      :listData="dataList">
    <template v-slot="{ item,index }">
      <virtualTreeNode
          :node="item"
          :item-size="itemSize"
          :render-content="renderContent"
          :show-checkbox="showCheckbox"
          :select-children-only="selectChildrenOnly"
          @check-change="handleCheckChange"
          @node-expand="handleNodeExpand">
        <template v-slot:default="{node,item,selectChange}">
          <slot :node="node" :item="item" :selectChange="selectChange"></slot>
        </template>
      </virtualTreeNode>
    </template>
  </virtualList>
</template>

<script>
import {defineComponent} from "vue";
import {getNodeKey} from "./model/util";
import TreeStore from "./model/tree-store";
import virtualList from "./components/virtualList"
import virtualTreeNode from "./components/virtual-tree-node.vue";

export default defineComponent({
  name: "VueVirtualTree",

  components: {
    virtualList,
    virtualTreeNode,
  },

  props: {
    data: {
      type: Array,
    },
    emptyText: {
      type: String,
      default() {
        return "暂无数据";
      },
    },
    nodeKey: String,
    checkStrictly: Boolean,
    defaultExpandAll: Boolean,
    checkDescendants: {
      type: Boolean,
      default: false,
    },
    selectChildrenOnly: {
      type: Boolean,
      default: false,
    },
    itemSize: {
      type: Number,
      default: 26,
    },
    autoExpandParent: {
      type: Boolean,
      default: true,
    },
    defaultCheckedKeys: Array,
    defaultExpandedKeys: Array,
    currentNodeKey: [String, Number],
    renderContent: Function,
    showCheckbox: {
      type: Boolean,
      default: false,
    },
    props: {
      default() {
        return {
          children: "children",
          label: "label",
          disabled: "disabled",
        };
      },
    },
    lazy: {
      type: Boolean,
      default: false,
    },
    highlightCurrent: Boolean,
    load: Function,
    filterNodeMethod: Function,
    indent: {
      type: Number,
      default: 18,
    },
    iconClass: String,
    height: {
      type: [String, Number],
      default: '100%',
      required: true,
    }
  },

  data() {
    return {
      store: null,
      root: null,
      currentNode: null,
    };
  },

  computed: {
    children: {
      set(value) {
        this.data = value;
      },
      get() {
        return this.data;
      },
    },

    isEmpty() {
      const { childNodes } = this.root;
      return (
        !childNodes ||
        childNodes.length === 0 ||
        childNodes.every(({ visible }) => !visible)
      );
    },

    dataList() {
      return this.smoothTree(this.root.childNodes);
    },
  },

  watch: {
    defaultCheckedKeys(newVal) {
      this.store.setDefaultCheckedKey(newVal);
    },

    defaultExpandedKeys(newVal) {
      this.store.defaultExpandedKeys = newVal;
      this.store.setDefaultExpandedKeys(newVal);
    },

    data(newVal) {
      this.store.setData(newVal);
    },

    checkStrictly(newVal) {
      this.store.checkStrictly = newVal;
    },
  },
  methods: {
    smoothTree(treeData) {
      return treeData.reduce((smoothArr, data) => {
        if (data.visible) {
          // Mark different types to avoid being optimized out when assembled into the same dom
          data.type = this.showCheckbox
              ? `${data.level}-${data.checked}-${data.indeterminate}`
              : `${data.level}-${data.expanded}`;
          smoothArr.push(data);
        }
        if (data.expanded && data.childNodes.length) {
          smoothArr.push(...this.smoothTree(data.childNodes));
        }

        return smoothArr;
      }, [])
    },
    filter(value) {
      if (!this.filterNodeMethod) { throw new Error("[Tree] filterNodeMethod is required when filter"); }
      this.store.filter(value);
    },
    scrollToItem(key, levelStepPadding=18, animation=false) {
      if (this.height && !this.isEmpty) {
        let index=-1
        let level = 0;
        for (let i = 0; i < this.dataList.length; i++) {
          let item = this.dataList[i];
          if (item.data[this.nodeKey] === key) {
            level = item.level;
            index = i;
            break
          }
        }
        this.$nextTick(() => {
          if (index > -1&&this.$refs.virtualList) {
            this.$refs.virtualList.scrollToIndex(index, animation);
            // 等待渲染完成，再调整滚动位置
            const timer = setTimeout(() => {
              const el = this.$refs.virtualList.$el;
              if (!el || el.scrollWidth <= el.clientWidth) return;
              const maxSl = el.scrollWidth - el.clientWidth;
              const pad = this.getPaddingLeftPx(level-2, levelStepPadding);
              el.scrollLeft = Math.max(0, Math.min(pad, maxSl));
              clearTimeout(timer);
            }, 50)
          }
        });
      } else {
        throw new Error(
          "scrollToItem can only be used when using virtual scrolling"
        );
      }
    },

    getPaddingLeftPx(level, levelStepPadding=18) {
      const lv = Math.max(level, 1);
      return lv === 1 ? levelStepPadding : (lv - 1) * levelStepPadding;
    },

    getNodeKey(node) {
      return getNodeKey(this.nodeKey, node.data);
    },

    getNodePath(data) {
      if (!this.nodeKey) { throw new Error("[Tree] nodeKey is required in getNodePath"); }
      const node = this.store.getNode(data);
      if (!node) return [];
      const path = [node.data];
      let parent = node.parent;
      while (parent && parent !== this.root) {
        path.push(parent.data);
        parent = parent.parent;
      }
      return path.reverse();
    },

    getCheckedNodes(leafOnly, includeHalfChecked) {
      return this.store.getCheckedNodes(leafOnly, includeHalfChecked);
    },

    getCheckedKeys(leafOnly) {
      return this.store.getCheckedKeys(leafOnly);
    },

    getCurrentNode() {
      const currentNode = this.store.getCurrentNode();
      return currentNode ? currentNode.data : null;
    },

    getCurrentKey() {
      if (!this.nodeKey) { throw new Error("[Tree] nodeKey is required in getCurrentKey"); }
      const currentNode = this.getCurrentNode();
      return currentNode ? currentNode[this.nodeKey] : null;
    },

    setCheckedNodes(nodes, leafOnly) {
      if (!this.nodeKey) { throw new Error("[Tree] nodeKey is required in setCheckedNodes"); }
      this.store.setCheckedNodes(nodes, leafOnly);
    },

    setCheckedKeys(keys, leafOnly) {
      if (!this.nodeKey) { throw new Error("[Tree] nodeKey is required in setCheckedKeys"); }
      this.store.setCheckedKeys(keys, leafOnly);
    },

    setChecked(data, checked, deep) {
      this.store.setChecked(data, checked, deep);
    },

    setCheckedAll(checked = true) {
      this.store.setCheckedAll(checked);
    },

    getHalfCheckedNodes() {
      return this.store.getHalfCheckedNodes();
    },

    getHalfCheckedKeys() {
      return this.store.getHalfCheckedKeys();
    },

    getSelectedLeafNodes() {
      return this.store.getSelectedLeafNodes();
    },

    getSelectedLeafKeys() {
      return this.store.getSelectedLeafKeys();
    },

    setCurrentNode(node) {
      if (!this.nodeKey) { throw new Error("[Tree] nodeKey is required in setCurrentNode"); }
      this.store.setUserCurrentNode(node);
    },

    setCurrentKey(key) {
      if (!this.nodeKey) { throw new Error("[Tree] nodeKey is required in setCurrentKey"); }
      this.store.setCurrentNodeKey(key);
    },

    getNode(data) {
      return this.store.getNode(data);
    },

    remove(data) {
      this.store.remove(data);
    },

    append(data, parentNode) {
      this.store.append(data, parentNode);
    },

    insertBefore(data, refNode) {
      this.store.insertBefore(data, refNode);
    },

    insertAfter(data, refNode) {
      this.store.insertAfter(data, refNode);
    },

    handleNodeExpand(nodeData, node, instance) {
      this.$emit("node-expand", nodeData, node, instance);
    },

    updateKeyChildren(key, data) {
      if (!this.nodeKey) { throw new Error("[Tree] nodeKey is required in updateKeyChild"); }
      this.store.updateChildren(key, data);
    },
    ////内部方法///
    handleCheckChange(node, checkValue) {
      if (this.selectChildrenOnly) {
        // 直接使用原生JS操作DOM节点状态，确保立即生效

        if (node.isLeaf) {
          // 叶子节点处理逻辑
          node.checked = checkValue;
          node.indeterminate = false;

          // 手动更新父节点状态
          this.updateParentStatus(node);
        } else {
          // 父节点处理
          if (node.indeterminate && checkValue) {
            // 从半选变为全选
            node.checked = true;
            node.indeterminate = false;

            // 选中所有子节点
            const childNodes = node.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
              const child = childNodes[i];
              if (!child.disabled) {
                child.checked = true;
                child.indeterminate = false;

                // 递归处理子节点的子节点
                if (!child.isLeaf) {
                  this.selectAllChildren(child);
                }
              }
            }

            // 确保更新该节点的父节点状态
            this.updateParentStatus(node);
          } else if (node.checked && !checkValue) {
            // 从选中变为非选中，清除选择
            node.checked = false;
            node.indeterminate = false;

            // 取消所有子节点选择
            const childNodes = node.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
              const child = childNodes[i];
              if (!child.disabled) {
                child.checked = false;
                child.indeterminate = false;

                // 递归处理子节点的子节点
                if (!child.isLeaf) {
                  this.deselectAllChildren(child);
                }
              }
            }

            // 确保更新该节点的父节点状态
            this.updateParentStatus(node);
          } else if (!node.checked && checkValue) {
            // 从非选中变为选中
            node.checked = true;
            node.indeterminate = false;

            // 选中所有子节点
            const childNodes = node.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
              const child = childNodes[i];
              if (!child.disabled) {
                child.checked = true;
                child.indeterminate = false;

                // 递归处理子节点的子节点
                if (!child.isLeaf) {
                  this.selectAllChildren(child);
                }
              }
            }

            // 确保更新该节点的父节点状态
            this.updateParentStatus(node);
          }
        }
      } else {
        // 原有行为
        node.setChecked(checkValue, !this.checkStrictly);
      }

      this.$nextTick(() => {
        const store = this.store;
        const eventData = {
          checkedNodes: store.getCheckedNodes(),
          checkedKeys: store.getCheckedKeys(),
          halfCheckedNodes: store.getHalfCheckedNodes(),
          halfCheckedKeys: store.getHalfCheckedKeys(),
        };

        // Add selected leaf data for selectChildrenOnly mode
        if (this.selectChildrenOnly) {
          eventData.selectedLeafNodes = store.getSelectedLeafNodes();
          eventData.selectedLeafKeys = store.getSelectedLeafKeys();
        }

        this.$emit("check", node.data, eventData);
      });
    },
    // 提取公共方法：更新父节点状态
    updateParentStatus(node) {
      let parent = node.parent;
      while (parent && parent.level > 0) {
        // 获取所有子节点的状态
        let allChecked = true;
        let noneChecked = true;

        for (let i = 0; i < parent.childNodes.length; i++) {
          const child = parent.childNodes[i];
          if (child.checked) {
            noneChecked = false;
          } else {
            allChecked = false;
          }

          // 如果有任何子节点是半选状态，父节点也应该是半选
          if (child.indeterminate) {
            allChecked = false;
            noneChecked = false;
            break;
          }
        }

        // 设置父节点状态
        if (this.selectChildrenOnly) {
          // 在selectChildrenOnly模式下，如果是通过子节点更新的状态
          // 即使所有子节点都被选中，父节点也只显示为半选
          if (!noneChecked) {
            // 只要有子节点被选中，父节点就是半选状态
            parent.checked = false;
            parent.indeterminate = true;
          } else {
            // 没有子节点被选中
            parent.checked = false;
            parent.indeterminate = false;
          }
        } else {
          // 原有的逻辑
          if (allChecked) {
            parent.checked = true;
            parent.indeterminate = false;
          } else if (noneChecked) {
            parent.checked = false;
            parent.indeterminate = false;
          } else {
            // 关键！半选状态
            parent.checked = false;
            parent.indeterminate = true;
          }
        }

        parent = parent.parent;
      }
    },

    // 选中所有子节点的辅助方法
    selectAllChildren(node) {
      if (!node || node.disabled) return;

      const childNodes = node.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        if (!child.disabled) {
          child.checked = true;
          child.indeterminate = false;

          if (!child.isLeaf) {
            this.selectAllChildren(child);
          }
        }
      }
    },

    // 取消选中所有子节点的辅助方法
    deselectAllChildren(node) {
      if (!node || node.disabled) return;

      const childNodes = node.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        if (!child.disabled) {
          child.checked = false;
          child.indeterminate = false;

          if (!child.isLeaf) {
            this.deselectAllChildren(child);
          }
        }
      }
    }
  },
  beforeDestroy() {
    this.root.remove()
    this.store.destroy()
  },
  created() {
    this.isTree = true;

    this.store = new TreeStore({
      key: this.nodeKey,
      data: this.data,
      lazy: this.lazy,
      props: this.props,
      load: this.load,
      currentNodeKey: this.currentNodeKey,
      checkStrictly: this.checkStrictly,
      checkDescendants: this.checkDescendants,
      defaultCheckedKeys: this.defaultCheckedKeys,
      defaultExpandedKeys: this.defaultExpandedKeys,
      autoExpandParent: this.autoExpandParent,
      defaultExpandAll: this.defaultExpandAll,
      filterNodeMethod: this.filterNodeMethod,
      selectChildrenOnly: this.selectChildrenOnly,
    });
    this.root = this.store.root;
  },
});
</script>
