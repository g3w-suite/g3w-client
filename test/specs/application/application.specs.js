import TestConfig from '../../config/whattest';
import Service from './service';
import GroupTest from './group/test'
const groupTestConfig = {};

before(async function() {
  this.timeout(0);
  //getallgroupsids
  const groupIds = Object.keys(TestConfig.groups).map(groupId => groupId.toLowerCase().replace(/ /g, '_'));
  const groupsProjects = [];
  let applicationConfig;
  for (const groupId of groupIds) {
    const groupConfig = TestConfig.groups[groupId];
    const { lng, projects, plugins } = groupConfig;
    const urls = Service.setUrls({
      groupId,
      lng
    })
    const csrftoken = await Service.Authentication({
      lng
    });
    for (const projectConfig of projects) {
      const {gid} = projectConfig;
      const [type, id] = gid.split(':');
      const url = `${urls.initconfig}${type}/${id}`;
      const applicationConfig = await Service.getProjetsRegistry(url);
      const project = await Service.getProject(gid);
      GroupTest({
        groupId,
        projectConfig,
        project,
        plugins,
        applicationConfig
      })
    }
  }
})

it('all groups hook', function() {
  //neede to run async before
})







