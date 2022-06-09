import DEVCONFIG from '../config/dev'
import ProjectsRegistry  from 'core/project/projectsregistry';
import ApplicationService  from 'core/applicationservice';
// import GUI  from 'gui/gui';

const {
  createProject = {},
  setCurrentProject = {},
  plugins = {}
} = DEVCONFIG;

// Handle ApplicationService on ready event
// ApplicationService.once('ready', function(){});

// Handle obtaininitConfig
ApplicationService.once('initconfig', () => {
  Object.keys(plugins).forEach(plugin =>{
    window.initConfig.group.plugins[plugin] = window.initConfig.group.plugins[plugin] ? {
        ...window.initConfig.group.plugins[plugin],
        ...plugins[plugin]
      } : plugins[plugin]
   })
});

// Handle project configuration to insert custom element on project
if (createProject.before) {
  ProjectsRegistry.onbefore('createProject', projectConfig => createProject.before(projectConfig));
}

// Handle project configuration to insert custom element on project
if (createProject.after) {
  ProjectsRegistry.onafter('createProject', projectConfig => createProject.after(projectConfig));
}

if (setCurrentProject.before) {
  ProjectsRegistry.onbefore('setCurrentProject', project => setCurrentProject.before(project));
}

if (setCurrentProject.after) {
  ProjectsRegistry.onafter('setCurrentProject', project => setCurrentProject.after(project));
}

//Ready GUI
// GUI.once('ready', function(){});

export default {}