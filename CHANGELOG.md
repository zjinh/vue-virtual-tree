# Changelog

## 2.0.1 — 2026-11-11

- Reduce built-in row rendering to one viewport of buffer on each side. Custom slots retain the previous four-viewport buffer and local state.
- Allocate virtual-list index wrappers only for the observation window.
- Avoid redundant sibling searches during initialization and repeated key scans during checked-key selection.
- Flatten expanded nodes iteratively and reuse check-event query results.
- Preserve ordinary Node fields, synchronous selection propagation, legacy row observation and public childNodes array replacement behavior.
- Add Vue 2/3 compatibility regressions and reproducible memory, DOM and performance benchmarks.

With 50,000 expanded nodes, the measured mounted heap decreased by about 8.4 MiB in Vue 3 and 8.8 MiB in Vue 2. At a 520px viewport with 26px rows, built-in middle-window rows decreased from 180 to 60. Measurements use production Vue in jsdom and exclude browser layout and graphics memory.

Known limits: collapsed-tree memory is essentially unchanged; custom-slot DOM does not receive the same reduction; legacy scrolling can still trigger model refreshes and long frames. Construction, filtering and selection still contain recursive paths. See [the performance report](docs/performance-2026-10-27.md).
