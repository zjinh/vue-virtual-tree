import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))

async function readOptional(relativePath) {
  try {
    return await readFile(new URL(relativePath, root), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

const english = await readOptional('README.md')
const chinese = await readOptional('README.zh-CN.md')
const documents = [
  ['README.md', english],
  ['README.zh-CN.md', chinese],
]

const supportedProps = [
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

const methodSignatures = [
  'filter<Value = unknown>(value: Value): void',
  'scrollToItem(key: TreeKey, levelStepPadding?: number, animation?: boolean): void',
  'getNodePath(data: TreeNodeReference<T>): T[]',
  'getCheckedNodes(leafOnly?: boolean, includeHalfChecked?: boolean): T[]',
  'getCheckedKeys(leafOnly?: boolean): Array<TreeKey | undefined>',
  'getCurrentNode(): T | null',
  'getCurrentKey(): TreeKey | null',
  'setCheckedNodes(nodes: T[], leafOnly?: boolean): void',
  'setCheckedKeys(keys: TreeKey[], leafOnly?: boolean): void',
  'setChecked(data: TreeNodeReference<T>, checked: boolean, deep?: boolean): void',
  'setCheckedAll(checked?: boolean): void',
  'getHalfCheckedNodes(): T[]',
  'getHalfCheckedKeys(): Array<TreeKey | undefined>',
  'getSelectedLeafNodes(): T[]',
  'getSelectedLeafKeys(): Array<TreeKey | undefined>',
  'setCurrentNode(node: T): void',
  'setCurrentKey(key: TreeKey | null): void',
  'getNode(data: TreeNodeReference<T>): Node<T> | null',
  'remove(data: TreeNodeReference<T>): void',
  'append(data: T, parentNode?: TreeNodeReference<T> | null): void',
  'insertBefore(data: T, refNode: TreeNodeReference<T>): void',
  'insertAfter(data: T, refNode: TreeNodeReference<T>): void',
  'updateKeyChildren(key: TreeKey, data: T[]): void',
]

const events = new Map([
  ['node-click', 'data, node, instance'],
  ['node-expand', 'data, node, instance'],
  ['node-collapse', 'data, node, instance'],
  ['node-contextmenu', 'event, data, node, instance'],
  ['current-change', 'data, node'],
  ['check-change', 'data, checked, indeterminate'],
  ['check', 'data, state'],
])

function sectionIds(document) {
  return [...document.matchAll(/<!-- section:([a-z-]+) -->/g)]
    .map((match) => match[1])
}

test('ships mirrored English and Simplified Chinese README documents', () => {
  assert.ok(english, 'README.md must exist')
  assert.ok(chinese, 'README.zh-CN.md must exist')
  assert.deepEqual(packageJson.files, ['dist', 'README.md', 'README.zh-CN.md', 'LICENSE'])
  assert.match(packageJson.scripts['test:package'], /readme-contract\.test\.mjs/)

  const languageLinks = '[English](./README.md) | [简体中文](./README.zh-CN.md)'
  assert.equal(english.split('\n')[0], languageLinks)
  assert.equal(chinese.split('\n')[0], languageLinks)

  const expectedSections = [
    'positioning',
    'demos',
    'installation',
    'quick-start',
    'practical-usage',
    'api',
    'limitations',
    'development',
    'release',
    'license',
  ]
  assert.deepEqual(sectionIds(english), expectedSections)
  assert.deepEqual(sectionIds(chinese), expectedSections)

  const englishCjkCharacters = english.match(/[\u3400-\u9fff]/g)?.length ?? 0
  const chineseCjkCharacters = chinese.match(/[\u3400-\u9fff]/g)?.length ?? 0
  assert.ok(englishCjkCharacters < 30, 'README.md must be primarily English')
  assert.ok(chineseCjkCharacters > 300, 'README.zh-CN.md must be primarily Chinese')
})

test('documents compatibility, entrypoints, demos, installation, and runnable starts', () => {
  for (const [name, document] of documents) {
    assert.ok(document, `${name} must exist`)
    for (const fact of [
      'Vue 2.7.x',
      'Vue 3 >= 3.2',
      'Node.js 22.22.3',
      'pnpm 10.33.4',
      'https://zjinh.github.io/vue-virtual-tree/',
      'https://zjinh.github.io/vue-virtual-tree/vue2/',
      'https://zjinh.github.io/vue-virtual-tree/vue3/',
      "pnpm add @zjinh/vue-virtual-tree",
      "npm install @zjinh/vue-virtual-tree",
      "yarn add @zjinh/vue-virtual-tree",
      "@zjinh/vue-virtual-tree/style.css",
      "@zjinh/vue-virtual-tree/vue2",
      "@zjinh/vue-virtual-tree/vue3",
      'createApp(App).use(VueVirtualTree)',
      'Vue.use(VueVirtualTree)',
      'components: { VueVirtualTree }',
      '<VueVirtualTree',
      '</VueVirtualTree>',
      'TreeNodeData',
      'VueVirtualTreeProps',
      'VueVirtualTreeInstance',
    ]) {
      assert.ok(document.includes(fact), `${name} must document ${fact}`)
    }
    assert.match(document, /GitHub Pages[\s\S]*GitHub Actions/)
    assert.match(document, /ESM/)
  }
})

test('documents practical virtual-tree usage without legacy dependency examples', () => {
  for (const [name, document] of documents) {
    assert.ok(document, `${name} must exist`)
    for (const fact of [
      'itemSize > 0',
      'nodeKey',
      'show-checkbox',
      'highlight-current',
      'filter-node-method',
      'selectChange',
      'item: data',
      'default-expanded-keys',
      'lazy',
      'ref="tree"',
      'getCheckedKeys()',
    ]) {
      assert.ok(document.includes(fact), `${name} must document ${fact}`)
    }

    assert.doesNotMatch(document, /<@zjinh\/vue-virtual-tree/)
    assert.doesNotMatch(document, /<el-(?:button|input)/)
    assert.doesNotMatch(document, /:render-content\s*=/)
    assert.doesNotMatch(document, /\b(?:draggable|accordion|allow-drag|allow-drop)\b/)
    assert.doesNotMatch(document, /(?:expand-on-click-node|check-on-click-node)/)
    assert.doesNotMatch(document, /[\u2013\u2014]/)
  }
})

test('lists the complete supported props and isolates renderContent as unsupported', () => {
  for (const [name, document] of documents) {
    assert.ok(document, `${name} must exist`)
    for (const prop of supportedProps) {
      assert.ok(document.includes(`| \`${prop}\` |`), `${name} must list ${prop}`)
    }
    assert.equal(
      supportedProps.filter((prop) => document.includes(`| \`${prop}\` |`)).length,
      21,
    )
    assert.match(document, /\| `renderContent` \| `never` \|[\s\S]*deprecated[\s\S]*unsupported/i)
    assert.match(document, /\| `itemSize` \| `number` \| `26` \|/)
    assert.match(document, /\| `indent` \| `number` \| `18` \|/)
    assert.ok(document.includes('| `height` | `string \\| number` | `100%` |'))
    assert.match(document, /highlightCurrent[\s\S]*current[\s\S]*(?:style|样式)/i)
  }
})

test('lists all public methods, event payloads, slot values, and key types', () => {
  for (const [name, document] of documents) {
    assert.ok(document, `${name} must exist`)
    for (const signature of methodSignatures) {
      assert.ok(document.includes(`\`${signature}\``), `${name} must list ${signature}`)
    }
    for (const [event, payload] of events) {
      assert.ok(
        document.includes(`| \`${event}\` | \`${payload}\` |`),
        `${name} must list ${event}`,
      )
    }
    for (const typeName of [
      'TreeKey',
      'TreeNodeReference<T>',
      'TreeOptionProps<T>',
      'LoadFunction<T>',
      'FilterFunction<T, Value>',
      'Node<T>',
      'VueVirtualTreeCheckState<T>',
      'VueVirtualTreeDefaultSlotProps<T>',
      'VueVirtualTreeEventMap<T>',
    ]) {
      assert.ok(document.includes(`\`${typeName}\``), `${name} must document ${typeName}`)
    }
    assert.match(document, /\{ node, item, selectChange \}/)
  }
})

test('documents the nodeKey requirement for setCheckedAll in both languages', () => {
  assert.ok(english?.includes(
    '`setCheckedAll(checked?: boolean): void` requires `nodeKey`; without it the method is a no-op.',
  ))
  assert.ok(chinese?.includes(
    '`setCheckedAll(checked?: boolean): void` 需要 `nodeKey`，否则不执行任何节点。',
  ))
})

test('explains the scope of development, artifact, package, and Pages gates', () => {
  const commands = [
    'pnpm install --frozen-lockfile',
    'pnpm run build',
    'pnpm test',
    'pnpm run publish:check',
    'pnpm run ci:check',
    'pnpm run test:pages',
    'pnpm run dev:vue2',
    'pnpm run dev:vue3',
  ]

  for (const [name, document] of documents) {
    assert.ok(document, `${name} must exist`)
    for (const command of commands) {
      assert.ok(document.includes(command), `${name} must document ${command}`)
    }
    for (const gate of [
      'source tests',
      'built artifacts',
      'tarball',
      'Vue 2.7 consumer',
      'Vue 3 consumer',
      'Are the Types Wrong',
      'publint',
      'Pages',
    ]) {
      assert.match(document, new RegExp(gate, 'i'), `${name} must explain ${gate}`)
    }
    assert.match(document, /real[- ]time|实时/i)
    assert.match(document, /Chromium/i)
    assert.match(document, /optional|可选/i)
  }
})

test('documents the bootstrap and Trusted Publisher release procedures', () => {
  for (const [name, document] of documents) {
    assert.ok(document, `${name} must exist`)
    for (const fact of [
      'pnpm run publish:check',
      '.release/package.tgz',
      'npm publish .release/package.tgz --access public',
      'https://docs.npmjs.com/trusted-publishers/',
      'zjinh',
      'vue-virtual-tree',
      'publish.yml',
      'v<package.version>',
      'OIDC',
      'NPM_TOKEN',
      'provenance',
      '2FA',
      'Settings',
      'GitHub Actions',
    ]) {
      assert.ok(document.includes(fact), `${name} must document ${fact}`)
    }
    assert.match(document, /prerelease[\s\S]*(?:does not|not publish|不发布)/i)
    assert.match(document, /(?:if[\s\S]*not yet exist on npm|如果[\s\S]*npm[\s\S]*尚未)/i)
    assert.doesNotMatch(document, /E404/)
  }
})
