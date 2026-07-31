<template>
  <div
    v-show="node.visible"
    ref="node"
    class="virtual-tree-node"
    :class="{
      'is-expanded': expanded,
      'is-current': node.isCurrent,
      'is-hidden': !node.visible,
    }"
    tabindex="-1"
    :draggable="tree.draggable"
    @click.stop="handleClick"
    @contextmenu="handleContextMenu($event)"
    @dragstart.stop="handleDragStart"
    @dragover.stop="handleDragOver"
    @dragend.stop="handleDragEnd"
    @drop.stop="handleDrop"
  >
    <slot :node="node" :item="node.data" :selectChange="handleCheckChange">
      <span aria-hidden="true" :style="{'min-width': (node.level - 1) * tree.indent + 'px',}"></span>
      <span
          class="expand-icon"
          :class="[
          {
            'is-leaf': node.isLeaf,
            expanded: !node.isLeaf && expanded,
          },
          tree.iconClass ? tree.iconClass : 'caret-right',
        ]"
          @click.stop="handleExpandIconClick"
      ></span>
      <Checkbox
          v-if="showCheckbox"
          :modelValue="node.checked"
          :indeterminate="node.indeterminate"
          :disabled="!!node.disabled"
          @change="handleCheckChange"
          @click.native.stop
      />
      <span v-if="node.loading" class="loading-icon"></span>
      <span class="name">{{node.label}}</span>
    </slot>
  </div>
</template>

<script type="text/jsx">
import {defineComponent} from "vue"
import Checkbox from "./checkbox.vue";
import {getNodeKey} from "../model/util";
export default defineComponent({
  name: "virtualTreeNode",
  componentName: "virtualTreeNode",
  components: {
    Checkbox,
  },
  props: {
    itemSize: {
      type: Number,
      default: 26,
    },
    node: {
      default() {
        return {};
      },
    },
    renderContent: Function,
    showCheckbox: {
      type: Boolean,
      default: false,
    },
    selectChildrenOnly: {
      type: Boolean,
      default: false,
    },
    haveSlot:{
      type: Boolean,
    }
  },
  data() {
    return {
      tree: null,
      expanded: false,
      childNodeRendered: false,
      oldChecked: null,
      oldIndeterminate: null,
    };
  },
  watch: {
    "node.indeterminate"(val) {
      this.handleSelectChange(this.node.checked, val);
    },

    "node.checked"(val) {
      this.handleSelectChange(val, this.node.indeterminate);
    },

    "node.expanded"(val) {
      this.$nextTick(() => (this.expanded = val));
      if (val) {
        this.childNodeRendered = true;
      }
    },
  },
  created() {
    this.init(this.$parent.$parent);
  },
  methods: {
    init(parent) {
      if (parent.isTree) {
        this.tree = parent;
      } else {
        this.tree = parent.tree;
      }

      const tree = this.tree;
      if (!tree) {
        console.warn("Can not find node's tree.");
      }

      const props = tree.props || {};
      const childrenKey = props["children"] || "children";

      this.$watch(`node.data.${childrenKey}`, () => {
        this.node.updateChildren();
      });

      if (this.node.expanded) {
        this.expanded = true;
        this.childNodeRendered = true;
      }
    },

    getNodeKey(node) {
      return getNodeKey(this.tree.nodeKey, node.data);
    },

    handleDragStart(event) {
      if (!this.tree.draggable) return;
      this.tree.$emit("tree-node-drag-start", event, this);
    },

    handleDragOver(event) {
      if (!this.tree.draggable) return;
      this.tree.$emit("tree-node-drag-over", event, this);
      event.preventDefault();
    },

    handleDragEnd(event) {
      if (!this.tree.draggable) return;
      this.tree.$emit("tree-node-drag-end", event, this);
    },

    handleDrop(event) {
      event.preventDefault();
    },

    handleSelectChange(checked, indeterminate) {
      const node = this.node;
      if (
          this.oldChecked !== checked ||
          this.oldIndeterminate !== indeterminate
      ) {
        this.tree.$emit(
            "check-change",
            node.data,
            checked,
            indeterminate,
        );
      }
      this.oldChecked = checked;
      this.oldIndeterminate = indeterminate;
    },

    handleClick() {
      const node = this.node;
      const store = this.tree.store;

      store.setCurrentNode(node);
      this.tree.$emit(
          "current-change",
          store.currentNode ? store.currentNode.data : null,
          store.currentNode,
      );
      this.tree.currentNode = this;
      if (this.tree.expandOnClickNode) {
        this.handleExpandIconClick();
      }
      if (this.tree.checkOnClickNode && !node.disabled) {
        this.handleCheckChange(null, {
          target: { checked: !node.checked },
        });
      }

      this.tree.$emit("node-click", node.data, node, this);
    },

    handleContextMenu(event) {
      const node = this.node;

      if (
          this.tree._events &&
          this.tree._events["node-contextmenu"] &&
          this.tree._events["node-contextmenu"].length > 0
      ) {
        event.stopPropagation();
        event.preventDefault();
      }
      this.tree.$emit("node-contextmenu", event, node.data, node, this);
    },

    handleExpandIconClick() {
      const node = this.node;

      if (node.isLeaf) return;
      if (this.expanded) {
        this.tree.$emit("node-collapse", node.data, node, this);
        node.collapse();
      } else {
        node.expand();
        this.$emit("node-expand", node.data, node, this);
      }
    },

    handleCheckChange(_, ev) {
      if(typeof ev==='object'&&ev){
        this.$emit("check-change", this.node,ev.target.checked);
      }else{
        this.$emit("check-change", this.node,ev);
      }
    }
  }
});
</script>

<style lang="less" scoped>
.virtual-tree-node{
  width: 100%;
  position: relative;
  cursor: default;
  white-space: nowrap;
  outline: none;
  display: flex;
  align-items: center;
  .expand-icon{
    cursor: pointer;
    color: #C0C4CC;
    font-size: 12px;
    transform: rotate(0deg);
    transition: transform 0.3s ease-in-out;
    &.no-transition{
      transition:none;
    }
    &.expanded {
      transform: rotate(90deg);
    }
  }
  .caret-right:before {
    content: ">";
  }
  .loading-icon {
    margin-right: 8px;
    font-size: 14px;
    color: #C0C4CC;
  }
}
</style>
