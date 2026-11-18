const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { compileStyle, compileTemplate, parse } = require('@vue/compiler-sfc');
const { build, transform } = require('esbuild');
const vm = require('node:vm');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { AfterAll, Then, When } = require('@cucumber/cucumber');
const { getCoverageTargets, getSourceCoverageTags, listSourceFiles } = require('../support/source-coverage');
const { assertFunctionCoverage, instrumentCode, isSourceModule, summarizeFunctions, writeFunctionCoverageReport } = require('../support/function-coverage');

const projectRoot = path.resolve(__dirname, '../..');
const sourceRoot = path.join(projectRoot, 'src');
const featureRoot = path.join(projectRoot, 'test', 'features');
const unsupportedVoidTagError = /^tag <(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b.*has no matching end tag\.$/;

let enforceFunctionCoverage = false;

AfterAll({ timeout: 60_000 }, function () {
  if (!enforceFunctionCoverage) return;
  const { report, reportPath } = writeFunctionCoverageReport();
  assertFunctionCoverage(report, reportPath);
});

Then('the suite must meet the documented runtime function threshold', function () {
  enforceFunctionCoverage = true;
});

Then('the function gate rejects missing execution below its exact threshold', function () {
  const filename = path.join(projectRoot, 'test', 'fixtures', 'coverage-threshold.js');
  const { code, coverage } = instrumentCode(`
    function first() {}
    function second() {}
    function third() {}
    function missing() {}
    first(); second(); third();
  `, filename);
  const sandbox = {};
  vm.runInNewContext(code, sandbox);
  const map = createCoverageMap({ [filename]: coverage });
  map.merge(sandbox.__coverage__);
  const report = summarizeFunctions(map);
  assert.doesNotThrow(() => assertFunctionCoverage(report));
  assert.equal(report.uncovered, 1, 'passing the minimum must not erase uncovered functions');
  map.addFileCoverage(instrumentCode('function unloaded() {}',
    path.join(projectRoot, 'test', 'fixtures', 'below-threshold.js')).coverage);
  assert.throws(() => assertFunctionCoverage(summarizeFunctions(map)), /Minimum required: 75%.*2 functions were never executed/);
  assert.throws(() => assertFunctionCoverage({
    ...report, covered: 30000, total: 40001, uncovered: 10001, percent: 75,
  }), /Minimum required: 75%/, 'rounded display percentages must not let a below-threshold result pass');
  assert.throws(() => assertFunctionCoverage(summarizeFunctions(createCoverageMap({}))), /Minimum required: 75%/);
});

Then('runtime coverage distinguishes uncalled functions from executed callbacks and private methods', function () {
  const filename = path.join(projectRoot, 'test', 'fixtures', 'coverage-example.js');
  const { code, coverage } = instrumentCode(`
    class Example {
      #increment(value) { return value + 1; }
      run() { return [1, 2].map(value => this.#increment(value)); }
    }
    function neverCalled() { return 0; }
    globalThis.example = new Example();
  `, filename);
  const sandbox = {};
  vm.runInNewContext(code, sandbox);
  const loaded = createCoverageMap({ [filename]: coverage });
  loaded.merge(sandbox.__coverage__);
  assert.equal(summarizeFunctions(loaded).covered, 0, 'loading a module must not cover its functions');
  assert.deepEqual(Array.from(sandbox.example.run()), [2, 3]);
  const executed = createCoverageMap({ [filename]: coverage });
  executed.merge(sandbox.__coverage__);
  const report = summarizeFunctions(executed);
  assert.equal(report.total, 4);
  assert.equal(report.covered, 3);
  assert.equal(report.uncovered, 1);
  assert.ok(report.files[0].functions.some(fn => fn.name === '#increment' && fn.hits === 2));
  assert.deepEqual(report.files[0].functions.filter(fn => fn.hits === 0).map(fn => fn.name), ['neverCalled']);
  const secondRuntime = {};
  vm.runInNewContext(`${code}\nneverCalled();`, secondRuntime);
  executed.merge(secondRuntime.__coverage__);
  assert.equal(summarizeFunctions(executed).uncovered, 0, 'coverage must merge across isolated runtimes');
  const unloaded = path.join(projectRoot, 'test', 'fixtures', 'never-loaded.js');
  executed.addFileCoverage(instrumentCode('function unloaded() {}', unloaded).coverage);
  assert.equal(summarizeFunctions(executed).uncovered, 1, 'files that never execute must remain uncovered');
  assert.equal(isSourceModule(path.join(sourceRoot, 'plugins', 'example.js')), false);
  assert.equal(isSourceModule(path.join(projectRoot, 'node_modules', 'example.js')), false);
  assert.equal(isSourceModule(path.join(projectRoot, 'src-other', 'example.js')), false);
});

Then('instrumented functions preserve inheritance accessors generators and asynchronous results', async function () {
  const filename = path.join(projectRoot, 'test', 'fixtures', 'function-semantics.js');
  const { code, coverage } = instrumentCode(`
    class Parent {
      constructor(value) { this.value = value; }
      read() { return this.value; }
    }
    class Child extends Parent {
      #factor = 2;
      constructor(...args) { super(...args); }
      get total() { return super.read() * this.#factor; }
      set factor(value) { this.#factor = value; }
      async update() { await Promise.resolve(); return this.total; }
      *sequence() { yield this.total; }
    }
    function strict() { 'use strict'; return this === undefined; }
    function defaults(factory = () => 3) { return factory(); }
    globalThis.strictResult = strict();
    globalThis.child = new Child(defaults());
  `, filename);
  const sandbox = {};
  vm.runInNewContext(code, sandbox);
  assert.equal(sandbox.strictResult, true);
  assert.equal(sandbox.child.total, 6);
  sandbox.child.factor = 3;
  assert.equal(await sandbox.child.update(), 9);
  assert.deepEqual(Array.from(sandbox.child.sequence()), [9]);
  const result = createCoverageMap({ [filename]: coverage });
  result.merge(sandbox.__coverage__);
  assert.equal(summarizeFunctions(result).uncovered, 0);
});

Then('instrumented circular imports can call a function before its module initializes', async function () {
  const sources = {
    a: "import { result } from './b'; export function read() { return 42; } export { result };",
    b: "import { read } from './a'; export const result = read();",
  };
  const result = await build({
    entryPoints: ['a'], bundle: true, write: false, format: 'cjs',
    plugins: [{
      name: 'circular-coverage-fixture',
      setup(builder) {
        builder.onResolve({ filter: /^(a|\.\/[ab])$/ }, ({ path: name }) => ({
          path: name.replace('./', ''), namespace: 'coverage-fixture',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'coverage-fixture' }, ({ path: name }) => ({
          contents: instrumentCode(sources[name], path.join(projectRoot, 'test', 'fixtures', `${name}.js`)).code,
        }));
      },
    }],
  });
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(result.outputFiles[0].text, sandbox);
  assert.equal(sandbox.module.exports.result, 42);
  assert.equal(summarizeFunctions(createCoverageMap(sandbox.__coverage__)).uncovered, 0);
});

Then('loading another classic script does not redirect existing function counters', function () {
  const first = path.join(projectRoot, 'test', 'fixtures', 'first-script.js');
  const second = path.join(projectRoot, 'test', 'fixtures', 'second-script.js');
  const context = vm.createContext({});
  vm.runInContext(instrumentCode('globalThis.first = function first() { return [1, 2].map(value => value * 2); }; first();', first).code, context);
  vm.runInContext(instrumentCode('function second() { return 7; } second();', second).code, context);
  assert.deepEqual(Array.from(context.first()), [2, 4]);
  const coverage = createCoverageMap(context.__coverage__);
  assert.deepEqual(Object.values(coverage.fileCoverageFor(first).f), [2, 4]);
  assert.deepEqual(Object.values(coverage.fileCoverageFor(second).f), [1]);
  assert.equal(summarizeFunctions(coverage).total, 3);
  assert.equal(summarizeFunctions(coverage).uncovered, 0);
});

function listFeatureFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFeatureFiles(file);
    }
    return entry.isFile() && path.extname(file) === '.feature' ? [file] : [];
  });
}

