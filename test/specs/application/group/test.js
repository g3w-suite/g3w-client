import TestProject from './project/test'
export default function TestProjects({applicationConfig, groupId, projectConfig, plugins, project}) {
  const {mapcontrols} = applicationConfig;
  describe(`#Group[${groupId}]`, function(){
    TestProject({
      config: projectConfig,
      plugins,
      project,
      mapcontrols
    })
  })
}