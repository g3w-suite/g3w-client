const { execFileSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const cucumberCLI = path.join(projectRoot, 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');

execFileSync(process.execPath, [
  cucumberCLI,
  '--config',
  'cucumber.mjs',
  ...process.argv.slice(2)
], {
  cwd: projectRoot,
  stdio: 'inherit'
});
