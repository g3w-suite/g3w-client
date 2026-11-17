# BDD tests

The Cucumber scenarios in `features/` cover core services, utilities, Vue
components, directives, interactions, map controls, translations, geocoders,
and static resources. The separate `@smoke` scenarios exercise remote projects
through the local development proxy.

## Run

1. Run `npm run dev` and leave the development proxy at `http://localhost:3000`
   running.
2. In another terminal, run `npm test`.

The tests require network access to `dev.g3wsuite.it` and a Playwright Chromium
installation. The project already depends on Playwright; install its browser
with `npx playwright install chromium` if it is missing.

To run all offline scenarios, without the proxy or remote server:

```sh
node build/test.js --tags "not @smoke"
```

The browser scenarios use Playwright Chromium with local or in-memory fixtures
and blocked external requests. The `@unit` scenarios do not start a browser.
No additional npm commands are required.

| Feature | Behavior checked |
| --- | --- |
| `core.feature` | Events, lifecycle, dialogs, galleries, localization, projections, plugins, selections, controls, SDK and startup failure handling |
| `layers.feature` | Layer metadata, relations, scale-dependent visibility, local data requests, styles, GeoJSON/GML parsing and permalinks |
| `shims.feature` | Browser behavior for jQuery, Moment, Select2 and the date/time picker |
| `utils.feature` | Data manipulation, geometry, filters, exports, requests, storage and async helpers |
| `ui.feature` | Component methods/computed state, directives, interactions and control callbacks |
| `static.feature` | Localized labels, fixture-based geocoding, decoded/rendered images and fonts, stylesheet effects |
| `coverage.feature` | Source integrity, scenario-to-file associations and a 100% runtime function gate |
| `dev.g3wsuite.it.feature` | Remote project smoke tests (`@smoke`, requires the proxy) |

Behavioral coverage is tracked with `@covers:src/path/to/file.js` tags on
scenarios. Run `node build/test.js --tags "@file-coverage"` to list source files
without an associated scenario. The gate uses Cucumber's Gherkin parser, ignores
tags mentioned in comments/descriptions, and discovers every file under `src/`
except `src/plugins/`. Add tags only to scenarios exercising the file's behavior;
syntax checks do not qualify. This is a per-file association requirement, not a
statement of 100% line or branch coverage.

## Runtime function coverage

The full suite also requires **100% of source functions to execute**.
The inventory includes every `.js` file and Vue `<script>` block under `src/`,
except `src/plugins/`, even when a file is never imported. Assets have no
functions. Compiler-generated render functions and dependency code are not
part of this inventory.

Test loaders instrument the original code before esbuild transforms it.
Counters include declarations, arrows, callbacks, constructors, accessors,
public methods and private methods. The function-only Babel visitor is
intentional: Istanbul's default instrumenter omits private class methods.
Istanbul's coverage library combines counters from Node, VM fixtures and each
Chromium context. Vue script locations retain their original file line numbers.
Instrumentation applies only to tests, not development or production builds.

The `@function-coverage` scenario enables an `AfterAll` check, so the threshold
is evaluated after **all** selected scenarios, not when the feature happens to
run. A normal full run exits unsuccessfully if even one function has zero hits,
and writes `test/coverage/functions.json` with function names, source locations
and hit counts. This generated report is ignored by Git and rebuilt from the
current process; previous reports do not contribute coverage.

Run the entire offline suite to measure coverage:

```sh
node build/test.js --tags "not @smoke"
```

Running only `@coverage` or `@function-coverage` does not exercise the application
and will therefore fail the runtime gate. For focused behavioral debugging,
select the relevant feature, or use `--tags "not @smoke and not @function-coverage"`;
that diagnostic run does **not** certify full function coverage. Coverage
aggregation currently expects Cucumber's default serial execution.

Do not add tags or lower the threshold to resolve uncovered functions: add
behavioral scenarios that exercise them. Function execution coverage does not
prove that every branch was taken or that every function result was asserted.

### Known source issues deferred to future PRs (after #1010 has been merged)

Source files remain unchanged. The following issues were verified while adding
the behavioral tests and are **not** hidden by exclusions or artificial hits:

| Source | Reproduction / consequence |
| --- | --- |
| [`g3w-state.js`](../src/g3w-state.js#L12), local `observe` helper | The helper and its proxy setter are declared but never used or exported. Normal application execution cannot exercise them. The code is retained. |
| [`Layer.getRelationAttributes`](../src/g3w-layer.js#L671) | Calling `layer.getRelationAttributes('missing')` throws `TypeError: this[#relations].find is not a function`. The private relation store is an object, not an array; the lookup callback never executes. |
| [`PluginService.unsubscribeEvent`](../src/g3w-plugin.js#L524) | Subscribe an event with `subscribeEvent({ name: 'updated', owner: 'subscriber', listener() {} })`, then unsubscribe it. This throws `TypeError: this.removeEvent is not a function`; the inherited emitter provides `off`, not `removeEvent`. `unsubscribeAllEvents` and `clearAllEvents` also use this broken cleanup path when subscriptions exist. |
| [`splitFeature`, 3D lines](../src/utils/splitFeature.js#L168) | Splitting `LineString([[0, 0, 8], [10, 0, 9]])` with `LineString([[5, -1], [5, 1]])` fails while parsing `LINESTRING(0 0 8,10 0 9)`: removing the WKT `Z` marker leaves the third ordinates behind. Execution never reaches the Z-restoration callback at line 226. |
| [`splitFeature`, polygon results](../src/utils/splitFeature.js#L134) | The Polygonizer returns individual Polygons, which the parser writes as single geometries. Valid polygon splits therefore cannot execute the multi-geometry callback in this branch. |
| [Date/time picker limit getters](../src/shims/datetimepicker.js#L431) | After clearing limits with `minDate(false)` / `maxDate(false)`, the corresponding getters can throw: `false?.clone()` still attempts to call the missing `clone` method. |
| [Date/time picker `today` / `clear` callbacks](../src/shims/datetimepicker.js#L314) | These callbacks have no corresponding widget actions, so the real widget cannot invoke them. They remain uncovered rather than being called artificially. |

These are not an exhaustive list of uncovered functions. The current report
also includes reachable behavior for which scenarios still need to be written.
The full runtime gate remains at 100% and is expected to fail until all gaps
and blocking source defects are addressed. Do not patch source methods in a
test fixture merely to execute an otherwise unreachable callback.

Shared test loaders and browser fixtures live in `support/`; source modules are
executed without changing the production module format or writing test bundles
into the source tree. Runtime dependencies are replaced only where the tested
behavior needs a controlled input (for example map services or HTTP responses).

Add project examples to `features/dev.g3wsuite.it.feature` and their step
definitions to `steps/dev.g3wsuite.it.js`.

```mermaid
flowchart LR
  Feature["Cucumber feature"] --> Steps["Step definitions"]
  Steps --> Unit["Offline Node scenarios"]
  Steps --> LocalBrowser["Offline Chromium + fixtures"]
  Steps -->|smoke only| Browser["Playwright browser"]
  Browser --> Proxy["Local proxy :3000"]
  Proxy -->|local files available| Assets["Client/plugin assets"]
  Proxy -->|otherwise| Remote["dev.g3wsuite.it"]
```

```mermaid
sequenceDiagram
  participant C as Cucumber
  participant P as Playwright
  participant L as Local proxy
  participant R as Remote project
  C->>P: Open project URL
  P->>L: Request page and static assets
  L->>L: Check local client/plugin files
  L->>R: Forward missing assets and project requests
  L-->>P: Return responses
  P-->>C: Assert version, plugins, and browser errors
```
