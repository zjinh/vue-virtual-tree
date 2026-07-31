import Node from "./node";
import { getNodeKey } from "./util";

export default class TreeStore {
  constructor(options) {
    this.currentNode = null;
    this.currentNodeKey = null;

    for (let option in options) {
      // eslint-disable-next-line no-prototype-builtins
      if (options.hasOwnProperty(option)) {
        this[option] = options[option];
      }
    }

    this.nodesMap = {};

    this.root = new Node({
      data: this.data,
      store: this,
    });

    if (this.lazy && this.load) {
      const loadFn = this.load;
      loadFn(this.root, (data) => {
        this.root.doCreateChildren(data);
        this._initDefaultCheckedNodes();
      });
    } else {
      this._initDefaultCheckedNodes();
    }
  }

  filter(value) {
    const filterNodeMethod = this.filterNodeMethod;
    const lazy = this.lazy;
    const traverse = function(node) {
      const childNodes = node.root ?
        node.root.childNodes :
        node.childNodes;

      childNodes.forEach((child) => {
        child.visible = filterNodeMethod.call(
          child,
          value,
          child.data,
          child,
        );

        traverse(child);
      });

      if (!node.visible && childNodes.length) {
        let allHidden = true;
        allHidden = !childNodes.some((child) => child.visible);

        if (node.root) {
          node.root.visible = allHidden === false;
        } else {
          node.visible = allHidden === false;
        }
      }
      if (!value) return;

      if (node.visible && !node.isLeaf && !lazy) node.expand();
    };

    traverse(this);
  }

  setData(newVal) {
    const instanceChanged = newVal !== this.root.data;
    if (instanceChanged) {
      this.root.setData(newVal);
      this._initDefaultCheckedNodes();
    } else {
      this.root.updateChildren();
    }
  }

  getNode(data) {
    if (data instanceof Node) return data;
    const key =
      typeof data !== "object" ? data : getNodeKey(this.key, data);
    return this.nodesMap[key] || null;
  }

  insertBefore(data, refData) {
    const refNode = this.getNode(refData);
    refNode.parent.insertBefore({ data }, refNode);
  }

  insertAfter(data, refData) {
    const refNode = this.getNode(refData);
    refNode.parent.insertAfter({ data }, refNode);
  }

  remove(data) {
    const node = this.getNode(data);

    if (node && node.parent) {
      if (node === this.currentNode) {
        this.currentNode = null;
      }
      node.parent.removeChild(node);
    }
  }

  append(data, parentData) {
    const parentNode = parentData ? this.getNode(parentData) : this.root;

    if (parentNode) {
      parentNode.insertChild({ data });
    }
  }

  _initDefaultCheckedNodes() {
    const defaultCheckedKeys = this.defaultCheckedKeys || [];
    const nodesMap = this.nodesMap;

    defaultCheckedKeys.forEach((checkedKey) => {
      const node = nodesMap[checkedKey];

      if (node) {
        node.setChecked(true, !this.checkStrictly);
      }
    });
  }

  _initDefaultCheckedNode(node) {
    const defaultCheckedKeys = this.defaultCheckedKeys || [];

    if (defaultCheckedKeys.indexOf(node.key) !== -1) {
      node.setChecked(true, !this.checkStrictly);
    }
  }

  setDefaultCheckedKey(newVal) {
    if (newVal !== this.defaultCheckedKeys) {
      this.defaultCheckedKeys = newVal;
      this._initDefaultCheckedNodes();
    }
  }

  registerNode(node) {
    const key = this.key;
    if (!key || !node || !node.data) return;

    const nodeKey = node.key;
    if (nodeKey !== undefined) this.nodesMap[node.key] = node;
  }

  deregisterNode(node) {
    const key = this.key;
    if (!key || !node || !node.data) return;

    // 性能优化：使用迭代而不是递归，避免调用栈过深
    const nodesToRemove = [node];

    while (nodesToRemove.length > 0) {
      const currentNode = nodesToRemove.pop();

      // 添加子节点到待处理队列
      if (currentNode.childNodes && currentNode.childNodes.length > 0) {
        nodesToRemove.push(...currentNode.childNodes);
      }

      // 删除节点映射
      if (currentNode.key !== undefined) {
        delete this.nodesMap[currentNode.key];
      }
    }
  }

