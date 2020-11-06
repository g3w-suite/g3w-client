import Service from '../service';
import TestProject from './project/test'
export default function TestGroup({groupId, testConfig={}}={}) {
  const { lng, projects, plugins } = testConfig;
  const startGroupProject = projects[0];
  describe(`#Group[${groupId}]`, function(){
    let mapcontrols;
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
      mapcontrols= applicationConfig.mapcontrols;
    })
    it('Projects', ()=>{
      projects.forEach(projectTestConfig => {
        TestProject({
          testConfig: projectTestConfig,
          plugins,
          mapcontrols,
        })
      })
    })

  })
}