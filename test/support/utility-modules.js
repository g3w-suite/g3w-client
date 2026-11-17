const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { coveragePlugin } = require('./function-coverage');

const projectRoot = path.resolve(__dirname, '../..');
const utilityRoot = path.join(projectRoot, 'src', 'utils');
const moduleCache = new Map();
let ol;
let jsts;

function compile(code, filename) {
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(code, filename);
  return compiled.exports;
}

function resetUtilityEnvironment() {
  globalThis.__utilityState = { project: { getLayerById: () => null, getLayers: () => [] } };
  globalThis.__utilityGui = { onafter() {}, state: {}, showUserMessage() {} };
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

async function loadUtility(filename) {
  if (!moduleCache.has(filename)) {
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

module.exports = { getOl, loadUtility, resetUtilityEnvironment };
