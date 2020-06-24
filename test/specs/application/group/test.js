import TestProject from './project/test'
export default function TestProjects({applicationConfig, groupId, projectConfig, plugins, project}) {
  const {mapcontrols, search} = applicationConfig;
  describe(`#Group[${groupId}]`, function(){
    describe('#project', function() {
      TestProject({
        config: projectConfig,
        plugins,
        project,
        mapcontrols
      })
    })
  })
}