  getCheckedNodes(leafOnly = false, includeHalfChecked = false) {
    const checkedNodes = [];
    const traverse = function(node) {
      const childNodes = node.root ?
        node.root.childNodes :
        node.childNodes;

      childNodes.forEach((child) => {
        // In selectChildrenOnly mode, only consider leaf nodes or indeterminate parent nodes
        const store = node.root ? node.root.store : (node.store || node);
        if (
          (child.checked ||
            (includeHalfChecked && child.indeterminate)) &&
          (!leafOnly || (leafOnly && child.isLeaf)) &&
          // In selectChildrenOnly mode, only return leaf nodes unless parent is fully checked
          (!store.selectChildrenOnly || child.isLeaf || (child.checked && !child.indeterminate))
        ) {
          checkedNodes.push(child.data);
        }

        traverse(child);
      });
    };

    traverse(this);

    return checkedNodes;
  }

  getCheckedKeys(leafOnly = false) {
    return this.getCheckedNodes(leafOnly).map(
      (data) => (data || {})[this.key],
    );
  }

  getHalfCheckedNodes() {
    const nodes = [];
    const traverse = function(node) {
      const childNodes = node.root ?
        node.root.childNodes :
        node.childNodes;

      childNodes.forEach((child) => {
        if (child.indeterminate) {
          nodes.push(child.data);
        }

        traverse(child);
      });
    };

    traverse(this);

    return nodes;
  }

  getHalfCheckedKeys() {
    return this.getHalfCheckedNodes().map((data) => (data || {})[this.key]);
  }

  _getAllNodes() {
    const allNodes = [];
    const nodesMap = this.nodesMap;
    for (let nodeKey in nodesMap) {
      // eslint-disable-next-line no-prototype-builtins
      if (nodesMap.hasOwnProperty(nodeKey)) {
        allNodes.push(nodesMap[nodeKey]);
      }
    }

    return allNodes;
  }

  updateChildren(key, data) {
    const node = this.nodesMap[key];
    if (!node) return;

    // 性能优化：批量清理子节点，避免逐个调用remove
    this._batchRemoveChildren(node);

    // 批量添加新的子节点
    for (let i = 0, j = data.length; i < j; i++) {
      const child = data[i];
      this.append(child, node.data);
    }
  }

  // 新增：批量清理子节点的优化方法
  _batchRemoveChildren(parentNode) {
    const childNodes = parentNode.childNodes;
    if (!childNodes || childNodes.length === 0) return;

    // 批量注销所有子孙节点，避免递归调用
    const nodesToDeregister = [];
    const collectNodes = (node) => {
      nodesToDeregister.push(node);
      if (node.childNodes) {
        node.childNodes.forEach(collectNodes);
      }
    };

    // 收集所有需要注销的节点
    childNodes.forEach(collectNodes);

    // 批量注销节点
    nodesToDeregister.forEach(node => {
      if (node.key !== undefined) {
        delete this.nodesMap[node.key];
      }
      // 清理当前节点引用
      if (node === this.currentNode) {
        this.currentNode = null;
      }
    });

    // 清理父节点的children数据
    const children = parentNode.getChildren();
    if (children) {
      children.length = 0; // 清空数组
    }

    // 清空childNodes数组
    parentNode.childNodes.length = 0;

    // 更新父节点的叶子状态
    parentNode.updateLeafState();
  }

  _setCheckedKeys(key, leafOnly = false, checkedKeys) {
    const allNodes = this._getAllNodes().sort((a, b) => b.level - a.level);
    const cache = Object.create(null);
    const keys = Object.keys(checkedKeys);
    allNodes.forEach((node) => node.setChecked(false, false));
    for (let i = 0, j = allNodes.length; i < j; i++) {
      const node = allNodes[i];
      const nodeKey = node.data[key].toString();
      let checked = keys.indexOf(nodeKey) > -1;
      if (!checked) {
        if (node.checked && !cache[nodeKey]) {
          node.setChecked(false, false);
        }
        continue;
      }

      let parent = node.parent;
      while (parent && parent.level > 0) {
        cache[parent.data[key]] = true;
        parent = parent.parent;
      }

      if (node.isLeaf || this.checkStrictly) {
        node.setChecked(true, false);
        continue;
      }
      node.setChecked(true, true);

      if (leafOnly) {
        node.setChecked(false, false);
        const traverse = function(node) {
          const childNodes = node.childNodes;
          childNodes.forEach((child) => {
            if (!child.isLeaf) {
              child.setChecked(false, false);
            }
            traverse(child);
          });
        };
        traverse(node);
      }
    }
  }

