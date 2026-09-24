import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import {
  createIsolatedNpmEnvironment,
  createIsolatedPnpmConfigArgs,
} from '../scripts/isolated-npm-environment.mjs'
import {
  projectRoot,
  releaseTarballPath,
} from '../scripts/release-tarball.mjs'

const run = promisify(execFile)

function packageJson(version, checkTypes) {
  return JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      '@zjinh/vue-virtual-tree': `file:${releaseTarballPath}`,
      vue: version,
    },
    devDependencies: {
      jsdom: '30.0.1',
      ...(checkTypes ? { typescript: '6.0.3' } : {}),
    },
  }, null, 2)
}

function runtimeFixture(runtime, version) {
  return String.raw`
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

// Vue must first see the browser globals when its runtime module is evaluated.
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
})
for (const name of [
  'window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement',
  'SVGElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'MutationObserver',
]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] })
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
for (const property of ['clientHeight', 'offsetHeight', 'clientWidth', 'offsetWidth', 'scrollWidth']) {
  Object.defineProperty(HTMLElement.prototype, property, {
    configurable: true,
    get() {
      const dimension = property.endsWith('Height') ? 'height' : 'width'
      return Number.parseFloat(this.style[dimension]) || (dimension === 'height' ? 260 : 640)
    },
  })
}

const Vue = await import('vue')
const entry = await import('@zjinh/vue-virtual-tree')
const errors = []
const mounted = []

assert.equal(Vue.version, '${version}')

assert.match(import.meta.resolve('@zjinh/vue-virtual-tree'), /node_modules/)
for (const suffix of ['vue2', 'vue3']) {
  await assert.rejects(import('@zjinh/vue-virtual-tree/' + suffix), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  })
}

const cssUrl = import.meta.resolve('@zjinh/vue-virtual-tree/style.css')
const stylesheet = document.createElement('style')
stylesheet.textContent = await readFile(fileURLToPath(cssUrl), 'utf8')
document.head.appendChild(stylesheet)
assert.equal(entry.default, entry.VueVirtualTree)
assert.equal(typeof entry.Node, 'function')
assert.equal(typeof entry.TreeStore, 'function')
assert.equal(typeof entry.VueVirtualTree.install, 'function')

const settle = async () => {
  for (let tick = 0; tick < 5; tick += 1) await Vue.nextTick()
}
const data = () => [
  { id: 1, label: 'Root', children: [{ id: 2, label: 'Child' }, { id: 3, label: 'Sibling' }] },
  { id: 4, label: 'Disabled', disabled: true },
]

async function mountTree(useSlot = false) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const events = { check: [], nodeClick: [], currentChange: [], nodeCollapse: [], nodeExpand: [] }
  const props = {
    data: data(),
    defaultExpandAll: true,
    filterNodeMethod: (value, item) => item.label.includes(value),
    height: 260,
    highlightCurrent: true,
    itemSize: 26,
    nodeKey: 'id',
    props: { children: 'children', label: 'label', disabled: 'disabled' },
    showCheckbox: true,
  }
  const slots = []
  let instance
  let unmount
  if ('${runtime}' === 'vue2') {
    const Vue2 = Vue.default
    Vue2.config.productionTip = false
    Vue2.config.devtools = false
    Vue2.config.errorHandler = (error) => errors.push(error)
    Vue2.use(entry.default)
    assert.ok(Vue2.component('VueVirtualTree'))
    const parent = new Vue2({
      render(h) {
        return h('VueVirtualTree', {
          props,
          ref: 'tree',
          on: {
            check: (...args) => events.check.push(args),
            'node-click': (...args) => events.nodeClick.push(args),
            'current-change': (...args) => events.currentChange.push(args),
            'node-collapse': (...args) => events.nodeCollapse.push(args),
            'node-expand': (...args) => events.nodeExpand.push(args),
          },
          scopedSlots: useSlot ? { default: (slot) => {
            slots.push(slot)
            return h('button', {
              class: 'slot-label',
              on: { click: (event) => { event.stopPropagation(); slot.selectChange(true) } },
            }, ['slot:' + slot.item.label])
          } } : undefined,
        })
      },
    })
    parent.$mount()
    host.appendChild(parent.$el)
    instance = parent.$refs.tree
    unmount = () => parent.$destroy()
  } else {
    const app = Vue.createApp({
      render() {
        return Vue.h(Vue.resolveComponent('VueVirtualTree'), {
          ...props,
          ref: (value) => { instance = value },
          onCheck: (...args) => events.check.push(args),
          onNodeClick: (...args) => events.nodeClick.push(args),
          onCurrentChange: (...args) => events.currentChange.push(args),
          onNodeCollapse: (...args) => events.nodeCollapse.push(args),
          onNodeExpand: (...args) => events.nodeExpand.push(args),
        }, useSlot ? { default: (slot) => {
          slots.push(slot)
          return Vue.h('button', {
            class: 'slot-label',
            onClick: (event) => { event.stopPropagation(); slot.selectChange(true) },
          }, 'slot:' + slot.item.label)
        } } : undefined)
      },
    })
    app.config.errorHandler = (error) => errors.push(error)
    app.use(entry.default)
    assert.equal(app.component('VueVirtualTree'), entry.default)
    app.mount(host)
    unmount = () => app.unmount()
  }
  mounted.push(() => { unmount(); host.remove() })
  await settle()
  assert.ok(instance, 'registered root-entry component must mount')
  return { host, instance, events, slots }
}

try {
  const model = new entry.TreeStore({ data: data(), key: 'id' })
  assert.ok(model.getNode(2) instanceof entry.Node)
  assert.equal(model.getNode(2).data.label, 'Child')
  model.destroy()

  const tree = await mountTree()
  const rows = () => Array.from(tree.host.querySelectorAll('.virtual-tree-node'))
  const row = (label) => rows().find((element) => element.querySelector('.name')?.textContent === label)
  assert.equal(rows().length, 4)
  assert.equal(tree.host.querySelector('.virtual-tree').style.height, '260px')

  // Checking actual scoped elements and computed styles catches missing scope IDs.
  for (const element of rows()) {
    assert.ok(element.hasAttribute('data-v-vvt-node'))
    assert.equal(getComputedStyle(element).display, 'flex')
    assert.ok(element.querySelector('.expand-icon[data-v-vvt-node]'))
    const wrapper = element.querySelector('.checkbox-wrapper[data-v-vvt-checkbox]')
    const checkbox = element.querySelector('.checkbox[data-v-vvt-checkbox]')
    assert.ok(wrapper)
    assert.ok(checkbox)
    assert.equal(getComputedStyle(wrapper).marginRight, '8px')
    assert.equal(getComputedStyle(checkbox).width, '14px')
  }

  row('Child').click()
  await settle()
  assert.equal(tree.events.nodeClick.at(-1)[0].id, 2)
  assert.equal(tree.events.currentChange.at(-1)[0].id, 2)
  assert.equal(tree.instance.getCurrentKey(), 2)
  assert.ok(row('Child').classList.contains('is-current'))

  row('Root').querySelector('.expand-icon').click()
  await settle()
  assert.equal(tree.events.nodeCollapse.at(-1)[0].id, 1)
  assert.equal(rows().length, 2)
  row('Root').querySelector('.expand-icon').click()
  await settle()
  assert.equal(tree.events.nodeExpand.at(-1)[0].id, 1)
  assert.equal(rows().length, 4)

  const clickCount = tree.events.nodeClick.length
  row('Root').querySelector('.checkbox').click()
  await settle()
  assert.deepEqual(tree.instance.getCheckedKeys().sort(), [1, 2, 3])
  assert.equal(tree.events.check.at(-1)[0].id, 1)
  assert.deepEqual(tree.events.check.at(-1)[1].checkedKeys.sort(), [1, 2, 3])
  assert.equal(tree.events.nodeClick.length, clickCount, 'checkbox click must not select its row')
  assert.equal(tree.instance.getCurrentKey(), 2)
  const disabled = row('Disabled').querySelector('.checkbox')
  assert.equal(disabled.disabled, true)
  disabled.click()
  await settle()
  assert.equal(tree.instance.getNode(4).checked, false)

  tree.instance.setCheckedAll(false)
  tree.instance.setChecked(2, true)
  await settle()
  assert.deepEqual(tree.instance.getCheckedKeys(), [2])
  assert.deepEqual(tree.instance.getHalfCheckedKeys(), [1])
  assert.equal(row('Root').querySelector('.checkbox').indeterminate, true)
  assert.equal(row('Child').querySelector('.checkbox').checked, true)
  assert.deepEqual(tree.instance.getNodePath(2).map((item) => item.id), [1, 2])
  tree.instance.setCurrentKey(3)
  await settle()
  assert.equal(tree.instance.getCurrentNode().label, 'Sibling')
  assert.ok(row('Sibling').classList.contains('is-current'))
  tree.instance.filter('Child')
  await settle()
  assert.deepEqual(rows().map((element) => element.querySelector('.name').textContent), ['Root', 'Child'])
  tree.instance.filter('')
  tree.instance.append({ id: 5, label: 'Appended' }, 1)
  await settle()
  assert.equal(tree.instance.getNode(5).data.label, 'Appended')
  assert.ok(row('Appended'))
  tree.instance.updateKeyChildren(1, [{ id: 6, label: 'Updated' }])
  await settle()
  assert.equal(tree.instance.getNode(5), null)
  assert.ok(row('Updated'))
  tree.instance.remove(6)
  await settle()
  assert.equal(tree.instance.getNode(6), null)
  assert.equal(row('Updated'), undefined)

  const slotted = await mountTree(true)
  assert.deepEqual(Array.from(slotted.host.querySelectorAll('.slot-label'), (element) => element.textContent), [
    'slot:Root', 'slot:Child', 'slot:Sibling', 'slot:Disabled',
  ])
  const childSlot = slotted.slots.find((slot) => slot.item.id === 2)
  assert.equal(childSlot.node.data, childSlot.item)
  assert.equal(typeof childSlot.selectChange, 'function')
  slotted.host.querySelectorAll('.slot-label')[1].click()
  await settle()
  assert.deepEqual(slotted.instance.getCheckedKeys(), [2])
  assert.equal(slotted.events.check.at(-1)[0].id, 2)
  assert.equal(slotted.events.nodeClick.length, 0)
  assert.equal(slotted.instance.getCurrentKey(), null)
} finally {
  for (const unmount of mounted.reverse()) unmount()
  await settle()
  dom.window.close()
}
assert.deepEqual(errors, [], 'Vue must not report lifecycle or event-handler errors')
`
}

