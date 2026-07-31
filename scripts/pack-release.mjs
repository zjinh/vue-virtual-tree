import { execFile } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import {
  projectRoot,
  releaseDirectory,
  releaseTarballPath,
} from './release-tarball.mjs'

const run = promisify(execFile)
const pnpmCli = process.env.npm_execpath

if (!pnpmCli) {
  throw new Error('npm_execpath must point to the pnpm JavaScript CLI')
}

await rm(releaseDirectory, { force: true, recursive: true })
await mkdir(releaseDirectory, { recursive: true })

const { stdout, stderr } = await run(
  process.execPath,
  [pnpmCli, '--config.ignore-scripts=true', 'pack', '--out', releaseTarballPath],
  { cwd: projectRoot },
)

process.stdout.write(stdout)
process.stderr.write(stderr)
