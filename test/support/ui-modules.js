const path = require('node:path');
const Module = require('node:module');
const { transform } = require('esbuild');
const { instrumentSource } = require('./function-coverage');

const projectRoot = path.resolve(__dirname, '../..');

const emptyModule = new Proxy({}, {
  get: (_, key) => key === '__esModule' ? false : () => undefined
});

async function loadSource(relativePath, imports = {}) {
  const filename = path.resolve(projectRoot, 'src', relativePath);
  const source = instrumentSource(filename);

  const { code } = await transform(source, {
    loader: 'js',
    format: 'cjs',
    target: 'node22',
    sourcefile: filename
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = id => Object.prototype.hasOwnProperty.call(imports, id)
    ? imports[id]
    : id === 'vue'
      ? require('vue')
      : emptyModule;
  loaded._compile(code, filename);
  return loaded.exports.default ?? loaded.exports;
}

module.exports = { loadSource };
