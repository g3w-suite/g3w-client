const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const { coveragePlugin } = require('./function-coverage');

const projectRoot = path.resolve(__dirname, '../..');
const utilityRoot = path.join(projectRoot, 'src', 'utils');
const moduleCache = new Map();
let ol;
let jsts;
let browserFileScript;
let utilityBrowser;

function compile(code, filename) {
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(code, filename);
  return compiled.exports;
}

function createDialogFixture(innerHTML) {
  const listeners = new Map();
  const relation = { value: '1', disabled: false };
  const fields = {
    format: { name: 'format', value: 'Shp' },
    down_with_relations: relation,
    down_with_polygon: { name: 'down_with_polygon', value: '1' },
  };
  const form = {
    addEventListener(name, callback) {
      listeners.set(`form:${name}`, callback);
    },
    querySelector(selector) {
      return '[name="down_with_relations"]' === selector ? relation : null;
    },
  };
  return {
    innerHTML,
    returnValue: '',
    open: false,
    closed: false,
    removed: false,
    fields,
    form,
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    querySelector(selector) {
      if ('form' === selector) return form;
      const match = /^\[name="([^"]+)"\]$/.exec(selector);
      return match && fields[match[1]] || null;
    },
    showModal() { this.open = true; },
    close() { this.closed = true; },
    remove() { this.removed = true; },
    async emit(name, event = {}) {
      for (const callback of listeners.get(name) || []) await callback(event);
    },
    async input(name, value) {
      const target = Object.assign(fields[name], { value, form });
      await listeners.get('form:input')({ target });
    },
  };
}

function resetUtilityEnvironment() {
  globalThis.__utilityState = { project: { getLayerById: () => null, getLayers: () => [] } };
  globalThis.__utilityGui = {
    hooks: {},
    onafter(name, callback) { this.hooks[name] = callback; },
    state: {},
    messages: [],
    showUserMessage(message) { this.messages.push(message); },
  };
  globalThis.GUI = globalThis.__utilityGui;
  globalThis.Vue = {
    observable: value => value,
    set(object, key, value) { object[key] = value; },
  };
  globalThis.window = {
    initConfig: { projects: [], urls: { baseurl: '/' } },
    top: null,
    self: null,
  };
  globalThis.window.top = globalThis.window;
  globalThis.window.self = globalThis.window;
  globalThis.location = { origin: 'https://example.test' };
  if (!jsts) {
    const filename = require.resolve('jsts/dist/jsts.min.js');
    jsts = compile(fs.readFileSync(filename, 'utf8'), filename);
  }
  globalThis.jsts = jsts;
  return globalThis.__utilityState;
}

async function loadUtility(filename, { fresh = false } = {}) {
  if (fresh || !moduleCache.has(filename)) {
    const sourcePath = path.join(utilityRoot, filename);
    const result = await esbuild.build({
      entryPoints: [sourcePath],
      bundle: true,
      format: 'cjs',
      platform: 'node',
      write: false,
      alias: { utils: utilityRoot, 'g3w-constants': path.join(projectRoot, 'src', 'g3w-constants.js') },
      plugins: [coveragePlugin, {
        name: 'utility-test-app-modules',
        setup(build) {
          build.onResolve({ filter: /^g3w-(state|app|i18n)$/ }, args => ({
            path: args.path,
            namespace: 'utility-test'
          }));
          build.onLoad({ filter: /.*/, namespace: 'utility-test' }, ({ path: name }) => ({
            loader: 'js',
            contents: {
              'g3w-state': 'export default globalThis.__utilityState;',
              'g3w-app': 'export default globalThis.__utilityGui;',
              'g3w-i18n': 'export const gettext = value => value;',
            }[name],
          }));
        },
      }],
    });
    moduleCache.set(filename, compile(result.outputFiles[0].text, sourcePath));
  }
  return moduleCache.get(filename);
}

