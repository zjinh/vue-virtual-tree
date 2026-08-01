import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import * as vue2Compiler from 'vue2/compiler-sfc'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const sourceEntryText = await readFile(new URL('src/index.ts', root), 'utf8')
const sourceComponentText = await readFile(new URL('src/index.vue', root), 'utf8')
const sourceEntry = ts.createSourceFile(
  'src/index.ts',
  sourceEntryText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)
const parsedSourceComponent = vue2Compiler.parse({
  filename: 'src/index.vue',
  source: sourceComponentText,
})
assert.deepEqual(parsedSourceComponent.errors, [], 'src/index.vue must parse')
assert.ok(parsedSourceComponent.script, 'src/index.vue must contain a script block')
const sourceComponentScript = ts.createSourceFile(
  'src/index.vue.ts',
  parsedSourceComponent.script.content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)

async function readOptional(relativePath) {
  try {
    return await readFile(new URL(relativePath, root), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

const files = Object.fromEntries(await Promise.all([
  'README.md',
  'README.zh-CN.md',
  'docs/guide.md',
  'docs/guide.zh-CN.md',
  'docs/api.md',
  'docs/api.zh-CN.md',
].map(async (name) => [name, await readOptional(name)])))

const readmes = [
  ['README.md', files['README.md']],
  ['README.zh-CN.md', files['README.zh-CN.md']],
]
const guides = [
  ['docs/guide.md', files['docs/guide.md']],
  ['docs/guide.zh-CN.md', files['docs/guide.zh-CN.md']],
]
const apis = [
  ['docs/api.md', files['docs/api.md']],
  ['docs/api.zh-CN.md', files['docs/api.zh-CN.md']],
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

const exportedTypes = [
  'TreeKey',
  'TreeNodeData',
  'TreeDataKey<T>',
  'KeysMatching<T, Value>',
  'TreeNodeKey<T>',
  'TreeChildrenKey<T>',
  'TreeBooleanKey<T>',
  'TreePropertyGetter<T, Value>',
  'TreeProperty<T, Value>',
  'TreeOptionProps<T>',
  'LoadResolve<T>',
  'LoadFunction<T>',
  'FilterFunction<T, Value>',
  'NodeOptions<T>',
  'NodeChildOptions<T>',
  'NodeChildDefaults<T>',
  'Node<T>',
  'TreeNode<T>',
  'TreeStoreOptions<T>',
  'TreeNodeReference<T>',
  'VueVirtualTreeProps<T>',
  'VueVirtualTreeCheckState<T>',
  'VueVirtualTreeSelectChange',
  'VueVirtualTreeDefaultSlotProps<T>',
  'VueVirtualTreeNodeInstance<T>',
  'VueVirtualTreeEventMap<T>',
  'VueVirtualTreeInstance<T>',
  'TreeStore<T>',
  'NodeConstructor',
  'TreeStoreConstructor',
  'VueVirtualTreeRegistrar',
  'VueVirtualTreePlugin',
]

function sectionIds(document) {
  return [...document.matchAll(/<!-- section:([a-z0-9-]+) -->/g)]
    .map((match) => match[1])
}

function betweenSections(document, startId, endId) {
  const start = document.indexOf(`<!-- section:${startId} -->`)
  const end = document.indexOf(`<!-- section:${endId} -->`)
  assert.ok(start >= 0 && end > start, `missing ${startId}..${endId} section range`)
  return document.slice(start, end)
}

function oneSection(document, id) {
  const start = document.indexOf(`<!-- section:${id} -->`)
  assert.ok(start >= 0, `missing ${id} section`)
  const next = document.indexOf('<!-- section:', start + 1)
  return document.slice(start, next < 0 ? document.length : next)
}

function tableRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => /^\| `/.test(line))
    .map((line) => line
      .slice(1, -1)
      .split(/(?<!\\)\|/)
      .map((cell) => {
        const trimmed = cell.trim()
        return trimmed.startsWith('`') && trimmed.endsWith('`')
          ? trimmed.slice(1, -1)
          : trimmed
      }))
}

function numberedSignatures(markdown) {
  return [...markdown.matchAll(/^\d+\. `([^`]+)`/gm)]
    .map((match) => match[1])
}

function normalizedDefault(value) {
  return value === '未设置' ? 'not set' : value
}

function structuredApi(document) {
  const propRows = tableRows(oneSection(document, 'props'))
  const methodRows = numberedSignatures(oneSection(document, 'methods'))
  const eventRows = tableRows(oneSection(document, 'events'))
  const slotRows = tableRows(oneSection(document, 'slot'))
  const typesSection = oneSection(document, 'types')
  const runtimeHeading = /Runtime exports are:|运行时导出如下：/.exec(typesSection)
  assert.ok(runtimeHeading, 'missing runtime exports heading')
  const typeRows = tableRows(typesSection.slice(0, runtimeHeading.index))
  const runtimeRows = tableRows(typesSection.slice(runtimeHeading.index))
  return { eventRows, methodRows, propRows, runtimeRows, slotRows, typeRows }
}

function interfaceDeclaration(name) {
  const declaration = sourceEntry.statements.find((statement) =>
    ts.isInterfaceDeclaration(statement) && statement.name.text === name,
  )
  assert.ok(declaration, `src/index.ts must export ${name}`)
  return declaration
}

function memberName(member) {
  assert.ok(member.name, 'public interface member must be named')
  assert.ok(
    ts.isIdentifier(member.name) || ts.isStringLiteral(member.name),
    'public interface member must use an identifier or string literal name',
  )
  return member.name.text
}

function hasExportModifier(declaration) {
  return declaration.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  ) ?? false
}

function normalizeTypeContract(value) {
  return value
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .replace(/\[\s+/g, '[')
    .replace(/,\s*]/g, ']')
    .trim()
}

function memberType(member) {
  assert.ok(member.type, `${memberName(member)} must declare a type`)
  return normalizeTypeContract(member.type.getText(sourceEntry))
}

function propertyContracts(interfaceName) {
  return interfaceDeclaration(interfaceName).members
    .filter(ts.isPropertySignature)
    .map((member) => [memberName(member), memberType(member)])
}

function tupleLabels(member) {
  assert.ok(member.type && ts.isTupleTypeNode(member.type), `${memberName(member)} must be a tuple`)
  return member.type.elements.map((element) => {
    assert.ok(ts.isNamedTupleMember(element), `${memberName(member)} tuple entries must be named`)
    return element.name.text
  }).join(', ')
}

function runtimeExportNames() {
  const names = []
  for (const statement of sourceEntry.statements) {
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        assert.ok(ts.isIdentifier(declaration.name), 'runtime exports must use identifier names')
        names.push(declaration.name.text)
      }
    } else if (
      ts.isExportDeclaration(statement)
      && statement.exportClause
      && ts.isNamedExports(statement.exportClause)
    ) {
      names.push(...statement.exportClause.elements.map((element) => element.name.text))
    } else if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      names.push('default')
    }
  }
  return names
}

