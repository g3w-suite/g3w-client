import DEVCONFIG from '../../config/dev';

const ProjectsRegistry = require('core/project/projectsregistry');
const ApplicationService = require('core/applicationservice');
const GUI = require('gui/gui');
// Handle ApplicationService on ready event
ApplicationService.once('ready', () => {});
// andle obtaininitConfig
ApplicationService.once('initconfig', () => {
  const { plugins = {} } = DEVCONFIG;
  Object.keys(plugins).forEach((plugin) => {
    window.initConfig.group.plugins[plugin] = window.initConfig.group.plugins[plugin] ? {
      ...window.initConfig.group.plugins[plugin],
      ...plugins[plugin],
    } : plugins[plugin];
  });
});

// Handle project configuration to insert custom element on project
ProjectsRegistry.onbefore('createProject', (projectConfig) => {
  const { createProject } = DEVCONFIG;
  createProject && createProject.before && createProject.before(projectConfig);
});

// Handle project configuration to insert custom element on project
ProjectsRegistry.onafter('createProject', (projectConfig) => {
  const { createProject } = DEVCONFIG;
  createProject && createProject.after && createProject.after(projectConfig);
});

ProjectsRegistry.onbefore('setCurrentProject', (project) => {
  const { setCurrentProject } = DEVCONFIG;
  setCurrentProject && setCurrentProject.before && setCurrentProject.before(project);
});

ProjectsRegistry.onafter('setCurrentProject', (project) => {
  const { setCurrentProject } = DEVCONFIG;
  setCurrentProject && setCurrentProject.after && setCurrentProject.after(project);
});

// Ready GUI
GUI.once('ready', () => {});
