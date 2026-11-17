# BDD tests

The Cucumber scenarios in `features/` smoke-test the local client and plugin
assets against remote projects on `dev.g3wsuite.it`, routed through the local
development proxy. They verify the client version, plugin loading, browser
errors, and that at least one client asset is served from the local overrides
directory.

## Run

1. Run `npm run dev` and leave the development proxy at `http://localhost:3000`
   running.
2. In another terminal, run `npm test`.

The tests require network access to `dev.g3wsuite.it` and a Playwright Chromium
installation. The project already depends on Playwright; install its browser
with `npx playwright install chromium` if it is missing.

Add project examples to `features/dev.g3wsuite.it.feature` and their step
definitions to `steps/dev.g3wsuite.it.js`.

```mermaid
flowchart LR
  Feature["Cucumber feature"] --> Steps["Step definitions"]
  Steps --> Browser["Playwright browser"]
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
