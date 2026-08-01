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
const tsc = fileURLToPath(
  new URL('../node_modules/typescript/bin/tsc', import.meta.url),
)
const exampleIds = [
  'checkbox-current',
  'filter',
  'lazy',
  'slot',
  'ref-methods',
]

async function readOptional(relativePath) {
  try {
    return await readFile(new URL(relativePath, rootUrl), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

const documents = [
  {
    name: 'docs/guide.md',
    source: await readOptional('docs/guide.md'),
  },
  {
    name: 'docs/guide.zh-CN.md',
    source: await readOptional('docs/guide.zh-CN.md'),
  },
]
const readmeDocuments = [
  {
    name: 'README.md',
    source: await readOptional('README.md'),
  },
  {
    name: 'README.zh-CN.md',
    source: await readOptional('README.zh-CN.md'),
  },
]

function extractStableExample(source, id) {
  if (!source) return null
  const startMarker = `<!-- guide-example:${id}:start -->`
  const endMarker = `<!-- guide-example:${id}:end -->`
  const start = source.indexOf(startMarker)
  if (start < 0) return null
  const fenceStart = source.indexOf('```vue\n', start + startMarker.length)
  const fenceEnd = source.indexOf('\n```', fenceStart + 7)
  const end = source.indexOf(endMarker, fenceEnd + 4)
  if (fenceStart < 0 || fenceEnd < 0 || end < 0) return null
  return source.slice(fenceStart + 7, fenceEnd)
}

function sectionById(source, id) {
  assert.ok(source, 'document must exist')
  const start = source.indexOf(`<!-- section:${id} -->`)
  assert.ok(start >= 0, `missing ${id} section`)
  const next = source.indexOf('<!-- section:', start + 1)
  return source.slice(start, next < 0 ? source.length : next)
}

function fencedBlocks(source, sectionId, language) {
  const section = sectionById(source, sectionId)
  const pattern = new RegExp('^```' + language + '\\n([\\s\\S]*?)\\n```$', 'gm')
  return [...section.matchAll(pattern)].map((match) => match[1])
}

async function runVueTsc(projectDirectory, label) {
  try {
    await run(
      process.execPath,
      [vueTsc, '--noEmit', '-p', join(projectDirectory, 'tsconfig.json')],
      { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
    )
  } catch (error) {
    assert.fail(`${label} did not typecheck:\n${error?.stdout ?? ''}${error?.stderr ?? ''}`)
  }
}

async function emitDeclarations(outputDirectory) {
  try {
    await run(
      process.execPath,
      [
        tsc,
        '-p',
        join(projectRoot, 'tsconfig.declarations.json'),
        '--outDir',
        outputDirectory,
      ],
      { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
    )
  } catch (error) {
    assert.fail(
      `Temporary package declarations did not build:\n`
      + `${error?.stdout ?? ''}${error?.stderr ?? ''}`,
    )
  }
}

test('keeps exactly five mirrored, complete Vue 3 examples in the Guide pages', () => {
  for (const document of documents) {
    assert.ok(document.source, `${document.name} must exist`)
    assert.equal(
      [...document.source.matchAll(/^```vue$/gm)].length,
      exampleIds.length,
      `${document.name} must contain only the five contracted Vue SFC examples`,
    )
    for (const id of exampleIds) {
      assert.ok(
        extractStableExample(document.source, id),
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

test('typechecks every Guide example as a standalone Vue 3 SFC', async () => {
  for (const document of documents) {
    assert.ok(document.source, `${document.name} must exist`)
  }

  const releaseDirectory = join(projectRoot, '.release')
  await mkdir(releaseDirectory, { recursive: true })
  const temporaryRoot = await mkdtemp(join(releaseDirectory, 'guide-examples-'))

  try {
    const uniqueExamples = new Map()
    for (const document of documents) {
      for (const id of exampleIds) {
        const source = extractStableExample(document.source, id)
        assert.ok(source, `${document.name} must contain ${id}`)
        const hash = createHash('sha256').update(source).digest('hex')
        uniqueExamples.set(hash, { id, source })
      }
    }
    assert.equal(uniqueExamples.size, exampleIds.length)

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
        `Guide Vue examples did not typecheck:\n${error?.stdout ?? ''}${error?.stderr ?? ''}`,
      )
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
})

test('typechecks the README quick starts and Vue 2.7 Guide code against their real entries', async () => {
  for (const document of readmeDocuments) {
    assert.ok(document.source, `${document.name} must exist`)
  }

  const vue3Main = fencedBlocks(readmeDocuments[0].source, 'vue3', 'ts')[0]
  const vue3ExplicitEntry = fencedBlocks(readmeDocuments[0].source, 'vue3', 'ts')[1]
  const vue3App = fencedBlocks(readmeDocuments[0].source, 'vue3', 'vue')[0]
  const vue2Main = fencedBlocks(readmeDocuments[0].source, 'vue2', 'ts')[0]
  const vue2App = fencedBlocks(readmeDocuments[0].source, 'vue2', 'vue')[0]
  const guideVue2 = fencedBlocks(documents[0].source, 'vue2', 'ts')[0]

  for (const [label, source] of [
    ['Vue 3 main', vue3Main],
    ['Vue 3 explicit entry', vue3ExplicitEntry],
    ['Vue 3 SFC', vue3App],
    ['Vue 2.7 main', vue2Main],
    ['Vue 2.7 SFC', vue2App],
    ['Vue 2.7 Guide', guideVue2],
  ]) {
    assert.ok(source, `missing ${label} code`)
  }

  assert.equal(vue3Main, fencedBlocks(readmeDocuments[1].source, 'vue3', 'ts')[0])
  assert.equal(vue3ExplicitEntry, fencedBlocks(readmeDocuments[1].source, 'vue3', 'ts')[1])
  assert.equal(vue3App, fencedBlocks(readmeDocuments[1].source, 'vue3', 'vue')[0])
  assert.equal(vue2Main, fencedBlocks(readmeDocuments[1].source, 'vue2', 'ts')[0])
  assert.equal(vue2App, fencedBlocks(readmeDocuments[1].source, 'vue2', 'vue')[0])
  assert.equal(guideVue2, fencedBlocks(documents[1].source, 'vue2', 'ts')[0])

  const releaseDirectory = join(projectRoot, '.release')
  await mkdir(releaseDirectory, { recursive: true })
  const temporaryRoot = await mkdtemp(join(releaseDirectory, 'quick-starts-'))
  const vue3Root = join(temporaryRoot, 'vue3')
  const vue2Root = join(temporaryRoot, 'vue2')
  const declarationRoot = join(temporaryRoot, 'types')

  try {
    await Promise.all([mkdir(vue3Root), mkdir(vue2Root)])
    await emitDeclarations(declarationRoot)
    await Promise.all([
      writeFile(join(vue3Root, 'main.ts'), vue3Main),
      writeFile(join(vue3Root, 'explicit-entry.ts'), vue3ExplicitEntry),
      writeFile(join(vue3Root, 'App.vue'), vue3App),
      writeFile(join(vue3Root, 'env.d.ts'), "declare module '*.css'\n"),
      writeFile(join(vue3Root, 'tsconfig.json'), JSON.stringify({
        extends: join(projectRoot, 'tsconfig.json'),
        compilerOptions: {
          noEmit: true,
          paths: {
            '@zjinh/vue-virtual-tree': [join(projectRoot, 'src/index.ts')],
            '@zjinh/vue-virtual-tree/vue3': [join(projectRoot, 'src/index.ts')],
          },
        },
        include: [
          join(vue3Root, '*'),
          join(projectRoot, 'src/vue-shim.d.ts'),
        ],
      }, null, 2)),
      writeFile(join(vue2Root, 'main.ts'), vue2Main),
      writeFile(join(vue2Root, 'App.vue'), vue2App),
      writeFile(join(vue2Root, 'guide.ts'), guideVue2),
      writeFile(join(vue2Root, 'env.d.ts'), "declare module '*.css'\n"),
      writeFile(join(vue2Root, 'tsconfig.json'), JSON.stringify({
        extends: join(projectRoot, 'tsconfig.json'),
        compilerOptions: {
          noEmit: true,
          types: [],
          paths: {
            vue: [join(projectRoot, 'node_modules/vue2')],
            '@zjinh/vue-virtual-tree': [join(declarationRoot, 'index.d.ts')],
            '@zjinh/vue-virtual-tree/vue2': [join(declarationRoot, 'index.d.ts')],
          },
        },
        vueCompilerOptions: {
          target: 2.7,
        },
        include: [
          join(vue2Root, '*.ts'),
          join(vue2Root, '*.vue'),
          join(vue2Root, '*.d.ts'),
        ],
      }, null, 2)),
    ])

    await Promise.all([
      runVueTsc(vue3Root, 'README Vue 3 quick start'),
      runVueTsc(vue2Root, 'README and Guide Vue 2.7 examples'),
    ])

    const validBinding = ':data="data"'
    const missingBinding = ':data="__readmeMissingTemplateBinding__"'
    assert.equal(vue2App.split(validBinding).length - 1, 1)
    await writeFile(join(vue2Root, 'App.vue'), vue2App.replace(validBinding, missingBinding))
    await assert.rejects(
      run(
        process.execPath,
        [vueTsc, '--noEmit', '-p', join(vue2Root, 'tsconfig.json')],
        { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
      ),
      (error) => {
        const output = `${error?.stdout ?? ''}${error?.stderr ?? ''}`
        assert.match(output, /App\.vue/)
        assert.match(output, /TS2339/)
        assert.match(output, /__readmeMissingTemplateBinding__/)
        return true
      },
      'Vue 2 README template checking must reject an undefined binding',
    )
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
})
