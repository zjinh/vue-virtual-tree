import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const root = new URL('../', import.meta.url)

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function createLauncher(html, hash = '#vue3') {
  const timers = new Map()
  let nextTimerId = 1
  const dom = new JSDOM(html, {
    beforeParse(window) {
      window.setTimeout = (callback, delay) => {
        const timerId = nextTimerId++
        timers.set(timerId, { callback, delay })
        return timerId
      }
      window.clearTimeout = (timerId) => timers.delete(timerId)
    },
    runScripts: 'dangerously',
    url: `https://zjinh.github.io/vue-virtual-tree/${hash}`,
  })

  return {
    dom,
    runTimers() {
      for (const [timerId, timer] of timers) {
        timers.delete(timerId)
        timer.callback()
      }
    },
    timers,
  }
}

function readyMessage(window, frame, overrides = {}) {
  const frameUrl = new URL(frame.getAttribute('src'), window.location.href)
  const runtime = frameUrl.pathname.includes('/vue2/') ? 'vue2' : 'vue3'
  const data = {
    source: '@zjinh/vue-virtual-tree/demo',
    type: 'ready',
    runtime,
    generation: frameUrl.searchParams.get('generation'),
    ...overrides.data,
  }

  return new window.MessageEvent('message', {
    data,
    origin: overrides.origin ?? window.location.origin,
    source: overrides.eventSource ?? frame.contentWindow,
  })
}

test('exposes a standalone Pages build and test gate outside release scripts', async () => {
  const packageJson = JSON.parse(await read('package.json'))

  assert.equal(packageJson.scripts['build:pages'], 'node scripts/build-pages.mjs')
  assert.equal(
    packageJson.scripts['test:pages'],
    'pnpm run build:pages && node --test tests/pages-contract.test.mjs',
  )

  for (const scriptName of ['test', 'prepack', 'prepublishOnly', 'release:check']) {
    assert.doesNotMatch(packageJson.scripts[scriptName], /(?:build|test):pages/)
  }

  await access(new URL('scripts/build-pages.mjs', root))
})

