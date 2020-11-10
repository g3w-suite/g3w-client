import Service from '../service';
import TestProject from './project/test'
export default function TestGroup({groupId, testConfig={}}={}) {
  const { lng, projects, plugins } = testConfig;
  const startGroupProject = projects[0];
  return new Promise((resolve, reject) => {
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
        mapcontrols = applicationConfig.mapcontrols;
      })
      it('Projects', ()=>{
        const promises = [];
        projects.forEach(projectTestConfig => {
          TestProject({
            testConfig: projectTestConfig,
            plugins,
            mapcontrols,
          })
        })
      })
      after(()=>{
        setTimeout(()=>{
          resolve()
        }, 2000)
      })
    })
  })
}