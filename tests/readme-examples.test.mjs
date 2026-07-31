import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const run = promisify(execFile)
const rootUrl = new URL('../', import.meta.url)
const projectRoot = fileURLToPath(rootUrl)
const vueTsc = fileURLToPath(
  new URL('../node_modules/vue-tsc/bin/vue-tsc.js', import.meta.url),
)
const exampleIds = [
  'checkbox-current',
  'filter',
  'lazy',
  'slot',
  'ref-methods',
]
const documents = [
  {
    name: 'README.md',
    source: await readFile(new URL('README.md', rootUrl), 'utf8'),
    headings: [
      '### Checkbox and current-node state',
      '### Filtering',
      '### Lazy loading',
      '### Default scoped slot',
      '### Calling methods through a ref',
    ],
  },
  {
    name: 'README.zh-CN.md',
    source: await readFile(new URL('README.zh-CN.md', rootUrl), 'utf8'),
    headings: [
      '### 复选框与当前节点',
      '### 过滤',
      '### 懒加载',
      '### 默认 scoped slot',
      '### 通过 ref 调用方法',
    ],
  },
]

function extractStableExample(source, id) {
  const startMarker = `<!-- readme-example:${id}:start -->`
  const endMarker = `<!-- readme-example:${id}:end -->`
  const start = source.indexOf(startMarker)
  if (start < 0) return null
  const fenceStart = source.indexOf('```vue\n', start + startMarker.length)
  const fenceEnd = source.indexOf('\n```', fenceStart + 7)
  const end = source.indexOf(endMarker, fenceEnd + 4)
  if (fenceStart < 0 || fenceEnd < 0 || end < 0) return null
  return source.slice(fenceStart + 7, fenceEnd)
}

function extractLegacyExample(source, heading) {
  const headingStart = source.indexOf(heading)
  assert.ok(headingStart >= 0, `missing fallback heading ${heading}`)
  const fenceStart = source.indexOf('```vue\n', headingStart + heading.length)
  const fenceEnd = source.indexOf('\n```', fenceStart + 7)
  assert.ok(fenceStart >= 0 && fenceEnd >= 0, `missing Vue fence below ${heading}`)
  return source.slice(fenceStart + 7, fenceEnd)
}

function practicalSection(source) {
  const start = source.indexOf('<!-- section:practical-usage -->')
  const end = source.indexOf('<!-- section:api -->')
  assert.ok(start >= 0 && end > start, 'README must contain the practical usage section')
  return source.slice(start, end)
}

test('marks exactly five mirrored, complete Vue examples in practical usage', () => {
  for (const document of documents) {
    const section = practicalSection(document.source)
    assert.equal(
      [...section.matchAll(/^```vue$/gm)].length,
      exampleIds.length,
      `${document.name} must contain only the five contracted Vue SFC examples`,
    )
    for (const id of exampleIds) {
      assert.ok(
        extractStableExample(section, id),
        `${document.name} must wrap ${id} in stable example markers`,
      )
    }
  }

  for (const id of exampleIds) {
    assert.equal(
      extractStableExample(documents[0].source, id),
      extractStableExample(documents[1].source, id),
      `${id} must use identical source in both languages`,
    )
  }
})

test('typechecks every practical Vue example as a standalone Vue 3 SFC', async () => {
  const releaseDirectory = join(projectRoot, '.release')
  await mkdir(releaseDirectory, { recursive: true })
  const temporaryRoot = await mkdtemp(join(releaseDirectory, 'readme-examples-'))

  try {
    const uniqueExamples = new Map()
    for (const document of documents) {
      for (const [index, id] of exampleIds.entries()) {
        const source = extractStableExample(document.source, id)
          ?? extractLegacyExample(document.source, document.headings[index])
        const hash = createHash('sha256').update(source).digest('hex')
        uniqueExamples.set(hash, { id, source })
      }
    }

    await Promise.all([
      ...[...uniqueExamples.values()].map(({ id, source }, index) =>
        writeFile(join(temporaryRoot, `${index + 1}-${id}.vue`), source),
      ),
      writeFile(
        join(temporaryRoot, 'env.d.ts'),
        "declare module '*.css'\n",
      ),
      writeFile(
        join(temporaryRoot, 'tsconfig.json'),
        JSON.stringify({
          extends: join(projectRoot, 'tsconfig.json'),
          compilerOptions: {
            noEmit: true,
            paths: {
              '@zjinh/vue-virtual-tree': [join(projectRoot, 'src/index.ts')],
              '@zjinh/vue-virtual-tree/vue3': [join(projectRoot, 'src/index.ts')],
            },
          },
          include: [
            join(temporaryRoot, '*.vue'),
            join(temporaryRoot, 'env.d.ts'),
            join(projectRoot, 'src/vue-shim.d.ts'),
          ],
        }, null, 2),
      ),
    ])

    try {
      await run(
        process.execPath,
        [vueTsc, '--noEmit', '-p', join(temporaryRoot, 'tsconfig.json')],
        { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
      )
    } catch (error) {
      assert.fail(
        `README Vue examples did not typecheck:\n${error?.stdout ?? ''}${error?.stderr ?? ''}`,
      )
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
})
