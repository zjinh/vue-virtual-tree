const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export function validateStableRelease({
  packageVersion,
  releaseTag,
  releasePrerelease,
}) {
  if (releasePrerelease === true || releasePrerelease === 'true') {
    throw new Error('GitHub prerelease releases are not supported')
  }

  if (!stableVersionPattern.test(packageVersion)) {
    throw new Error(`package version must be a stable semantic version: ${packageVersion}`)
  }

  const expectedTag = `v${packageVersion}`
  if (releaseTag !== expectedTag) {
    throw new Error(
      `release tag must exactly match ${expectedTag}; received ${releaseTag || '<empty>'}`,
    )
  }
}
