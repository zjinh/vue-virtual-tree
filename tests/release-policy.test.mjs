import assert from 'node:assert/strict'
import test from 'node:test'

async function validateStableRelease(input) {
  const releasePolicy = await import('../scripts/release-policy.mjs')
  return releasePolicy.validateStableRelease(input)
}

test('accepts a stable package version with its exact v-prefixed tag', async () => {
  await assert.doesNotReject(
    validateStableRelease({
      packageVersion: '1.2.3',
      releaseTag: 'v1.2.3',
      releasePrerelease: false,
    }),
  )
})

test('rejects GitHub prerelease releases', async () => {
  await assert.rejects(
    validateStableRelease({
      packageVersion: '1.2.3',
      releaseTag: 'v1.2.3',
      releasePrerelease: true,
    }),
    /GitHub prerelease releases are not supported/,
  )
})

test('rejects prerelease package versions', async () => {
  await assert.rejects(
    validateStableRelease({
      packageVersion: '1.2.3-beta.1',
      releaseTag: 'v1.2.3-beta.1',
      releasePrerelease: false,
    }),
    /package version must be a stable semantic version/,
  )
})

test('rejects a release tag that does not exactly match the package version', async () => {
  await assert.rejects(
    validateStableRelease({
      packageVersion: '1.2.3',
      releaseTag: 'v1.2.4',
      releasePrerelease: false,
    }),
    /release tag must exactly match v1\.2\.3/,
  )
})
