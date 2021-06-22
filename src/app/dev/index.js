import DEVCONFIG from '../../config/dev'
const ProjectsRegistry = require('core/project/projectsregistry');
const ApplicationService = require('core/applicationservice');
const GUI = require('gui/gui');
// Handle ApplicationService on ready event
ApplicationService.once('ready', function(){});
//andle obtaininitConfig
ApplicationService.once('initconfig', ()=> {
  const {plugins = {}} = DEVCONFIG;
  window.initConfig.group.plugins = {
    ...window.initConfig.group.plugins,
    ...plugins
  };
});
// Handle project configuration to insert custom element on project
ProjectsRegistry.oncebefore('setCurrentProject', project => {});

//Ready GUI
GUI.once('ready', function(){});
