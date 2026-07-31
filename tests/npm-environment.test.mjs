import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

test('normalizes isolated npm config paths and removes every credential variant', async () => {
  const { createIsolatedNpmEnvironment } = await import(
    '../scripts/isolated-npm-environment.mjs'
  )
  const consumerRoot = await mkdtemp(join(tmpdir(), 'isolated-npm-environment-'))

  try {
    const environment = await createIsolatedNpmEnvironment({
      PATH: '/example/bin',
      NPM_CONFIG_USERCONFIG: '/credentials/upper-user.npmrc',
      npm_config_userconfig: '/credentials/lower-user.npmrc',
      NPM_CONFIG_GLOBALCONFIG: '/credentials/upper-global.npmrc',
      npm_config_globalconfig: '/credentials/lower-global.npmrc',
      NPM_TOKEN: 'secret-token',
      'npm_config_//registry.npmjs.org/:_authToken': 'registry-secret',
      CUSTOM_AUTH_VALUE: 'custom-secret',
    }, consumerRoot)

    assert.equal(environment.PATH, '/example/bin')
    assert.deepEqual(
      Object.keys(environment).filter(
        (name) => name.toLowerCase() === 'npm_config_userconfig',
      ),
      ['npm_config_userconfig'],
    )
    assert.deepEqual(
      Object.keys(environment).filter(
        (name) => name.toLowerCase() === 'npm_config_globalconfig',
      ),
      ['npm_config_globalconfig'],
    )
    assert.equal(environment.npm_config_userconfig, join(consumerRoot, '.npmrc'))
    assert.equal(
      environment.npm_config_globalconfig,
      join(consumerRoot, '.global-npmrc'),
    )
    assert.equal(await readFile(environment.npm_config_userconfig, 'utf8'), '')
    assert.equal(await readFile(environment.npm_config_globalconfig, 'utf8'), '')
    assert.ok(
      Object.keys(environment).every((name) => !/token|_auth/i.test(name)),
      'isolated environment must not retain credential variables',
    )
  } finally {
    await rm(consumerRoot, { force: true, recursive: true })
  }
})