async function getOl() {
  if (!ol) {
    const imports = [
      ['Point', 'ol/geom/Point.js'],
      ['MultiPoint', 'ol/geom/MultiPoint.js'],
      ['LineString', 'ol/geom/LineString.js'],
      ['MultiLineString', 'ol/geom/MultiLineString.js'],
      ['LinearRing', 'ol/geom/LinearRing.js'],
      ['Polygon', 'ol/geom/Polygon.js'],
      ['MultiPolygon', 'ol/geom/MultiPolygon.js'],
      ['Circle', 'ol/geom/Circle.js'],
      ['Feature', 'ol/Feature.js'],
      ['GeoJSON', 'ol/format/GeoJSON.js'],
      ['GPX', 'ol/format/GPX.js'],
      ['KML', 'ol/format/KML.js'],
      ['WMSGetFeatureInfo', 'ol/format/WMSGetFeatureInfo.js'],
      ['WKT', 'ol/format/WKT.js'],
      ['VectorLayer', 'ol/layer/Vector.js'],
      ['VectorSource', 'ol/source/Vector.js'],
    ];
    const contents = imports.map(([name, specifier]) =>
      `import ${name} from ${JSON.stringify(specifier)};\n`
    ).join('') +
      "import { unByKey } from 'ol/Observable.js';\n" +
      `export { ${imports.map(([name]) => name).join(', ')}, unByKey };`;
    const result = await esbuild.build({
      stdin: { contents, resolveDir: projectRoot, sourcefile: 'utility-ol.js' },
      bundle: true,
      format: 'cjs',
      platform: 'node',
      write: false,
    });
    ol = compile(result.outputFiles[0].text, path.join(projectRoot, 'test', 'support', 'utility-ol.cjs'));
  }
  return ol;
}

async function importVectorLayerInBrowser({ type, data }) {
  if (!browserFileScript) {
    const sourcePath = path.join(utilityRoot, 'createVectorLayerFromFile.js');
    const contents = [
      `import { createVectorLayerFromFile } from ${JSON.stringify(sourcePath)};`,
      "import Feature from 'ol/Feature.js';",
      "import Point from 'ol/geom/Point.js';",
      "import GeoJSON from 'ol/format/GeoJSON.js';",
      "import GPX from 'ol/format/GPX.js';",
      "import KML from 'ol/format/KML.js';",
      "import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo.js';",
      "import VectorLayer from 'ol/layer/Vector.js';",
      "import VectorSource from 'ol/source/Vector.js';",
      "window.ol = { Feature, geom: { Point }, format: { GeoJSON, GPX, KML, WMSGetFeatureInfo }, layer: { Vector: VectorLayer }, source: { Vector: VectorSource } };",
      "window.createVectorLayerFromFile = createVectorLayerFromFile;",
    ].join('\n');
    const result = await esbuild.build({
      stdin: { contents, resolveDir: projectRoot, sourcefile: 'utility-file-browser.js' },
      bundle: true,
      format: 'iife',
      globalName: 'utilityFileFixture',
      platform: 'browser',
      write: false,
      alias: { utils: utilityRoot, 'g3w-constants': path.join(projectRoot, 'src', 'g3w-constants.js') },
      plugins: [coveragePlugin],
    });
    browserFileScript = result.outputFiles[0].text;
  }
  utilityBrowser ||= await chromium.launch({ headless: true });
  const page = await utilityBrowser.newPage();
  try {
    await page.goto('about:blank');
    await page.addScriptTag({ content: browserFileScript });
    const result = await page.evaluate(async ({ type, data }) => {
      const fileData = data instanceof Array ? new Blob([new Uint8Array(data)]) : data;
      const layer = await window.createVectorLayerFromFile({
        name: 'browser-file',
        type,
        crs: 'EPSG:4326',
        mapCrs: 'EPSG:4326',
        data: fileData,
      });
      return layer.getSource().getFeatures().map(feature => {
        const properties = feature.getProperties();
        delete properties.geometry;
        return {
          geometry: feature.getGeometry().getType(),
          coordinates: feature.getGeometry().getCoordinates(),
          properties,
        };
      });
    }, { type, data: data instanceof Uint8Array ? Array.from(data) : data });
    const coverage = await page.evaluate(() => globalThis.__coverage__);
    globalThis.__coverage__ ||= {};
    for (const [filename, file] of Object.entries(coverage || {})) {
      if (!globalThis.__coverage__[filename]) {
        globalThis.__coverage__[filename] = file;
      } else {
        for (const [id, hits] of Object.entries(file.f || {})) {
          globalThis.__coverage__[filename].f[id] = (globalThis.__coverage__[filename].f[id] || 0) + hits;
        }
      }
    }
    return result;
  } finally {
    await page.close();
  }
}

async function closeUtilityBrowser() {
  if (utilityBrowser) {
    await utilityBrowser.close();
    utilityBrowser = undefined;
  }
}

module.exports = {
  closeUtilityBrowser, createDialogFixture, getOl, importVectorLayerInBrowser, loadUtility,
  resetUtilityEnvironment,
};