async function validateVueFile(filename, source) {
  const descriptor = parse({ source, filename });
  const parseErrors = descriptor.errors.filter(error => !unsupportedVoidTagError.test(error.message || String(error)));
  assert.deepEqual(parseErrors, [], parseErrors.map(error => error.message || String(error)).join('\n'));
  assert.ok(!descriptor.scriptSetup, 'script setup is unsupported by the build');

  if (descriptor.script) {
    await transform(descriptor.script.content, { loader: 'js', sourcefile: filename });
  }

  if (descriptor.template) {
    const template = compileTemplate({
      source: descriptor.template.content,
      filename,
      id: 'src-coverage',
      scoped: descriptor.styles.some(style => style.scoped),
      compilerOptions: { outputSourceRange: true }
    });
    assert.deepEqual(template.errors, [], template.errors.map(error => error.msg || String(error)).join('\n'));
  }

  for (const style of descriptor.styles) {
    assert.ok(!style.lang && !style.src && !style.module, 'preprocessed, external, and module styles are unsupported by the build');
    const result = compileStyle({
      source: style.content,
      filename,
      id: 'data-v-src-coverage',
      scoped: style.scoped
    });
    assert.deepEqual(result.errors, [], result.errors.map(error => error.msg || String(error)).join('\n'));
  }
}