function typeFixture(runtime) {
  const specifiers = [
    '@zjinh/vue-virtual-tree',
  ]
  const runtimeIntegration = runtime === 'vue2'
    ? `import Vue from 'vue'
Vue.use(Default0)
new Vue({
  components: { ConsumerTree: Named0 },
  render: (h) => h('ConsumerTree', { props: props0 }),
})`
    : `import { createApp, h } from 'vue'
createApp({ render: () => h(Default0, props0) }).use(Default0)
createApp({}).component('ConsumerTree', Named0)`

  return specifiers.map((specifier, index) => `
import Default${index}, {
  VueVirtualTree as Named${index},
  Node as Node${index},
  TreeStore as TreeStore${index},
  type TreeKey as TreeKey${index},
  type VueVirtualTreeProps as Props${index},
  type VueVirtualTreeInstance as Instance${index},
  type VueVirtualTreeDefaultSlotProps as Slot${index},
} from '${specifier}'

interface Item${index} { id: number; label: string; children?: Item${index}[] }
const key${index}: TreeKey${index} = ${index}
const props${index}: Props${index}<Item${index}> = {
  data: [{ id: key${index}, label: 'node' }],
  nodeKey: 'id',
  props: { label: 'label', children: 'children' },
}
const store${index} = new TreeStore${index}<Item${index}>({ data: props${index}.data ?? [], key: 'id' })
const node${index} = new Node${index}({ data: { id: key${index}, label: 'node' }, store: store${index} })
Default${index}.install({ component: (_name, component) => component })
Named${index}.install({ component: (_name, component) => component })
declare const instance${index}: Instance${index}<Item${index}>
instance${index}.filter('node')
instance${index}.scrollToItem(key${index}, 18, false)
const checkedNodes${index}: Item${index}[] = instance${index}.getCheckedNodes(false, true)
instance${index}.getCheckedKeys(false)
instance${index}.getCurrentNode()
instance${index}.getCurrentKey()
instance${index}.setCheckedNodes(props${index}.data ?? [], false)
instance${index}.setCheckedKeys([key${index}])
instance${index}.setChecked(key${index}, true, true)
instance${index}.setCheckedAll(false)
instance${index}.getHalfCheckedNodes()
instance${index}.getHalfCheckedKeys()
instance${index}.getSelectedLeafNodes()
instance${index}.getSelectedLeafKeys()
instance${index}.setCurrentNode(node${index}.data)
instance${index}.setCurrentKey(key${index})
instance${index}.getNode(key${index})
instance${index}.remove(key${index})
instance${index}.append(node${index}.data, key${index})
instance${index}.insertBefore(node${index}.data, key${index})
instance${index}.insertAfter(node${index}.data, key${index})
instance${index}.updateKeyChildren(key${index}, [node${index}.data])
const path${index}: Item${index}[] = instance${index}.getNodePath(key${index})
const slot${index}: Slot${index}<Item${index}> = {
  node: node${index}, item: node${index}.data,
  selectChange: (checked) => instance${index}.setChecked(key${index}, checked),
}
// @ts-expect-error keys cannot refer to a children array
new TreeStore${index}<Item${index}>({ data: [], key: 'children' })
// @ts-expect-error checked keys must be strings or numbers
instance${index}.setCheckedKeys([true])
// @ts-expect-error slot selection accepts a boolean
slot${index}.selectChange('checked')
const invalidProps${index}: Props${index}<Item${index}> = {
  // @ts-expect-error component keys cannot refer to a children array
  nodeKey: 'children',
}
const unsupportedRender${index}: Props${index}<Item${index}> = {
  // @ts-expect-error renderContent is an unsupported compatibility placeholder
  renderContent: () => null,
}
void node${index}
void path${index}
void checkedNodes${index}
void invalidProps${index}
void unsupportedRender${index}
`).join('\n') + '\n' + runtimeIntegration
}

