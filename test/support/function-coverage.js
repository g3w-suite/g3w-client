const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { parse } = require('@vue/compiler-sfc');
const { transformSync, types: t } = require('@babel/core');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { listSourceFiles } = require('./source-coverage');

const projectRoot = path.resolve(__dirname, '../..');
const sourceRoot = path.join(projectRoot, 'src');
const instrumentedFiles = new Map();
const collectedCoverage = createCoverageMap({});

function isSourceModule(filename) {
  const relative = path.relative(sourceRoot, filename);
  return relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative) &&
    !relative.startsWith(`plugins${path.sep}`) &&
    ['.js', '.vue'].includes(path.extname(filename));
}

function instrumentCode(source, filename) {
  const coverage = { path: filename, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {} };
  let counter;
  const location = ({ start, end }) => ({
    start: { line: start.line, column: start.column },
    end: { line: end.line, column: end.column },
  });
  const { code } = transformSync(source, {
    filename,
    configFile: false,
    babelrc: false,
    sourceType: 'unambiguous',
    comments: false,
    plugins: [() => ({
      visitor: {
        Program: {
          enter(program) {
            counter = program.scope.generateUidIdentifier(`functionCoverage_${createHash('sha256').update(filename).digest('hex').slice(0, 16)}`);
          },
          exit(program) {
            const runtime = t.memberExpression(t.identifier('globalThis'), t.identifier('__coverage__'));
            const file = t.memberExpression(t.cloneNode(runtime), t.stringLiteral(filename), true);
            program.unshiftContainer('body', [
              t.functionDeclaration(t.cloneNode(counter), [], t.blockStatement([
                t.expressionStatement(t.assignmentExpression('??=', t.cloneNode(runtime), t.objectExpression([]))),
                t.returnStatement(t.assignmentExpression('??=', file, t.valueToNode(coverage))),
              ])),
              t.expressionStatement(t.callExpression(t.cloneNode(counter), [])),
            ]);
          },
        },
        Function(fn) {
          if (!fn.node.loc) return;
          const id = String(Object.keys(coverage.fnMap).length);
          const { node } = fn;
          const key = node.key;
          const name = node.id?.name ??
            (t.isPrivateName(key) ? `#${key.id.name}` : key?.name ?? key?.value) ??
            `(anonymous_${id})`;
          coverage.fnMap[id] = {
            name: String(name),
            decl: location(node.id?.loc ?? key?.loc ?? node.loc),
            loc: location(node.loc),
            line: node.loc.start.line,
          };
          coverage.f[id] = 0;
          fn.ensureBlock();
          fn.get('body').unshiftContainer('body', t.expressionStatement(t.updateExpression('++',
            t.memberExpression(t.memberExpression(t.callExpression(t.cloneNode(counter), []), t.identifier('f')), t.stringLiteral(id), true))));
        },
      },
    })],
  });
  return { code, coverage };
}

function instrumentSource(filename) {
  if (!isSourceModule(filename)) {
    throw new Error(`Cannot instrument a source file outside the coverage scope: ${filename}`);
  }
  if (!instrumentedFiles.has(filename)) {
    let source = fs.readFileSync(filename, 'utf8');
    if (filename.endsWith('.vue')) {
      const { script } = parse({ source, filename });
      source = script ? source.slice(0, script.start).replace(/[^\r\n]/g, ' ') + script.content : '';
    }
    instrumentedFiles.set(filename, instrumentCode(source, filename));
  }
  return instrumentedFiles.get(filename).code;
}

const coveragePlugin = {
  name: 'source-function-coverage',
  setup(builder) {
    builder.onLoad({ filter: /\.js$/ }, ({ path: filename }) => {
      if (isSourceModule(filename)) {
        return { contents: instrumentSource(filename), loader: 'js' };
      }
    });
  },
};

function collectCoverage(coverage) {
  if (!coverage || typeof coverage !== 'object') {
    throw new Error('The instrumented runtime did not expose function coverage');
  }
  for (const [filename, fileCoverage] of Object.entries(coverage)) {
    if (isSourceModule(filename)) {
      collectedCoverage.merge({ [filename]: fileCoverage });
    }
  }
}

async function closeCoreContext(context) {
  try {
    for (const page of context.pages()) {
      collectCoverage(await page.evaluate(() => globalThis.__coverage__));
    }
  } finally {
    await context.close();
  }
}

function summarizeFunctions(coverage) {
  const totals = coverage.getCoverageSummary().functions;
  return {
    total: totals.total,
    covered: totals.covered,
    uncovered: totals.total - totals.covered,
    percent: totals.pct,
    files: coverage.files().sort().map(filename => {
      const file = coverage.fileCoverageFor(filename);
      return {
        file: path.relative(projectRoot, filename).split(path.sep).join('/'),
        functions: Object.entries(file.fnMap).map(([id, fn]) => ({
          name: fn.name,
          line: fn.loc.start.line,
          column: fn.loc.start.column + 1,
          hits: file.f[id],
        })),
      };
    }),
  };
}

function writeFunctionCoverageReport() {
  const coverage = createCoverageMap({});
  for (const filename of listSourceFiles(sourceRoot).filter(isSourceModule)) {
    instrumentSource(filename);
    coverage.addFileCoverage(instrumentedFiles.get(filename).coverage);
  }
  coverage.merge(collectedCoverage);
  for (const [filename, fileCoverage] of Object.entries(globalThis.__coverage__ || {})) {
    if (isSourceModule(filename)) {
      coverage.merge({ [filename]: fileCoverage });
    }
  }
  const report = summarizeFunctions(coverage);
  const reportPath = path.join(projectRoot, 'test', 'coverage', 'functions.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, reportPath };
}

module.exports = {
  closeCoreContext, collectCoverage, coveragePlugin, instrumentCode,
  instrumentSource, isSourceModule, summarizeFunctions, writeFunctionCoverageReport,
};
