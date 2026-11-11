# Tree performance implementation and acceptance plan

Goal: reduce memory and DOM cost while preserving public component, Node and TreeStore behavior in Vue 2.7 and Vue 3. User confirmed strict compatibility on 2026-11-11. Release target: 2.0.1.

## Final design

Keep ordinary Node field descriptors, stored writable Node.type and synchronous selection propagation. Retain legacy four-screen row observation and positional reuse. Render built-in content with one screen of buffer on each side; custom slots retain four screens to preserve their lifecycle and local state. No full-tree observation or new public API/dependency.

## Acceptance requirements

- [x] Initialization avoids redundant sibling scans; key membership uses existing lookup while retaining propagation order.
- [x] Iterative flatten preserves preorder, hidden-parent descent, collapsed exclusion and type timing; deep/wide flatten regressions pass.
- [x] Check event query reuse preserves result shape; public methods and attributes remain compatible.
- [x] Default content renders edge two-screen/middle three-screen windows with absolute indices, jumps, fractional viewports and state retention covered.
- [x] Custom slots retain legacy rendering range, input node identity and uncommitted value across small scrolls.
- [x] Observation tests are grounded in ae50f54 behavior; retain collapsed/filtered silence, row reuse events, raw children shallow-watcher differences, dynamic listeners and reentrant callbacks.
- [x] Explicit updateChildren and same-node raw children replacement retain public childNodes array replacement; legacy row reuse also retains its publicly observable array replacement.
- [x] Restore the original children watcher: pure scroll and null-to-null row reuse preserve external array identity notifications; abandon zero-flatten scrolling to meet strict compatibility.
- [x] Measure mounted heap in independent processes including rows and DOM, and document GC/cache limitations; reject full-tree memory regression.
- [x] Compare selection state/call traces (4080 cases) and window event traces against ae50f54.
- [x] Run final acceptance commands after all production changes; after the sandbox network failure, the full approved-network ci:check rerun passed (69 model, 131 component per runtime, four Vue tarballs, types, artifacts, demos, Pages).
- [x] Final real-browser validation of default and custom rows on both runtimes, including positioning, selection/current retention and filtering.
- [x] Final independent source review found no new confirmed blocker; measurement/document consistency and git diff --check verified.

Timing and heap samples are evidence, not unstable CI thresholds. Remaining recursion in construction/filter/selection and slow wide-tree cascading are documented limitations; no arbitrary-depth or universal scroll-smoothness claim.
