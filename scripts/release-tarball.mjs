import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const releaseDirectory = fileURLToPath(new URL('../.release/', import.meta.url))
export const releaseTarballPath = fileURLToPath(
  new URL('../.release/package.tgz', import.meta.url),
)
