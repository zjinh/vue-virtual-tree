import { spawn } from 'node:child_process'
import { cp, copyFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const pagesDirectory = join(projectRoot, '_site')
const pnpmCli = process.env.npm_execpath

if (!pnpmCli) {
  throw new Error('Run the Pages build through pnpm: pnpm run build:pages')
}

function runPnpm(arguments_, environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pnpmCli, ...arguments_], {
      cwd: projectRoot,
      env: { ...process.env, ...environment },
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code}`
      reject(new Error(`pnpm ${arguments_.join(' ')} failed with ${reason}`))
    })
  })
}

await runPnpm(['run', 'build'])

for (const runtime of ['vue2', 'vue3']) {
  await runPnpm(
    ['--filter', `@zjinh/vue-virtual-tree-demo-${runtime}`, 'run', 'build'],
    { DEMO_BASE: `/vue-virtual-tree/${runtime}/` },
  )
}

await rm(pagesDirectory, { force: true, recursive: true })
await mkdir(pagesDirectory, { recursive: true })
await copyFile(join(projectRoot, 'site/index.html'), join(pagesDirectory, 'index.html'))

for (const runtime of ['vue2', 'vue3']) {
  await cp(
    join(projectRoot, `examples/${runtime}/dist`),
    join(pagesDirectory, runtime),
    { recursive: true },
  )
}
