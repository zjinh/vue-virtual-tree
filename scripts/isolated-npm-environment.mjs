import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const npmCredentialFieldPattern = /(?:^|[/:_.-])(?:username|_?password|otp|email|certfile|keyfile)$/

export async function createIsolatedNpmEnvironment(sourceEnvironment, consumerRoot) {
  const environment = { ...sourceEnvironment }

  for (const name of Object.keys(environment)) {
    const normalizedName = name.toLowerCase()
    if (
      normalizedName === 'npm_config_userconfig'
      || normalizedName === 'npm_config_globalconfig'
      || normalizedName === 'xdg_config_home'
      || normalizedName === 'localappdata'
      || normalizedName === 'prefix'
      || /token|_auth/.test(normalizedName)
      || npmCredentialFieldPattern.test(normalizedName)
    ) {
      delete environment[name]
    }
  }

  const userConfig = join(consumerRoot, '.npmrc')
  const globalConfig = join(consumerRoot, '.global-npmrc')
  const npmPrefix = join(consumerRoot, '.npm-prefix')
  const npmPrefixConfigDirectory = join(npmPrefix, 'etc')
  const pnpmConfigRoot = join(consumerRoot, '.pnpm-config')
  const pnpmConfigDirectory = process.platform === 'win32'
    ? join(pnpmConfigRoot, 'pnpm', 'config')
    : join(pnpmConfigRoot, 'pnpm')
  const pnpmConfig = join(pnpmConfigDirectory, 'rc')
  await Promise.all([
    mkdir(npmPrefixConfigDirectory, { recursive: true }),
    mkdir(pnpmConfigDirectory, { recursive: true }),
  ])
  await Promise.all([
    writeFile(userConfig, ''),
    writeFile(globalConfig, ''),
    writeFile(join(npmPrefixConfigDirectory, 'npmrc'), ''),
    writeFile(pnpmConfig, ''),
  ])

  environment.npm_config_userconfig = userConfig
  environment.npm_config_globalconfig = globalConfig
  environment.PREFIX = npmPrefix
  if (process.platform === 'win32') {
    environment.LOCALAPPDATA = pnpmConfigRoot
  } else {
    environment.XDG_CONFIG_HOME = pnpmConfigRoot
  }
  return environment
}

export function createIsolatedPnpmConfigArgs(environment) {
  const userConfig = environment.npm_config_userconfig
  const globalConfig = environment.npm_config_globalconfig

  if (!userConfig || !globalConfig) {
    throw new Error('isolated pnpm config paths are required')
  }

  return [
    `--config.userconfig=${userConfig}`,
    `--config.globalconfig=${globalConfig}`,
  ]
}
