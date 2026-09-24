import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const generatedDeclarationUrl = new URL('../dist/.declarations/index.d.ts', import.meta.url)
const publicCssUrl = new URL('../dist/style.css', import.meta.url)
const publicDeclarationUrl = new URL('../dist/index.d.ts', import.meta.url)

async function readRequired(url, label) {
  const content = await readFile(url, 'utf8')
  if (content.length === 0) {
    throw new Error(`${label} is empty: ${fileURLToPath(url)}`)
  }
  return content
}

async function writeAtomically(url, content) {
  const target = fileURLToPath(url)
  const directory = dirname(target)
  const temporary = join(
    directory,
    `.${basename(target)}.${process.pid}.${randomUUID()}.tmp`,
  )

  await mkdir(directory, { recursive: true })
  try {
    await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, target)
  } finally {
    await rm(temporary, { force: true })
  }
}

// Validate the single shared stylesheet; declarations remain generated from the
// public TypeScript entry without leaking internal component implementation types.
await readRequired(publicCssUrl, 'dist/style.css')
const declaration = await readRequired(generatedDeclarationUrl, 'generated index.d.ts')
await writeAtomically(publicDeclarationUrl, declaration)

await rm(new URL('../dist/.declarations/', import.meta.url), {
  force: true,
  recursive: true,
})
