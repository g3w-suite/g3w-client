const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const cucumberRequire = createRequire(require.resolve('@cucumber/cucumber'));
const { Parser, AstBuilder, GherkinClassicTokenMatcher } = cucumberRequire('@cucumber/gherkin');
const { IdGenerator } = cucumberRequire('@cucumber/messages');

function listSourceFiles(sourceRoot, directory = sourceRoot) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (directory === sourceRoot && entry.name === 'plugins') {
      return [];
    }
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(sourceRoot, file);
    }
    return entry.isFile() ? [file] : [];
  });
}

function getCoverageTargets(source, uri) {
  const parser = new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher());
  const document = parser.parse(source);
  const targets = [];

  function visit(children) {
    for (const child of children) {
      if (child.rule) {
        visit(child.rule.children);
      }
      if (child.scenario) {
        const scenario = child.scenario;
        const tags = scenario.tags.filter(tag => tag.name.startsWith('@covers:'));
        if (tags.length && !scenario.steps.length) {
          throw new Error(`${uri}:${scenario.location.line}: a coverage scenario must contain steps`);
        }
        for (const tag of tags) {
          targets.push(tag.name.slice('@covers:'.length));
        }
      }
    }
  }

  visit(document.feature?.children || []);
  return targets;
}

function getSourceCoverageTags(featureFiles, projectRoot, sourceRoot) {
  const coveredFiles = new Set();
  const invalidTags = [];
  for (const featureFile of featureFiles) {
    const uri = path.relative(projectRoot, featureFile);
    for (const target of getCoverageTargets(fs.readFileSync(featureFile, 'utf8'), uri)) {
      const absoluteTarget = path.resolve(projectRoot, target);
      const relativeTarget = path.relative(sourceRoot, absoluteTarget);
      if (
        !target.startsWith('src/') ||
        !relativeTarget ||
        relativeTarget === '..' ||
        relativeTarget.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativeTarget) ||
        relativeTarget === 'plugins' ||
        relativeTarget.startsWith(`plugins${path.sep}`) ||
        !fs.existsSync(absoluteTarget) ||
        !fs.statSync(absoluteTarget).isFile()
      ) {
        invalidTags.push(`${uri}: invalid @covers target ${target}`);
      } else {
        coveredFiles.add(relativeTarget.split(path.sep).join('/'));
      }
    }
  }
  return { coveredFiles, invalidTags };
}

module.exports = { getCoverageTargets, getSourceCoverageTags, listSourceFiles };
