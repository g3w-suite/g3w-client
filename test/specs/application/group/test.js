import Service from '../service';
import TestProject from './project/test'
export default function TestGroup({groupId, testConfig={}}={}) {
  describe(`#Group[${groupId}]`, function(){
    const { lng, projects } = testConfig;
    const startGroupProject = projects[0];
    let mapcontrols, plugins;
    this.timeout(0);
    before(async ()=>{
      const urls = Service.setUrls({
        groupId,
        lng
      })
      const csrftoken = await Service.Authentication({
        lng
      });
      const [type, id] = startGroupProject.gid.split(':');
      const url = `${urls.initconfig}${type}/${id}`;
      const applicationConfig = await Service.getProjetsRegistry(url);
      mapcontrols = applicationConfig.mapcontrols;
      plugins = applicationConfig.plugins;
      Service.setPluginsConfig(plugins);
    });

    projects.forEach(projectTestConfig => {
      it('project of group', () => {
        TestProject({
          testConfig: projectTestConfig,
          plugins,
          mapcontrols
        })
      })
    })

  })
}