import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const vue2CssUrl = new URL('../dist/vue2/style.css', import.meta.url)
const vue3CssUrl = new URL('../dist/vue3/style.css', import.meta.url)
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

const [vue2Css, vue3Css, declaration] = await Promise.all([
  readRequired(vue2CssUrl, 'dist/vue2/style.css'),
  readRequired(vue3CssUrl, 'dist/vue3/style.css'),
  readRequired(generatedDeclarationUrl, 'generated index.d.ts'),
])

await Promise.all([
  writeAtomically(publicCssUrl, `${vue2Css}\n${vue3Css}`),
  writeAtomically(publicDeclarationUrl, declaration),
])

await rm(new URL('../dist/.declarations/', import.meta.url), {
  force: true,
  recursive: true,
})