async function verifyConsumer(runtime, version, checkTypes) {
  const consumerRoot = await mkdtemp(join(tmpdir(), `vue-virtual-tree-${runtime}-`))

  try {
    await Promise.all([
      writeFile(join(consumerRoot, 'package.json'), packageJson(version, checkTypes)),
      writeFile(join(consumerRoot, 'runtime.mjs'), runtimeFixture(runtime, version)),
      writeFile(join(consumerRoot, 'types.ts'), typeFixture(runtime)),
      writeFile(join(consumerRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          lib: ['ES2020', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2020',
        },
        include: ['types.ts'],
      }, null, 2)),
    ])

    const pnpmCli = process.env.npm_execpath
    assert.ok(pnpmCli, 'npm_execpath must point to the pnpm JavaScript CLI')
    const environment = await createIsolatedNpmEnvironment(process.env, consumerRoot)
    const pnpmConfigArgs = createIsolatedPnpmConfigArgs(environment)
    assert.ok(pnpmConfigArgs.some((argument) => argument.startsWith('--config.userconfig=')))
    assert.ok(pnpmConfigArgs.some((argument) => argument.startsWith('--config.globalconfig=')))

    await run(
      process.execPath,
      [
        pnpmCli,
        ...pnpmConfigArgs,
        'install',
        '--frozen-lockfile=false',
        '--ignore-scripts',
      ],
      { cwd: consumerRoot, env: environment },
    )
    await run(process.execPath, ['runtime.mjs'], { cwd: consumerRoot, env: environment })
    if (checkTypes) {
      await run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], {
        cwd: consumerRoot,
        env: environment,
      })
    }
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join('\n')
    if (output) error.message += '\n' + output
    throw error
  } finally {
    await rm(consumerRoot, { force: true, recursive: true })
  }
}

