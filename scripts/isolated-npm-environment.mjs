import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function createIsolatedNpmEnvironment(sourceEnvironment, consumerRoot) {
  const environment = { ...sourceEnvironment }

  for (const name of Object.keys(environment)) {
    const normalizedName = name.toLowerCase()
    if (
      normalizedName === 'npm_config_userconfig'
      || normalizedName === 'npm_config_globalconfig'
      || /token|_auth/.test(normalizedName)
    ) {
      delete environment[name]
    }
  }

  const userConfig = join(consumerRoot, '.npmrc')
  const globalConfig = join(consumerRoot, '.global-npmrc')
  await Promise.all([
    writeFile(userConfig, ''),
    writeFile(globalConfig, ''),
  ])

  environment.npm_config_userconfig = userConfig
  environment.npm_config_globalconfig = globalConfig
  return environment
}
