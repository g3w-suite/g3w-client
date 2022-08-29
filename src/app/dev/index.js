const {
  createProject = {},
    setCurrentProject = {},
    plugins = {},
    keys = {}
} = require('../../../config');
const ProjectsRegistry = require('core/project/projectsregistry');
const ApplicationService = require('core/applicationservice');
// const GUI = require('gui/gui');


// ApplicationService.once('ready', () => {});

ApplicationService.once('initconfig', () => {
  // sets "initConfig->group->plugins"
  Object.keys(plugins).forEach((plugin) => {
    // TODO: make use of a recursive merge utility function ?
    window.initConfig.group.plugins[plugin] = window.initConfig.group.plugins[plugin] ? {
      ...window.initConfig.group.plugins[plugin],
      ...plugins[plugin],
    } : plugins[plugin];
  });
  // sets "initConfig->group->vendorkeys"
  if (Object.keys(keys).length > 0) {
    window.initConfig.group.vendorkeys = window.initConfig.group.vendorkeys || {};
    Object.keys(keys).forEach((key) => { window.initConfig.group.vendorkeys[key] = keys[key]; });
    ApplicationService.setVendorKeys(keys);
  }
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