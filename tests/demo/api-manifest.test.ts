import { describe, expect, it } from 'vitest'

import {
  TREE_EVENTS,
  TREE_METHODS,
  TREE_PROPS,
} from '../../examples/shared/api-manifest'
import { METHOD_ACTIONS } from '../../examples/shared/method-actions'

const EXPECTED_SUPPORTED_PROPS = [
  'data',
  'emptyText',
  'nodeKey',
  'checkStrictly',
  'defaultExpandAll',
  'checkDescendants',
  'selectChildrenOnly',
  'itemSize',
  'autoExpandParent',
  'defaultCheckedKeys',
  'defaultExpandedKeys',
  'currentNodeKey',
  'showCheckbox',
  'props',
  'lazy',
  'highlightCurrent',
  'load',
  'filterNodeMethod',
  'indent',
  'iconClass',
  'height',
]

const EXPECTED_METHODS = [
  'filter',
  'scrollToItem',
  'getNodePath',
  'getCheckedNodes',
  'getCheckedKeys',
  'getCurrentNode',
  'getCurrentKey',
  'setCheckedNodes',
  'setCheckedKeys',
  'setChecked',
  'setCheckedAll',
  'getHalfCheckedNodes',
  'getHalfCheckedKeys',
  'getSelectedLeafNodes',
  'getSelectedLeafKeys',
  'setCurrentNode',
  'setCurrentKey',
  'getNode',
  'remove',
  'append',
  'insertBefore',
  'insertAfter',
  'updateKeyChildren',
]

const EXPECTED_EVENTS = [
  'node-click',
  'node-contextmenu',
  'current-change',
  'node-expand',
  'node-collapse',
  'check-change',
  'check',
]

describe('demo API manifest', () => {
  it('lists exactly 21 supported props and the unsupported renderContent placeholder', () => {
    expect(TREE_PROPS.filter(({ support }) => support === 'supported').map(({ name }) => name))
      .toEqual(EXPECTED_SUPPORTED_PROPS)
    expect(TREE_PROPS.filter(({ support }) => support === 'unsupported')).toEqual([
      expect.objectContaining({
        name: 'renderContent',
        note: expect.stringMatching(/default scoped slot/i),
      }),
    ])
  })

  it('lists exactly the 23 public instance methods', () => {
    expect(TREE_METHODS.map(({ name }) => name)).toEqual(EXPECTED_METHODS)
  })

  it('lists exactly the seven documented events', () => {
    expect(TREE_EVENTS.map(({ name }) => name)).toEqual(EXPECTED_EVENTS)
  })

  it('keeps the executable method registry in one-to-one sync with the manifest', () => {
    expect(Object.keys(METHOD_ACTIONS)).toEqual(EXPECTED_METHODS)
  })
})
