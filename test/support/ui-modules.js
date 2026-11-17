const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { parse } = require('@vue/compiler-sfc');
const { transform } = require('esbuild');

const projectRoot = path.resolve(__dirname, '../..');

const emptyModule = new Proxy({}, {
  get: (_, key) => key === '__esModule' ? false : () => undefined
});

async function loadSource(relativePath, imports = {}) {
  const filename = path.resolve(projectRoot, 'src', relativePath);
  let source = fs.readFileSync(filename, 'utf8');

  if (filename.endsWith('.vue')) {
    const descriptor = parse({ source, filename });
    source = descriptor.script.content;
  }

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
