const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');
const { parse, rewriteDefault, compileTemplate } = require('@vue/compiler-sfc');
const { coveragePlugin, instrumentSource } = require('./function-coverage');

const root = path.resolve(__dirname, '../..');
const bundles = new Map();

function bundleCore(entry) {
  if (!bundles.has(entry)) {
    bundles.set(entry, build({
      absWorkingDir: root,
      stdin: {
        contents: `
          import './src/g3w-vendors.js';
          import './src/${entry}';
          import './src/components/g3w-alerts.js';
          import { IframeApp } from './src/g3w-iframe.js';
          import { waitFor } from './src/utils/waitFor.js';
          import QueryBuilder from './src/components/QueryBuilder.vue';
          import QueryResults from './src/components/QueryResults.vue';
          import Table from './src/components/Table.vue';
          import ContextMenu from './src/components/ContextMenu.vue';
          import { SearchPanel as createSearchPanel } from './src/components/g3w-search.js';
          import Accessibility from './src/components/ModalAccessibility.vue';
          import ChangeMap from './src/components/ModalChangeMap.vue';
          import Metadata from './src/components/ModalMetadata.vue';
          import Bookmarks from './src/components/SpatialBookMarks.vue';
          import Tabs from './src/components/G3WTabs.vue';
          import disabled from './src/directives/v-disabled.js';
          import translate from './src/directives/v-t.js';
          window.coreTestExports = {
            IframeApp, waitFor, QueryBuilder, QueryResults, Table, ContextMenu, createSearchPanel, Accessibility, ChangeMap, Metadata,
            Bookmarks, Tabs, disabled, translate,
          };
        `,
        resolveDir: root,
      },
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      alias: Object.fromEntries([
        'utils', 'components', 'directives', 'interactions', 'shims', 'static',
        'g3w-app', 'g3w-component', 'g3w-constants', 'g3w-control', 'g3w-emitter',
        'g3w-globals', 'g3w-i18n', 'g3w-iframe', 'g3w-layer', 'g3w-panel',
        'g3w-plugin', 'g3w-state',
      ].map(name => [name, path.join(root, 'src', name)])),
      define: { 'process.env.g3w_client_rev': '"bdd-offline"' },
      loader: { '.css': 'empty' },
      plugins: [coveragePlugin, {
        name: 'core-browser-fixtures',
        setup(builder) {
          builder.onResolve({ filter: /^\.\.\/config$/ }, () => ({
            path: 'development-config',
            namespace: 'core-fixtures',
          }));
          builder.onResolve({ filter: /^\.\/index\.prod$/ }, () => ({
            path: 'production-entry',
            namespace: 'core-fixtures',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'core-fixtures' }, ({ path: fixture }) => ({
            contents: fixture === 'production-entry'
              ? 'window.bootstrapOrder = { configured: window.developmentConfigApplied, pageLength: g3w.constants.PAGELENGTHS[0] };'
              : 'module.exports = { plugins: [], devConfig() { window.developmentConfigApplied = true; } };',
          }));
          builder.onLoad({ filter: /\.vue$/ }, async ({ path: filename }) => {
            const descriptor = parse({ source: await fs.promises.readFile(filename, 'utf8'), filename });
            const script = descriptor.script
              ? rewriteDefault(instrumentSource(filename), '__component__')
              : 'const __component__ = {};';
            const template = descriptor.template && compileTemplate({
              source: descriptor.template.content,
              filename,
              id: 'core-browser',
              scoped: descriptor.styles.some(style => style.scoped),
            });
            if (template?.errors.length) {
              throw new Error(template.errors.map(error => error.msg || String(error)).join('\n'));
            }
            return {
              loader: 'js',
              resolveDir: path.dirname(filename),
              contents: `${script}\n${template ? `${template.code}\n__component__.render = render; __component__.staticRenderFns = staticRenderFns;` : ''}\nexport default __component__;`,
            };
          });
        },
      }],
    }).then(result => result.outputFiles[0].text));
  }
  return bundles.get(entry);
}

async function openCorePage(browser, entry = 'g3w-globals.js') {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'core.test') {
      return route.abort('blockedbyclient');
    }
    if (url.pathname === '/') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head></head><body><div id="app"></div><div id="startingspinner"></div><div id="fixture"></div></body></html>',
      });
    }
    if (url.pathname === '/static/client/locales/en.js') {
      return route.fulfill({
        contentType: 'text/javascript',
        body: instrumentSource(path.join(root, 'src', 'static', 'locales', 'en.js')),
      });
    }
    if (url.pathname.startsWith('/en/about/api/')) {
      return route.fulfill({ json: [] });
    }
    return route.abort('blockedbyclient');
  });
  await page.goto('http://core.test/');
  await page.evaluate(() => {
    window.initConfig = {
      user: { i18n: 'en' },
      plugins: {},
      projects: [],
      baselayers: [],
      baseurl: '/',
      staticurl: '/static/',
      client: 'client/',
      vectorurl: '/vector/',
      rasterurl: '/raster/',
      initproject: 'missing-project',
      locales: {},
    };
  });
  if (entry === 'index.dev.js') {
    await page.evaluate(() => {
      initConfig.id = 1;
      initConfig.initproject = 'offline-project';
      initConfig.projects = [{ gid: 'offline-project', id: 1, type: 'qdjango', modified: 0 }];
    });
  }
  try {
    await page.addScriptTag({ content: await bundleCore(entry) });
    if (errors.length) {
      throw new Error(errors.join('\n'));
    }
  } catch (error) {
    await context.close();
    throw error;
  }
  return { context, page };
}

module.exports = { openCorePage };
