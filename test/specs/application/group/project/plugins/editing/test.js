export default function({config={}, testConfig={}}){
  const test = require('editing/test/specs/index.specs');
  test({
    config,
    testConfig
  })
}