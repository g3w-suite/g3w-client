# Repository guidance

- Use the Node.js and npm versions declared in `package.json`.
- Run offline BDD scenarios with `npm test`; no development proxy is required.
- Run `npm run dev` before `npm run test:smoke`; smoke scenarios use the local proxy.
- Keep generated client assets in the configured output directory, not in source files.
- Cucumber step definitions use CommonJS `.js` files under `test/steps`.