test('installs and mounts the packed root entry in supported Vue runtimes', async (context) => {
  await access(releaseTarballPath)
  assert.ok((await readFile(releaseTarballPath)).byteLength > 0)

  const { stdout: archiveListing } = await run(
    'tar',
    ['-tzf', releaseTarballPath],
    { cwd: projectRoot },
  )
  const archiveFiles = new Set(archiveListing.trim().split(/\r?\n/))
  assert.ok(archiveFiles.has('package/README.md'))
  assert.ok(archiveFiles.has('package/README.zh-CN.md'))
  assert.deepEqual(
    [...archiveFiles].filter((path) => path.startsWith('package/dist/') && !path.endsWith('/')).sort(),
    ['package/dist/index.d.ts', 'package/dist/index.js', 'package/dist/style.css'],
  )

  // The earliest Vue releases have internal declaration constraints that fail
  // under TypeScript 6. Exercise their supported runtime floor without masking
  // declaration errors: current Vue releases run with skipLibCheck: false.
  for (const [runtime, version, checkTypes] of [
    ['vue2', '2.7.0', false],
    ['vue2', '2.7.16', true],
    ['vue3', '3.2.0', false],
    ['vue3', '3.5.40', true],
  ]) {
    await context.test(
      runtime + ' ' + version + (checkTypes ? ' runtime and strict types' : ' minimum runtime'),
      () => verifyConsumer(runtime, version, checkTypes),
    )
  }
})
