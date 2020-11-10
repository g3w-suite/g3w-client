import TestConfig from '../../config/whattest';
import Service from './service';
import TestGroup from './group/test'
const groupIds = Object.keys(TestConfig.groups).map(groupId => groupId.toLowerCase().replace(/ /g, '_'));

describe('#Test all groups of application', async function(){
  const originaleGroupIds = Object.keys(TestConfig.groups);
  const groupIdsLenght = groupIds.length;
  for (let index = 0; index < groupIdsLenght; index++) {
    const testConfig = TestConfig.groups[originaleGroupIds[index]];
    const groupId = groupIds[index];
    await TestGroup({
      groupId,
      testConfig
    })
  }
})








