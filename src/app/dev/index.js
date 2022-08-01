const DEVCONFIG = require('app/../../config');
const ProjectsRegistry = require('core/project/projectsregistry');
const ApplicationService = require('core/applicationservice');
// const GUI = require('gui/gui');

const {
  createProject = {},
  setCurrentProject = {},
  plugins = {},
} = DEVCONFIG;

// ApplicationService.once('ready', () => {});

ApplicationService.once('initconfig', () => {
  // TODO: make use of a recursive merge utility function for: "initConfig->group->plugins"
  Object.keys(plugins).forEach((plugin) => {
    window.initConfig.group.plugins[plugin] = window.initConfig.group.plugins[plugin] ? {
      ...window.initConfig.group.plugins[plugin],
      ...plugins[plugin],
    } : plugins[plugin];
  });
});

if (createProject.before) {
  ProjectsRegistry.onbefore('createProject', (projectConfig) => createProject.before(projectConfig));
}

if (createProject.after) {
  ProjectsRegistry.onafter('createProject', (projectConfig) => createProject.after(projectConfig));
}

if (setCurrentProject.before) {
  ProjectsRegistry.onbefore('setCurrentProject', (project) => setCurrentProject.before(project));
}

if (setCurrentProject.after) {
  ProjectsRegistry.onafter('setCurrentProject', (project) => setCurrentProject.after(project));
}

// GUI.once('ready', () => {});