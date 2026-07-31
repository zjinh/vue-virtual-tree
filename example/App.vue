<template>
  <div class="container">
    <div class="ve-tree">
      <VueVirtualTree
        ref="treeRef"
        node-key="id"
        show-checkbox
        select-children-only
        :data="treeData"
        :props="props"
        :item-size="22"
        height="100%"
        @check="handleCheck"
      />
    </div>
    <div class="result-panel">
      <h3>选中的节点：</h3>
      <div class="selected-nodes">
        <div v-for="node in selectedNodes" :key="node.id" class="node-item">
          {{ node.name }}
        </div>
        <div v-if="selectedNodes.length === 0" class="empty-tip">
          暂无选中节点
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {defineComponent} from "vue";

export default defineComponent({
  data() {
    return {
      props: {
        label: "name",
        children: "children",
      },
      treeData: [],
      selectedNodes: [],
    };
  },
  created() {
    const data = [],
      root = 8,
      children = 3,
      base = 10;
    for (let i = 0; i < root; i++) {
      data.push({
        id: `${i}`,
        name: `test-${i}`,
        children: [],
      });
      for (let j = 0; j < children; j++) {
        data[i].children.push({
          id: `${i}-${j}`,
          name: `test-${i}-${j}`,
          children: [],
        });
        for (let k = 0; k < base; k++) {
          data[i].children[j].children.push({
            id: `${i}-${j}-${k}`,
            name: `test-${i}-${j}-${k}`,
          });
        }
      }
    }
    this.treeData = data;
  },
  methods: {
    handleCheck() {
      this.selectedNodes = this.$refs.treeRef.getCheckedNodes();
    }
  }
});
</script>
<style>
.container {
  display: flex;
  width: 100%;
  height: 500px;
  background: #eee;
}

.ve-tree {
  flex: 1;
  height: 100%;
  background: #fff;
  border-right: 1px solid #ddd;
}

.result-panel {
  width: 300px;
  padding: 16px;
  background: #fff;
  overflow-y: auto;
}

.result-panel h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.selected-nodes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-item {
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
}

.empty-tip {
  color: #999;
  text-align: center;
  padding: 16px;
}
</style>