  setCheckedNodes(array, leafOnly = false) {
    const key = this.key;
    const checkedKeys = {};
    array.forEach((item) => {
      checkedKeys[(item || {})[key]] = true;
    });

    this._setCheckedKeys(key, leafOnly, checkedKeys);
  }

  setCheckedKeys(keys, leafOnly = false) {
    this.defaultCheckedKeys = keys;
    const key = this.key;
    const checkedKeys = {};
    keys.forEach((key) => {
      checkedKeys[key] = true;
    });

    this._setCheckedKeys(key, leafOnly, checkedKeys);
  }

  setDefaultExpandedKeys(keys) {
    keys = keys || [];
    this.defaultExpandedKeys = keys;

    keys.forEach((key) => {
      const node = this.getNode(key);
      if (node) node.expand(null, this.autoExpandParent);
    });
  }

  setChecked(data, checked, deep) {
    const node = this.getNode(data);

    if (node) {
      node.setChecked(!!checked, deep);
    }
  }

  setCheckedAll(checked = true) {
    const allNodes = this._getAllNodes();

    for (const node of allNodes) {
      node.indeterminate = false;
      node.checked = checked;
    }
  }

  getCurrentNode() {
    return this.currentNode;
  }

  setCurrentNode(currentNode) {
    const prevCurrentNode = this.currentNode;
    if (prevCurrentNode) {
      prevCurrentNode.isCurrent = false;
    }
    this.currentNode = currentNode;
    this.currentNode.isCurrent = true;
  }

  setUserCurrentNode(node) {
    const key = node[this.key];
    const currNode = this.nodesMap[key];
    this.setCurrentNode(currNode);
  }

  setCurrentNodeKey(key) {
    if (key === null || key === undefined) {
      this.currentNode && (this.currentNode.isCurrent = false);
      this.currentNode = null;
      return;
    }
    const node = this.getNode(key);
    if (node) {
      this.setCurrentNode(node);
    }
  }

  // Helper method for selectChildrenOnly mode to get only leaf nodes
  getSelectedLeafNodes() {
    if (!this.selectChildrenOnly) {
      return this.getCheckedNodes(true);
    }

    const leafNodes = [];
    const traverse = function(node) {
      const childNodes = node.root ?
        node.root.childNodes :
        node.childNodes;

      childNodes.forEach((child) => {
        if (child.checked && child.isLeaf) {
          leafNodes.push(child.data);
        }
        traverse(child);
      });
    };

    traverse(this);
    return leafNodes;
  }

  // Helper method for selectChildrenOnly mode to get only leaf keys
  getSelectedLeafKeys() {
    return this.getSelectedLeafNodes().map(
      (data) => (data || {})[this.key],
    );
  }

  //销毁树存储，清除所有数据和状态
  destroy() {
    // 清除当前节点引用
    if (this.currentNode) {
      this.currentNode.isCurrent = false;
      this.currentNode = null;
    }
    this.currentNodeKey = null;

    // 利用现有的deregisterNode方法清理所有节点
    if (this.root) {
      this.deregisterNode(this.root);
      this.root = null;
    }

    // 清空节点映射表
    this.nodesMap = {};
    // 清除所有配置选项和状态
    this.data = null;
    this.lazy = null;
    this.load = null;
    this.filterNodeMethod = null;
    this.key = null;
    this.defaultCheckedKeys = null;
    this.defaultExpandedKeys = null;
    this.checkStrictly = null;
    this.selectChildrenOnly = null;
    this.autoExpandParent = null;

    // 清除其他可能的属性
    const propertiesToClear = [
      'props', 'renderAfterExpand', 'checkDescendants', 'defaultExpandAll',
      'expandOnClickNode', 'checkOnClickNode', 'accordion', 'indent'
    ];
    
    propertiesToClear.forEach(prop => {
      if (this.hasOwnProperty(prop)) {
        this[prop] = null;
      }
    });
  }
}
