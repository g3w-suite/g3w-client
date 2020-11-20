import TestGroup from './group/test'

describe('#Test Group of application', async function(){
  const {groupId, testConfig} = __karma__.config.args[0];
  TestGroup({
    groupId,
    testConfig
  })
})








