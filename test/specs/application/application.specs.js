import TestConfig from '../../config/whattest';
import Service from './service';
import TestGroup from './group/test'
const groupIds = Object.keys(TestConfig.groups).map(groupId => groupId.toLowerCase().replace(/ /g, '_'));

describe('#Test all groups of application', function(){
  const originaleGroupIds = Object.keys(TestConfig.groups);
  groupIds.forEach((groupId, index) => {
    const testConfig = TestConfig.groups[originaleGroupIds[index]];
    TestGroup({
      groupId,
      testConfig
    })
  })
})








