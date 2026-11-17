const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { compileStyle, compileTemplate, parse } = require('@vue/compiler-sfc');
const { transform } = require('esbuild');
const { Then, When } = require('@cucumber/cucumber');

const projectRoot = path.resolve(__dirname, '../..');
const sourceRoot = path.join(projectRoot, 'src');
const featureRoot = path.join(projectRoot, 'test', 'features');
const unsupportedVoidTagError = /^tag <(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b.*has no matching end tag\.$/;

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (directory === sourceRoot && entry.name === 'plugins') {
      return [];
    }
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(file);
    }
    return entry.isFile() ? [file] : [];
  });
}

function listFeatureFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFeatureFiles(file);
    }
    return entry.isFile() && path.extname(file) === '.feature' ? [file] : [];
  });
}

function getSourceCoverageTags() {
  const coveredFiles = new Set();
  const invalidTags = [];

  for (const featureFile of listFeatureFiles(featureRoot)) {
    const lines = fs.readFileSync(featureFile, 'utf8').split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      for (const [, target] of lines[index].matchAll(/@covers:([^\s]+)/g)) {
        let nextLine = index + 1;
        while (nextLine < lines.length && !lines[nextLine].trim()) {
          nextLine++;
        }
        if (!/^Scenario(?: Outline| Template)?:/.test((lines[nextLine] || '').trim())) {
          invalidTags.push(`${path.relative(projectRoot, featureFile)}: @covers must tag a scenario`);
          continue;
        }

        const absoluteTarget = path.resolve(projectRoot, target);
        const relativeTarget = path.relative(sourceRoot, absoluteTarget);
        if (
          !relativeTarget ||
          relativeTarget.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relativeTarget) ||
          relativeTarget === 'plugins' ||
          relativeTarget.startsWith(`plugins${path.sep}`) ||
          !fs.existsSync(absoluteTarget) ||
          !fs.statSync(absoluteTarget).isFile()
        ) {
          invalidTags.push(`${path.relative(projectRoot, featureFile)}: invalid @covers target ${target}`);
          continue;
        }

        coveredFiles.add(relativeTarget.split(path.sep).join('/'));
      }
    }
  }

  return { coveredFiles, invalidTags };
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
  const { coveredFiles, invalidTags } = getSourceCoverageTags();
  this.invalidCoverageTags = invalidTags;
  this.uncoveredSourceFiles = sourceFiles.filter(filename => !coveredFiles.has(filename));
});

Then('no source files are missing a Cucumber test', function () {
  assert.deepEqual(this.invalidCoverageTags, [], this.invalidCoverageTags.join('\n'));
  assert.deepEqual(
    this.uncoveredSourceFiles,
    [],
    `Missing Cucumber scenarios for ${this.uncoveredSourceFiles.length} source files:\n${this.uncoveredSourceFiles.join('\n')}`
  );
});