async function validateSourceFile(filename) {
  const extension = path.extname(filename).toLowerCase();
  const source = ['.png', '.woff2'].includes(extension) ? null : fs.readFileSync(filename, 'utf8');

  switch (extension) {
    case '.js':
      await transform(source, { loader: 'js', sourcefile: filename });
      break;
    case '.vue':
      await validateVueFile(filename, source);
      break;
    case '.css':
      await transform(source, { loader: 'css', sourcefile: filename });
      break;
    case '.svg':
      assert.match(source, /<svg\b/i, 'missing SVG root element');
      assert.match(source, /<\/svg>\s*$/i, 'missing closing SVG root element');
      break;
    case '.png':
      assert.ok(fs.readFileSync(filename).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'invalid PNG signature');
      break;
    case '.woff2':
      assert.equal(fs.readFileSync(filename).toString('ascii', 0, 4), 'wOF2', 'invalid WOFF2 signature');
      break;
    case '.md':
      assert.ok(source.trim(), 'empty Markdown file');
      break;
    default:
      throw new Error(`No source-file check is defined for ${extension || '[no extension]'}`);
  }
}

When('I validate all source files except plugins', async function () {
  this.sourceFiles = listSourceFiles(sourceRoot);
  this.checkedSourceFiles = [];
  this.sourceFileErrors = [];

  for (const filename of this.sourceFiles) {
    try {
      await validateSourceFile(filename);
      this.checkedSourceFiles.push(path.relative(sourceRoot, filename));
    } catch (error) {
      this.sourceFileErrors.push(`${path.relative(sourceRoot, filename)}: ${error.message}`);
    }
  }
});

Then('each discovered source file passes its check', function () {
  assert.ok(this.sourceFiles.length > 0, 'no source files were discovered');
  assert.deepEqual(this.sourceFileErrors, [], this.sourceFileErrors.join('\n'));
  assert.equal(this.checkedSourceFiles.length, this.sourceFiles.length);
});

When('I compare source files with Cucumber coverage tags', function () {
  const sourceFiles = listSourceFiles(sourceRoot)
    .map(filename => path.relative(sourceRoot, filename).split(path.sep).join('/'));
  const { coveredFiles, invalidTags } = getSourceCoverageTags(listFeatureFiles(featureRoot), projectRoot, sourceRoot);
  this.invalidCoverageTags = invalidTags;
  this.uncoveredSourceFiles = sourceFiles.filter(filename => !coveredFiles.has(filename));
});

Then('no source files are missing a Cucumber test', function () {
  assert.deepEqual(this.invalidCoverageTags, [], this.invalidCoverageTags.join('\n'));
  assert.equal(
    this.uncoveredSourceFiles.length,
    0,
    `Missing Cucumber scenarios for ${this.uncoveredSourceFiles.length} source files:\n${this.uncoveredSourceFiles.join('\n')}`
  );
});

Then('coverage tags in comments and descriptions do not count as scenarios', function () {
  const source = [
    'Feature: Coverage parser',
    '  Mentioning @covers:src/not-covered.js here does not cover it.',
    '  # @covers:src/also-not-covered.js',
    '  @covers:src/first.js',
    '  @covers:src/second.js',
    '  Scenario: Real behavior',
    '    Then something observable happens',
  ].join('\n');
  assert.deepEqual(getCoverageTargets(source, 'fixture.feature'), ['src/first.js', 'src/second.js']);
  assert.throws(() => getCoverageTargets(
    'Feature: Invalid coverage\n  @covers:src/empty.js\n  Scenario: No assertions\n',
    'empty.feature'
  ), /coverage scenario must contain steps/);
});