test('keeps local demo builds at root while allowing the Pages builder to inject a base', async () => {
  for (const runtime of ['vue2', 'vue3']) {
    const config = await read(`examples/${runtime}/vite.config.ts`)

    assert.match(config, /base:\s*process\.env\.DEMO_BASE\s*\|\|\s*['"]\/['"]/)
    assert.doesNotMatch(config, /command\s*===\s*['"]serve['"]|\/vue-virtual-tree\/vue[23]\//)
  }
})

test('assembles the root launcher and both demo applications', async () => {
  await access(new URL('_site/index.html', root))

  for (const runtime of ['vue2', 'vue3']) {
    await access(new URL(`_site/${runtime}/index.html`, root))
    const assets = await readdir(new URL(`_site/${runtime}/assets/`, root))
    assert.ok(assets.some((asset) => asset.endsWith('.js')), `${runtime} must emit JavaScript`)
    assert.ok(assets.some((asset) => asset.endsWith('.css')), `${runtime} must emit CSS`)
  }
})

test('emits every demo asset reference below its project-site base', async () => {
  for (const runtime of ['vue2', 'vue3']) {
    const html = await read(`_site/${runtime}/index.html`)
    const references = [...html.matchAll(/(?:src|href)="([^"]+\.(?:css|js))"/g)]
      .map((match) => match[1])

    assert.ok(references.length >= 2, `${runtime} must reference built CSS and JavaScript`)
    assert.ok(
      references.every((reference) => reference.startsWith(`/vue-virtual-tree/${runtime}/`)),
      `${runtime} assets must stay below its Pages base`,
    )
  }
})

test('announces each embedded demo only after its runtime has mounted', async () => {
  for (const runtime of ['vue2', 'vue3']) {
    const main = await read(`examples/${runtime}/src/main.ts`)
    const mountIndex = runtime === 'vue2'
      ? main.indexOf(".$mount('#app')")
      : main.indexOf(".mount('#app')")
    const messageIndex = main.indexOf('window.parent.postMessage')

    assert.ok(mountIndex >= 0, `${runtime} must mount its real application`)
    assert.ok(messageIndex > mountIndex, `${runtime} must announce readiness after mount`)
    assert.match(main, /window\.parent\s*!==\s*window/)
    assert.match(main, /source:\s*['"]@zjinh\/vue-virtual-tree\/demo['"]/)
    assert.match(main, /type:\s*['"]ready['"]/)
    assert.match(main, new RegExp(`runtime:\\s*['"]${runtime}['"]`))
    assert.match(main, /generation:\s*new URLSearchParams\(window\.location\.search\)\.get\(['"]generation['"]\)/)
    assert.match(main, /window\.location\.origin/)
  }
})

test('switches runtimes in one iframe while keeping direct links token-free', async () => {
  const html = await read('_site/index.html')
  const { dom } = createLauncher(html)

  try {
    const { document, KeyboardEvent } = dom.window
    const frame = document.querySelector('iframe')
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const directLink = document.querySelector('[data-demo-link]')
    const loadState = document.querySelector('[data-load-state]')

    assert.equal(document.querySelectorAll('iframe').length, 1)
    assert.ok(frame)
    assert.equal(tabs.length, 2)
    assert.equal(tabs[1].getAttribute('aria-selected'), 'true')
    assert.equal(frame.getAttribute('src'), '/vue-virtual-tree/vue3/?generation=1')
    assert.equal(directLink.getAttribute('href'), '/vue-virtual-tree/vue3/')
    assert.match(loadState.textContent, /Loading Vue 3 demo/)

    tabs[0].click()
    assert.equal(tabs[0].getAttribute('aria-selected'), 'true')
    assert.equal(tabs[0].getAttribute('tabindex'), '0')
    assert.equal(tabs[1].getAttribute('aria-selected'), 'false')
    assert.equal(frame.getAttribute('src'), '/vue-virtual-tree/vue2/?generation=2')
    assert.equal(directLink.getAttribute('href'), '/vue-virtual-tree/vue2/')
    assert.match(loadState.textContent, /Loading Vue 2\.7 demo/)

    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    assert.equal(tabs[1].getAttribute('aria-selected'), 'true')
    assert.equal(frame.getAttribute('src'), '/vue-virtual-tree/vue3/?generation=3')

    assert.match(html, /<noscript>[\s\S]*vue2\/[\s\S]*vue3\/[\s\S]*<\/noscript>/i)
  } finally {
    dom.window.close()
  }
})

test('keeps loading through iframe load and accepts only the active ready handshake', async () => {
  const html = await read('_site/index.html')
  const { dom, timers } = createLauncher(html)

  try {
    const { document, Event } = dom.window
    const frame = document.querySelector('iframe')
    const loadState = document.querySelector('[data-load-state]')
    const errorState = document.querySelector('[data-error-state]')

    assert.equal(timers.size, 1)
    frame.dispatchEvent(new Event('load'))
    assert.equal(loadState.hidden, false, 'iframe load is not a readiness signal')
    assert.equal(errorState.hidden, true)

    const invalidMessages = [
      { eventSource: dom.window },
      { origin: 'https://example.com' },
      { data: { runtime: 'vue2' } },
      { data: { source: 'unexpected-source' } },
      { data: { type: 'unexpected-type' } },
      { data: { generation: 'stale-generation' } },
    ]

    for (const invalid of invalidMessages) {
      dom.window.dispatchEvent(readyMessage(dom.window, frame, invalid))
      assert.equal(loadState.hidden, false)
      assert.equal(errorState.hidden, true)
      assert.equal(timers.size, 1)
    }

    dom.window.dispatchEvent(readyMessage(dom.window, frame))
    assert.equal(loadState.hidden, true)
    assert.equal(errorState.hidden, true)
    assert.equal(timers.size, 0)
  } finally {
    dom.window.close()
  }
})

test('cancels stale readiness timers and exposes a direct-link fallback on timeout', async () => {
  const html = await read('_site/index.html')
  const { dom, runTimers, timers } = createLauncher(html)

  try {
    const { document } = dom.window
    const frame = document.querySelector('iframe')
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const loadState = document.querySelector('[data-load-state]')
    const errorState = document.querySelector('[data-error-state]')

    assert.equal(timers.size, 1)
    tabs[0].click()
    assert.equal(timers.size, 1, 'runtime switch must cancel the prior timer')
    assert.equal(frame.getAttribute('src'), '/vue-virtual-tree/vue2/?generation=2')

    runTimers()
    assert.equal(loadState.hidden, true)
    assert.equal(errorState.hidden, false)
    assert.match(errorState.textContent, /could not be loaded/i)
    assert.equal(errorState.querySelector('a').getAttribute('href'), '/vue-virtual-tree/vue2/')
  } finally {
    dom.window.close()
  }
})

test('deploys the tested artifact with least-privilege GitHub Pages jobs', async () => {
  const workflow = await read('.github/workflows/pages.yml')

  assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress:/)
  assert.match(workflow, /jobs:\s*\n\s*build:/)
  assert.match(workflow, /\n\s*deploy:\s*\n[\s\S]*needs:\s*build/)

  for (const action of [
    'actions/checkout@v6',
    'actions/setup-node@v6',
    'actions/configure-pages@v5',
    'actions/upload-pages-artifact@v4',
    'actions/deploy-pages@v4',
  ]) {
    assert.match(workflow, new RegExp(action.replace('/', '\\/')))
  }

  assert.match(workflow, /pnpm\/action-setup@v4[\s\S]*version:\s*10\.33\.4/)
  assert.match(workflow, /node-version:\s*22\.22\.3/)
  assert.match(workflow, /package-manager-cache:\s*false/)
  assert.match(workflow, /pnpm install --frozen-lockfile/)
  assert.match(workflow, /pnpm run test:pages/)
  assert.match(workflow, /actions\/upload-pages-artifact@v4[\s\S]*path:\s*_site/)

  const deployJob = workflow.slice(workflow.search(/\n\s*deploy:\s*\n/))
  assert.match(deployJob, /permissions:[\s\S]*pages:\s*write[\s\S]*id-token:\s*write/)
  assert.match(deployJob, /environment:[\s\S]*name:\s*github-pages/)
})

test('switches launcher language without restarting the active demo or readiness timeout', async () => {
  const { dom, timers } = createLauncher(await read('_site/index.html'))
  try {
    const { document, localStorage } = dom.window
    const chinese = document.querySelector('[data-locale="zh"]')
    assert.ok(chinese, 'the launcher must offer Chinese')
    const frame = document.querySelector('iframe')
    const initialSource = frame.getAttribute('src')
    chinese.click()
    assert.equal(document.documentElement.lang, 'zh-CN')
    assert.equal(localStorage.getItem('vue-virtual-tree:locale'), 'zh')
    assert.equal(chinese.getAttribute('aria-pressed'), 'true')
    assert.match(document.querySelector('[data-demo-link]').textContent, /单独打开/)
    assert.equal(frame.getAttribute('src'), initialSource)
    assert.equal(timers.size, 1)
    document.querySelector('[data-locale="en"]').click()
    assert.equal(document.documentElement.lang, 'en')
    assert.equal(frame.getAttribute('src'), initialSource)
  } finally { dom.window.close() }
})
