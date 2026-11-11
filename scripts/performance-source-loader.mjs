import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'

export const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)

// Transform in memory, keeping dependencies on the current locked toolchain.
// An optional source directory supports comparing an uncommitted snapshot.
export function sourceLoader(ref, sourceRoot = root, vueRuntime = 'vue') {
  const cache = new Map()
  return function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    const relative = path.relative(root, file)
    const source = ref
      ? execFileSync('git', ['show', `${ref}:${relative}`], { cwd: root, encoding: 'utf8' })
      : readFileSync(path.join(sourceRoot, relative), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    } }).outputText
    const localRequire = id => id.endsWith('.less') ? {} : id.startsWith('.')
      ? load(path.resolve(path.dirname(file), `${id}.ts`)) : require(id === 'vue' ? vueRuntime : id)
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports)
    return module.exports
  }
}