function propertyNameText(name) {
  assert.ok(
    ts.isIdentifier(name) || ts.isStringLiteral(name),
    'runtime prop names must be identifiers or string literals',
  )
  return name.text
}

function unwrapExpression(expression) {
  let current = expression
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
  ) {
    current = current.expression
  }
  return current
}

function findProperty(object, name) {
  return object.properties.find((property) =>
    ts.isPropertyAssignment(property) && propertyNameText(property.name) === name,
  )
}

function findDefineComponentOptions() {
  let options = null
  function visit(node) {
    if (
      !options
      && ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'defineComponent'
    ) {
      const [firstArgument] = node.arguments
      if (firstArgument && ts.isObjectLiteralExpression(firstArgument)) {
        options = firstArgument
        return
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceComponentScript)
  assert.ok(options, 'src/index.vue must call defineComponent with an object')
  return options
}

function containsIdentifier(expression, name) {
  const unwrapped = unwrapExpression(expression)
  if (ts.isIdentifier(unwrapped)) return unwrapped.text === name
  if (ts.isArrayLiteralExpression(unwrapped)) {
    return unwrapped.elements.some((element) => containsIdentifier(element, name))
  }
  return false
}

function canonicalDefaultExpression(expression) {
  const unwrapped = unwrapExpression(expression)
  if (ts.isStringLiteral(unwrapped) || ts.isNoSubstitutionTemplateLiteral(unwrapped)) {
    return unwrapped.text
  }
  if (ts.isNumericLiteral(unwrapped)) return unwrapped.text
  if (unwrapped.kind === ts.SyntaxKind.TrueKeyword) return 'true'
  if (unwrapped.kind === ts.SyntaxKind.FalseKeyword) return 'false'
  if (ts.isArrowFunction(unwrapped)) {
    assert.ok(!ts.isBlock(unwrapped.body), 'runtime prop default factory must return an expression')
    return canonicalDefaultExpression(unwrapped.body)
  }
  if (ts.isObjectLiteralExpression(unwrapped)) {
    return unwrapped.properties.map((property) => {
      assert.ok(ts.isPropertyAssignment(property), 'runtime prop default object must be literal')
      const name = propertyNameText(property.name)
      assert.equal(canonicalDefaultExpression(property.initializer), name)
      return name
    }).join(' / ')
  }
  assert.fail('unsupported runtime prop default expression: ' + unwrapped.getText(sourceComponentScript))
}

function runtimePropDefault(property) {
  assert.ok(ts.isPropertyAssignment(property), 'runtime props must use property assignments')
  const initializer = unwrapExpression(property.initializer)
  if (!ts.isObjectLiteralExpression(initializer)) {
    return containsIdentifier(initializer, 'Boolean') ? 'false' : 'not set'
  }

  const defaultProperty = findProperty(initializer, 'default')
  if (defaultProperty) return canonicalDefaultExpression(defaultProperty.initializer)
  const typeProperty = findProperty(initializer, 'type')
  return typeProperty && containsIdentifier(typeProperty.initializer, 'Boolean')
    ? 'false'
    : 'not set'
}

function runtimePropDefaults() {
  const options = findDefineComponentOptions()
  const propsProperty = findProperty(options, 'props')
  assert.ok(propsProperty, 'defineComponent options must declare props')
  const propsObject = unwrapExpression(propsProperty.initializer)
  assert.ok(ts.isObjectLiteralExpression(propsObject), 'defineComponent props must be an object')
  return new Map(propsObject.properties.map((property) => [
    propertyNameText(property.name),
    runtimePropDefault(property),
  ]))
}

const eventMembers = interfaceDeclaration('VueVirtualTreeEventMap').members
  .filter(ts.isPropertySignature)

const sourceApi = {
  props: propertyContracts('VueVirtualTreeProps'),
  methods: interfaceDeclaration('VueVirtualTreeInstance').members
    .filter(ts.isMethodSignature)
    .map((member) => normalizeTypeContract(member.getText(sourceEntry))),
  events: eventMembers.map((member) => [
    memberName(member),
    tupleLabels(member),
    memberType(member),
  ]),
  slots: propertyContracts('VueVirtualTreeDefaultSlotProps'),
  types: sourceEntry.statements
    .filter((statement) =>
      (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement))
      && hasExportModifier(statement),
    )
    .map((statement) => statement.name.text),
  runtime: runtimeExportNames(),
}
const sourceRuntimePropDefaults = runtimePropDefaults()
const requiredPropNotes = {
  'docs/api.md': {
    data: 'Tree data. When omitted, the component uses an empty array internally.',
    defaultCheckedKeys: 'Initial checked keys; omitted values are treated as an empty array internally and require `nodeKey`. Replacing this prop after mount checks keys in the new array but does not uncheck removed keys. Use `setCheckedKeys()` to replace the checked set.',
    defaultExpandedKeys: 'Initial expanded keys; omitted values are treated as an empty array internally and require `nodeKey`. Replacing this prop after mount expands keys in the new array, and their ancestors when `autoExpandParent` is enabled, but does not collapse removed keys. Call `getNode(key)?.collapse()` to close nodes that must no longer be expanded.',
    props: 'Initialization mapping for `children`, `label`, `disabled`, and `isLeaf`; each mapping may be a field name or getter.',
  },
  'docs/api.zh-CN.md': {
    data: '树数据。省略时，组件内部按空数组处理。',
    defaultCheckedKeys: '初始选中的 key；省略时内部按空数组处理，并依赖 `nodeKey`。挂载后替换该 prop 只会选中新数组中的 key，不会取消已移除 key 的选中状态；如需替换完整选中集合，请调用 `setCheckedKeys()`。',
    defaultExpandedKeys: '初始展开的 key；省略时内部按空数组处理，并依赖 `nodeKey`。挂载后替换该 prop 会展开新数组中的 key；启用 `autoExpandParent` 时也会展开祖先，但不会收起已移除的 key；如需收起，请调用 `getNode(key)?.collapse()`。',
    props: '初始化时映射 `children`、`label`、`disabled` 和 `isLeaf`；每项可使用字段名或 getter。',
  },
}

test('ships a mirrored six-document public documentation set', () => {
  for (const [name, document] of [...readmes, ...guides, ...apis]) {
    assert.ok(document, `${name} must exist`)
  }

  assert.deepEqual(packageJson.files, ['dist', 'README.md', 'README.zh-CN.md', 'LICENSE'])
  assert.match(packageJson.scripts['test:package'], /readme-contract\.test\.mjs/)
  assert.match(packageJson.scripts['test:package'], /readme-examples\.test\.mjs/)

  const readmeNavigation = '[English](./README.md) | [简体中文](./README.zh-CN.md)'
  assert.equal(files['README.md']?.split('\n')[0], readmeNavigation)
  assert.equal(files['README.zh-CN.md']?.split('\n')[0], readmeNavigation)
  assert.equal(
    files['docs/guide.md']?.split('\n')[0],
    '[English](./guide.md) | [简体中文](./guide.zh-CN.md) | [README](../README.md)',
  )
  assert.equal(
    files['docs/guide.zh-CN.md']?.split('\n')[0],
    '[English](./guide.md) | [简体中文](./guide.zh-CN.md) | [README](../README.zh-CN.md)',
  )
  assert.equal(
    files['docs/api.md']?.split('\n')[0],
    '[English](./api.md) | [简体中文](./api.zh-CN.md) | [README](../README.md)',
  )
  assert.equal(
    files['docs/api.zh-CN.md']?.split('\n')[0],
    '[English](./api.md) | [简体中文](./api.zh-CN.md) | [README](../README.zh-CN.md)',
  )

  const expectedReadmeSections = [
    'about',
    'compatibility',
    'demos',
    'installation',
    'vue3',
    'vue2',
    'documentation',
    'development',
    'license',
  ]
  assert.deepEqual(sectionIds(files['README.md']), expectedReadmeSections)
  assert.deepEqual(sectionIds(files['README.zh-CN.md']), expectedReadmeSections)
  assert.deepEqual(sectionIds(files['docs/guide.md']), [
    'layout',
    'large-data',
    'checkbox-current',
    'filter',
    'lazy',
    'slot',
    'ref-methods',
    'vue2',
  ])
  assert.deepEqual(
    sectionIds(files['docs/guide.zh-CN.md']),
    sectionIds(files['docs/guide.md']),
  )
  assert.deepEqual(sectionIds(files['docs/api.md']), [
    'props',
    'methods',
    'events',
    'slot',
    'types',
    'constraints',
  ])
  assert.deepEqual(sectionIds(files['docs/api.zh-CN.md']), sectionIds(files['docs/api.md']))
})

test('keeps each README as a compact package entry page', () => {
  for (const [name, document] of readmes) {
    assert.ok(document, `${name} must exist`)
    const lineCount = document.trimEnd().split('\n').length
    assert.ok(lineCount <= 220, `${name} has ${lineCount} lines`)

    for (const fact of [
      'Vue 2.7.x',
      'Vue 3 >= 3.2',
      'https://zjinh.github.io/vue-virtual-tree/',
      'https://zjinh.github.io/vue-virtual-tree/vue2/',
      'https://zjinh.github.io/vue-virtual-tree/vue3/',
      'pnpm add @zjinh/vue-virtual-tree',
      'npm install @zjinh/vue-virtual-tree',
      'yarn add @zjinh/vue-virtual-tree',
      '@zjinh/vue-virtual-tree/style.css',
      '@zjinh/vue-virtual-tree/vue2',
      '@zjinh/vue-virtual-tree/vue3',
      'createApp(App).use(VueVirtualTree)',
      'Vue.use(VueVirtualTree)',
      '<VueVirtualTree',
      '</VueVirtualTree>',
    ]) {
      assert.ok(document.includes(fact), `${name} must document ${fact}`)
    }

    assert.doesNotMatch(document, /<!-- (?:readme|guide)-example:/)
    assert.doesNotMatch(document, /^## (?:Public API|公开 API|API)$/m)
    assert.doesNotMatch(document, /^\| `(?:data|filter<Value|node-click)` \|/m)
  }

  assert.match(files['README.md'], /mounting only the rows inside the viewport/)
  assert.match(files['README.zh-CN.md'], /只挂载视口内的行/)

  for (const url of [
    'https://github.com/zjinh/vue-virtual-tree/blob/main/docs/guide.md',
    'https://github.com/zjinh/vue-virtual-tree/blob/main/docs/api.md',
  ]) {
    assert.ok(files['README.md'].includes(url), `README.md must link ${url}`)
  }
  for (const url of [
    'https://github.com/zjinh/vue-virtual-tree/blob/main/docs/guide.zh-CN.md',
    'https://github.com/zjinh/vue-virtual-tree/blob/main/docs/api.zh-CN.md',
  ]) {
    assert.ok(files['README.zh-CN.md'].includes(url), `README.zh-CN.md must link ${url}`)
  }
})

test('removes release operations and delivery-report language from the README pages', () => {
  const forbiddenPatterns = [
    /first npm publication/i,
    /(?:npm.{0,12}首次发布|首次.{0,12}npm.{0,12}发布)/,
    /tarball/i,
    /\.release\/package\.tgz/,
    /npm publish/i,
    /publish:check/i,
    /release:check|ci:check|test:pages/i,
    /Trusted Publisher/i,
    /可信发布者/,
    /\bOIDC\b/,
    /\bNPM_TOKEN\b|(?:npm|publish|registry|发布).{0,24}(?:token|令牌|凭据)|(?:token|令牌|凭据).{0,24}(?:npm|publish|registry|发布)/i,
    /provenance/i,
    /\b2FA\b/,
    /GitHub Actions/i,
    /Pages.{0,24}(?:workflow|setting|source|deployment|maintenance|branch|设置|部署|运维|分支)/i,
    /Positioning and compatibility/i,
    /Practical usage/i,
    /Development and quality gates/i,
    /Limits and compatibility boundaries/i,
    /evidence boundaries/i,
    /What it proves/i,
    /configured target/i,
    /does not claim/i,
    /\bquality gates?\b|\bacceptance\b|\bgreen (?:local )?command\b/i,
    /\bproof\b|\bproves?\b/i,
    /证据边界|配置目标|不能证明|质量门禁|验收(?:口径|报告|结果)|交付报告|绿色命令/,
  ]

  for (const example of [
    'Use an access token for npm publication.',
    'Use a registry token.',
    'Maintain the Pages branch.',
    'Pages 运维说明',
    '交付报告：全部通过。',
    '验收结果：通过。',
  ]) {
    assert.ok(
      forbiddenPatterns.some((pattern) => pattern.test(example)),
      `forbidden README matcher must reject: ${example}`,
    )
  }

  for (const [name, document] of readmes) {
    assert.ok(document, `${name} must exist`)
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(document, pattern, `${name} must not contain ${pattern}`)
    }

    const development = betweenSections(document, 'development', 'license')
    const commands = development.match(/^pnpm (?:install|run).+$|^pnpm test$/gm) ?? []
    assert.deepEqual(commands, [
      'pnpm install --frozen-lockfile',
      'pnpm run dev:vue2',
      'pnpm run dev:vue3',
      'pnpm test',
      'pnpm run build',
    ])
  }
})

test('moves complete usage guidance into both Guide documents', () => {
  for (const [name, document] of guides) {
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
      'ResizeObserver',
      '@zjinh/vue-virtual-tree/vue2',
      'Options API',
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

test('lists the complete supported prop contract in both API documents', () => {
  for (const [name, document] of apis) {
    assert.ok(document, `${name} must exist`)
    const { propRows } = structuredApi(document)
    assert.deepEqual(
      propRows.map((row) => row[0]),
      [...supportedProps, 'renderContent'],
      `${name} must contain exactly 21 supported props and renderContent`,
    )
    const sourcePropContracts = new Map(sourceApi.props)
    assert.equal(sourcePropContracts.size, propRows.length)
    assert.deepEqual(
      propRows.map((row) => [row[0], normalizeTypeContract(row[1])]),
      propRows.map((row) => [row[0], sourcePropContracts.get(row[0])]),
      `${name} must list every prop type from VueVirtualTreeProps<T>`,
    )
    const documentedDefaultRows = propRows.slice(0, supportedProps.length)
    assert.deepEqual(
      documentedDefaultRows.map((row) => [row[0], normalizedDefault(row[2])]),
      documentedDefaultRows.map((row) => [row[0], sourceRuntimePropDefaults.get(row[0])]),
      `${name} must list Vue prop defaults derived from src/index.vue`,
    )
    assert.equal(sourceRuntimePropDefaults.size, propRows.length)
    assert.equal(sourceRuntimePropDefaults.get('renderContent'), 'not set')

    const propRowsByName = new Map(propRows.map((row) => [row[0], row]))
    for (const [prop, expectedNote] of Object.entries(requiredPropNotes[name])) {
      assert.equal(propRowsByName.get(prop)?.[3], expectedNote, `${name} must describe ${prop}`)
    }
    assert.doesNotMatch(propRowsByName.get('props')?.[3] ?? '', /custom propert|自定义属性/i)

    assert.deepEqual(propRows.at(-1)?.slice(0, 2), ['renderContent', 'never'])
    assert.match(document, /\| `renderContent` \| `never` \|[\s\S]*deprecated[\s\S]*unsupported/i)
    assert.match(document, /highlightCurrent[\s\S]*current[\s\S]*(?:style|样式)/i)
  }
})

test('lists all methods, events, slot values, and exported types in both API documents', () => {
  for (const [name, document] of apis) {
    assert.ok(document, `${name} must exist`)
    const { eventRows, methodRows, runtimeRows, slotRows, typeRows } = structuredApi(document)
    assert.deepEqual(
      methodRows.map(normalizeTypeContract),
      sourceApi.methods,
      `${name} must contain exactly the VueVirtualTreeInstance<T> methods`,
    )
    assert.deepEqual(
      eventRows.map((row) => [row[0], row[1], normalizeTypeContract(row[2])]),
      sourceApi.events,
      `${name} must contain exactly the VueVirtualTreeEventMap<T> events and tuples`,
    )
    assert.deepEqual(
      slotRows.map((row) => [row[0], normalizeTypeContract(row[1])]),
      sourceApi.slots,
      `${name} must contain exactly the VueVirtualTreeDefaultSlotProps<T> values`,
    )
    assert.match(document, /\{ node, item, selectChange \}/)
    assert.deepEqual(
      typeRows.map((row) => row[0]),
      exportedTypes,
      `${name} must contain exactly 32 exported types`,
    )
    const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right))
    assert.deepEqual(sorted(runtimeRows.map((row) => row[0])), sorted(sourceApi.runtime))
  }
})

test('keeps structured API facts mirrored across languages', () => {
  const englishApi = structuredApi(files['docs/api.md'])
  const chineseApi = structuredApi(files['docs/api.zh-CN.md'])

  assert.deepEqual(
    englishApi.propRows
      .slice(0, supportedProps.length)
      .map((row) => [row[0], row[1], normalizedDefault(row[2])]),
    chineseApi.propRows
      .slice(0, supportedProps.length)
      .map((row) => [row[0], row[1], normalizedDefault(row[2])]),
  )
  assert.deepEqual(englishApi.methodRows, chineseApi.methodRows)
  assert.deepEqual(
    englishApi.eventRows.map((row) => row.slice(0, 3)),
    chineseApi.eventRows.map((row) => row.slice(0, 3)),
  )
  assert.deepEqual(englishApi.slotRows.map((row) => row.slice(0, 2)), chineseApi.slotRows.map((row) => row.slice(0, 2)))
  assert.deepEqual(
    englishApi.typeRows.map((row) => row[0]),
    chineseApi.typeRows.map((row) => row[0]),
  )
  assert.deepEqual(
    englishApi.runtimeRows.map((row) => row[0]),
    chineseApi.runtimeRows.map((row) => row[0]),
  )
})

test('derives every documented public API name from the TypeScript source AST', () => {
  const englishApi = structuredApi(files['docs/api.md'])
  const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right))
  const documentedMethodNames = englishApi.methodRows.map((signature) => {
    const separator = signature.search(/[<(]/)
    return separator < 0 ? signature : signature.slice(0, separator)
  })
  const documentedTypeNames = englishApi.typeRows.map((row) => row[0].split('<', 1)[0])

  assert.deepEqual(sorted(englishApi.propRows.map((row) => row[0])), sorted(sourceApi.props.map(([name]) => name)))
  assert.deepEqual(sorted(documentedMethodNames), sorted(sourceApi.methods.map((signature) => signature.slice(0, signature.search(/[<(]/)))))
  assert.deepEqual(sorted(englishApi.eventRows.map((row) => row[0])), sorted(sourceApi.events.map(([name]) => name)))
  assert.deepEqual(sorted(documentedTypeNames), sorted(sourceApi.types))
})

test('keeps real runtime constraints next to the API contract', () => {
  for (const [name, document] of apis) {
    assert.ok(document, `${name} must exist`)
    for (const fact of [
      'Vue 2.7.x',
      'Vue 3 >= 3.2',
      'ESM',
      'itemSize > 0',
      'ResizeObserver',
      'resolve(T[])',
      'renderContent',
      'nodeKey',
    ]) {
      assert.ok(document.includes(fact), `${name} must document ${fact}`)
    }
    assert.match(document, /setCheckedAll\(checked\?: boolean\): void[\s\S]{0,180}nodeKey/)
    assert.match(document, /fixed[\s-]row|固定行高/i)
    assert.match(document, /variable[\s-]height|可变行高/i)
  }
})

test('keeps the English pages English and the Chinese pages Chinese', () => {
  for (const name of ['README.md', 'docs/guide.md', 'docs/api.md']) {
    const document = files[name]
    assert.ok(document, `${name} must exist`)
    const count = document.match(/[\u3400-\u9fff]/g)?.length ?? 0
    assert.ok(count < 30, `${name} must be primarily English`)
  }
  for (const name of ['README.zh-CN.md', 'docs/guide.zh-CN.md', 'docs/api.zh-CN.md']) {
    const document = files[name]
    assert.ok(document, `${name} must exist`)
    const count = document.match(/[\u3400-\u9fff]/g)?.length ?? 0
    assert.ok(count > 150, `${name} must be primarily Chinese`)
  }
})
