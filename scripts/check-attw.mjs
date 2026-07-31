import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { projectRoot, releaseTarballPath } from './release-tarball.mjs'

const run = promisify(execFile)
const attwCli = fileURLToPath(
  new URL('../node_modules/@arethetypeswrong/cli/dist/index.js', import.meta.url),
)

await Promise.all([access(attwCli), access(releaseTarballPath)])

const { stdout, stderr } = await run(
  process.execPath,
  [
    attwCli,
    releaseTarballPath,
    '--profile',
    'esm-only',
    '--exclude-entrypoints',
    'style.css',
    '--no-color',
  ],
  { cwd: projectRoot },
)

process.stdout.write(stdout)
process.stderr.write(stderr)
