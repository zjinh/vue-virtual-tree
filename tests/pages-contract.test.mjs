import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const root = new URL('../', import.meta.url)

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
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

test('switches runtimes in one iframe with direct-link and failure fallbacks', async () => {
  const html = await read('_site/index.html')
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://zjinh.github.io/vue-virtual-tree/#vue3',
  })

  try {
    const { document, Event, KeyboardEvent } = dom.window
    const frame = document.querySelector('iframe')
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const directLink = document.querySelector('[data-demo-link]')
    const loadState = document.querySelector('[data-load-state]')
    const errorState = document.querySelector('[data-error-state]')

    assert.equal(document.querySelectorAll('iframe').length, 1)
    assert.ok(frame)
    assert.equal(tabs.length, 2)
    assert.equal(tabs[1].getAttribute('aria-selected'), 'true')
    assert.equal(frame.getAttribute('src'), '/vue-virtual-tree/vue3/')
    assert.equal(directLink.getAttribute('href'), '/vue-virtual-tree/vue3/')
    assert.match(loadState.textContent, /Loading Vue 3 demo/)

    tabs[0].click()
    assert.equal(tabs[0].getAttribute('aria-selected'), 'true')
    assert.equal(tabs[0].getAttribute('tabindex'), '0')
    assert.equal(tabs[1].getAttribute('aria-selected'), 'false')
    assert.equal(frame.getAttribute('src'), '/vue-virtual-tree/vue2/')
    assert.equal(directLink.getAttribute('href'), '/vue-virtual-tree/vue2/')
    assert.match(loadState.textContent, /Loading Vue 2\.7 demo/)

    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    assert.equal(tabs[1].getAttribute('aria-selected'), 'true')
    assert.equal(frame.getAttribute('src'), '/vue-virtual-tree/vue3/')

    frame.dispatchEvent(new Event('error'))
    assert.equal(errorState.hidden, false)
    assert.match(errorState.textContent, /could not be loaded/i)
    assert.equal(errorState.querySelector('a').getAttribute('href'), '/vue-virtual-tree/vue3/')

    assert.match(html, /<noscript>[\s\S]*vue2\/[\s\S]*vue3\/[\s\S]*<\/noscript>/i)
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
