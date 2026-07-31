import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, sep } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import * as isolatedNpm from '../scripts/isolated-npm-environment.mjs'

const run = promisify(execFile)
const dummyCredential = 'DUMMY_CREDENTIAL_SENTINEL'

function dummySourceEnvironment() {
  const environment = {}
  for (const name of [
    'PATH',
    'SystemRoot',
    'ComSpec',
    'PATHEXT',
    'TMPDIR',
    'TEMP',
    'TMP',
  ]) {
    if (process.env[name]) environment[name] = process.env[name]
  }

  return {
    ...environment,
    NPM_CONFIG_USERCONFIG: '/credentials/upper-user.npmrc',
    npm_config_userconfig: '/credentials/lower-user.npmrc',
    NPM_CONFIG_GLOBALCONFIG: '/credentials/upper-global.npmrc',
    npm_config_globalconfig: '/credentials/lower-global.npmrc',
    XDG_CONFIG_HOME: '/credentials/upper-xdg',
    xdg_config_home: '/credentials/lower-xdg',
    LOCALAPPDATA: '/credentials/upper-local-app-data',
    localappdata: '/credentials/lower-local-app-data',
    PREFIX: '/credentials/upper-prefix',
    prefix: '/credentials/lower-prefix',
    NPM_TOKEN: dummyCredential,
    'npm_config_//registry.npmjs.org/:_authToken': dummyCredential,
    CUSTOM_AUTH_VALUE: dummyCredential,
    NPM_CONFIG_USERNAME: dummyCredential,
    npm_config_username: dummyCredential,
    PNPM_CONFIG_USERNAME: dummyCredential,
    NPM_CONFIG__PASSWORD: dummyCredential,
    npm_config_password: dummyCredential,
    PNPM_CONFIG_OTP: dummyCredential,
    npm_config_email: dummyCredential,
    NPM_CONFIG_CERTFILE: dummyCredential,
    pnpm_config_keyfile: dummyCredential,
  }
}

test('normalizes isolated npm config paths and removes every credential variant', async () => {
  const consumerRoot = await mkdtemp(join(tmpdir(), 'isolated-npm-environment-'))

  try {
    const environment = await isolatedNpm.createIsolatedNpmEnvironment(
      dummySourceEnvironment(),
      consumerRoot,
    )

    assert.equal(environment.PATH, process.env.PATH)
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
    const pnpmConfigRoot = join(consumerRoot, '.pnpm-config')
    const npmPrefix = join(consumerRoot, '.npm-prefix')
    const pnpmConfigFile = process.platform === 'win32'
      ? join(pnpmConfigRoot, 'pnpm', 'config', 'rc')
      : join(pnpmConfigRoot, 'pnpm', 'rc')
    if (process.platform === 'win32') {
      assert.equal(environment.LOCALAPPDATA, pnpmConfigRoot)
      assert.equal(environment.XDG_CONFIG_HOME, undefined)
    } else {
      assert.equal(environment.XDG_CONFIG_HOME, pnpmConfigRoot)
      assert.equal(environment.LOCALAPPDATA, undefined)
    }
    assert.equal(await readFile(pnpmConfigFile, 'utf8'), '')
    assert.equal(environment.PREFIX, npmPrefix)
    assert.equal(environment.prefix, undefined)
    assert.equal(await readFile(join(npmPrefix, 'etc', 'npmrc'), 'utf8'), '')
    assert.ok(
      Object.keys(environment).every(
        (name) => !/token|_auth|username|_?password|otp|email|certfile|keyfile/i.test(name),
      ),
      'isolated environment must not retain credential variables',
    )
    assert.equal(
      Object.values(environment).includes(dummyCredential),
      false,
      'isolated environment must not retain dummy credential values',
    )
  } finally {
    await rm(consumerRoot, { force: true, recursive: true })
  }
})

test('exports explicit pnpm config arguments for both isolated config files', async () => {
  const consumerRoot = await mkdtemp(join(tmpdir(), 'isolated-pnpm-args-'))

  try {
    const environment = await isolatedNpm.createIsolatedNpmEnvironment(
      dummySourceEnvironment(),
      consumerRoot,
    )
    assert.equal(typeof isolatedNpm.createIsolatedPnpmConfigArgs, 'function')
    assert.deepEqual(isolatedNpm.createIsolatedPnpmConfigArgs(environment), [
      `--config.userconfig=${join(consumerRoot, '.npmrc')}`,
      `--config.globalconfig=${join(consumerRoot, '.global-npmrc')}`,
    ])
  } finally {
    await rm(consumerRoot, { force: true, recursive: true })
  }
})

test('isolates pinned pnpm config resolution from dummy credentials', async () => {
  const consumerRoot = await mkdtemp(join(tmpdir(), 'isolated-pnpm-cli-'))

  try {
    const pnpmCli = process.env.npm_execpath
    assert.ok(pnpmCli && isAbsolute(pnpmCli), 'npm_execpath must be an absolute pnpm CLI path')
    const environment = await isolatedNpm.createIsolatedNpmEnvironment(
      dummySourceEnvironment(),
      consumerRoot,
    )
    const configArgs = typeof isolatedNpm.createIsolatedPnpmConfigArgs === 'function'
      ? isolatedNpm.createIsolatedPnpmConfigArgs(environment)
      : []

    const { stdout: versionOutput } = await run(
      process.execPath,
      [pnpmCli, '--version'],
      { cwd: consumerRoot, env: environment },
    )
    assert.equal(versionOutput.trim(), '10.33.4')

    const { stdout } = await run(
      process.execPath,
      [pnpmCli, ...configArgs, 'config', 'list', '--json'],
      { cwd: consumerRoot, env: environment },
    )
    const config = JSON.parse(stdout)
    assert.equal(
      JSON.stringify(config).includes(dummyCredential),
      false,
      'pnpm config must not retain dummy credential values',
    )
    for (const configPath of [
      config.userconfig,
      config['npm-globalconfig'],
      config.globalconfig,
    ]) {
      const relativeConfigPath = typeof configPath === 'string'
        ? relative(consumerRoot, configPath)
        : '..'
      assert.ok(
        typeof configPath === 'string'
        && isAbsolute(configPath)
        && relativeConfigPath !== '..'
        && !relativeConfigPath.startsWith(`..${sep}`)
        && !isAbsolute(relativeConfigPath),
        'pnpm config paths must resolve inside the temporary consumer root',
      )
    }
    assert.equal(configArgs.length, 2, 'pnpm must receive both explicit isolated config arguments')
  } finally {
    await rm(consumerRoot, { force: true, recursive: true })
  }
})
