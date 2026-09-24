# Unified Vue package entry implementation plan

**Goal:** Vue 2.7 and Vue 3 consume the same root package while preserving public methods, events, slots and styles.

**Architecture:** Retain the existing tree model and Options API. Replace the three compiled SFC templates with TypeScript render functions, adapting VNode props, events and slots to the installed Vue runtime. Emit a single ESM bundle and stylesheet; remove both legacy package subpaths. Keep both runtime scope identifiers on styled components so existing scoped styling remains isolated. No install-time mutation or new runtime dependency is needed.

**Execution:** Work directly in the current checkout as requested. Component/build implementation, API tests, and documentation updates have separate file ownership.

- [x] Inventory public API and compare the reference package. Baseline: 18 model tests and 24 component tests per runtime pass.
- [x] Point the component suite at `@zjinh/vue-virtual-tree`. Confirm Vue 2 fails on the current Vue 3 compiled render helpers.
- [x] Move component scripts to `src/tree.ts`, `src/components/checkbox.ts`, `src/components/virtual-tree-node.ts`; preserve model and method bodies. Add `src/components/render-compat.ts` for VNode conversion and retain scoped Less selectors.
- [x] Emit `dist/index.js`, `dist/index.d.ts`, `dist/style.css`; export the component only from the package root. Verify real Vue 2/3 consumers and rejection of removed version subpaths.
- [x] Cover every public tree, Node and TreeStore method through behavioral tests, plus event/slot/prop/lazy-loading and lifecycle regressions. Run the same component suite against both runtimes and the built root entry.
- [x] Update both language guides, README examples, demos and type fixtures to use root imports.
- [x] Run `pnpm run ci:check`, including package/model/runtime/type/demo checks, publint, packed isolated consumers, attw and Pages. Review the final diff and method coverage matrix; fix material findings before delivery.

## Verification result

`pnpm run ci:check` completed successfully after the final fixes on 2026-09-24.

- 46 package/documentation/release contract tests.
- 56 model tests; 77 component tests in each runtime, all through the built package root.
- 18 demo unit tests, both demo builds/typechecks, 10 Pages checks.
- 6 artifact checks including byte-identical consecutive builds.
- Isolated packed consumers: Vue 2.7.0, 2.7.16, 3.2.0, 3.5.40. All mount and exercise interaction and computed styles. Strict TypeScript 6 checks run on 2.7.16 and 3.5.40; the minimum versions have upstream declaration incompatibilities with TypeScript 6.
- Public types, source checks, publint and the existing ESM-only attw profile pass.
- Remained on the original main checkout; no branch or worktree created.

Behavioral regressions fixed with failing cases first: zero-valued parent keys, stale data registrations/current selection, child ordering, Vue 2 empty-subtree updates, and pending async slot fallback. Review caught and verified a lazy-child ordering regression before delivery.

The final review also added regressions for Vue 2 multi-comment slots, aliased children replacement, Node data/key synchronization, existing-node moves and subtree adoption, stale removed references, raw-only lazy children, and cancellation of lazy callbacks after replacement, removal or destruction. Every reproduced failure was fixed before the final gate.
