import { readFile } from 'node:fs/promises'
import { validateStableRelease } from './release-policy.mjs'

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
)

validateStableRelease({
  packageVersion: packageJson.version,
  releaseTag: process.env.RELEASE_TAG,
  releasePrerelease: process.env.RELEASE_PRERELEASE,
})

process.stdout.write(
  `Stable release policy accepted ${process.env.RELEASE_TAG} for ${packageJson.name}.\n`,
)
