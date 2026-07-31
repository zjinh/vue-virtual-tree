import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function assertPinnedToolchain(workflow) {
  assert.match(workflow, /actions\/checkout@v6/)
  assert.match(workflow, /actions\/setup-node@v6/)
  assert.match(workflow, /node-version:\s*22\.22\.3/)
  assert.match(workflow, /package-manager-cache:\s*false/)
  assert.match(workflow, /corepack enable/)
  assert.match(workflow, /corepack prepare pnpm@10\.33\.4 --activate/)
  assert.match(workflow, /pnpm install --frozen-lockfile/)
}

function assertNoLongLivedRegistryToken(workflow) {
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|NPM_TOKEN/)
  assert.doesNotMatch(workflow, /secrets\./)
  assert.doesNotMatch(workflow, /_authToken/)
}

test('runs the complete CI gate for main pushes and pull requests', async () => {
  const workflow = await read('.github/workflows/ci.yml')

  assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/)
  assert.match(workflow, /pull_request:/)
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/)
  assert.match(workflow, /concurrency:[\s\S]*group:/)
  assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress:\s*true/)
  assertPinnedToolchain(workflow)
  assert.match(workflow, /pnpm run ci:check/)
  assertNoLongLivedRegistryToken(workflow)
})

test('publishes a GitHub release through npm trusted publishing only after all gates', async () => {
  const workflow = await read('.github/workflows/publish.yml')

  assert.match(workflow, /release:\s*\n\s*types:\s*\[published\]/)
  assert.doesNotMatch(workflow, /workflow_dispatch:/)
  assert.match(workflow, /runs-on:\s*ubuntu-latest/)
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read\s*\n\s*id-token:\s*write/)
  assertPinnedToolchain(workflow)
  assert.match(workflow, /registry-url:\s*['"]https:\/\/registry\.npmjs\.org['"]/)
  assert.match(workflow, /npm install --global npm@11\.5\.1/)
  assert.match(workflow, /pnpm run publish:check/)
  assert.match(
    workflow,
    /npm publish \.release\/package\.tgz --ignore-scripts --access public/,
  )
  assertNoLongLivedRegistryToken(workflow)
})
