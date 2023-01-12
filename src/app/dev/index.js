const {
  createProject = {},
  setCurrentProject = {},
  plugins = {},
  keys = {},
  devConfig = function() {}
} = require('../../../config');

const ApplicationService = g3wsdk.core.ApplicationService;
const ProjectsRegistry = g3wsdk.core.project.ProjectsRegistry;
const GUI = g3wsdk.gui.GUI;

ApplicationService.once('initconfig', () => {
  // sets "initConfig->group->plugins"
  Object.keys(plugins || {}).forEach((plugin) => {
    plugins[plugin].gid              = plugins[plugin].gid     || initConfig.group.initproject;
    plugins[plugin].baseUrl          = plugins[plugin].baseUrl || initConfig.staticurl;
    initConfig.group.plugins[plugin] = { ...(initConfig.group.plugins[plugin] || {}), ...plugins[plugin] };
  });
  // sets "initConfig->group->vendorkeys"
  Object.keys(keys || {}).forEach((key) => {
    initConfig.group.vendorkeys      = initConfig.group.vendorkeys || {};
    initConfig.group.vendorkeys[key] = keys[key];
  });
});

/** @deprecated */
if (createProject.before) {
  ProjectsRegistry.onbefore('createProject', (projectConfig) => createProject.before(projectConfig));
}

/** @deprecated */
if (createProject.after) {
  ProjectsRegistry.onafter('createProject', (projectConfig) => createProject.after(projectConfig));
}

/** @deprecated */
if (setCurrentProject.before) {
  ProjectsRegistry.onbefore('setCurrentProject', (project) => setCurrentProject.before(project));
}

/** @deprecated */
if (setCurrentProject.after) {
  ProjectsRegistry.onafter('setCurrentProject', (project) => setCurrentProject.after(project));
}

/** @TODO find a better way to visually distinguish production and development environments (ie. even for logged in users) */
//GUI.once('ready', () => { document.body.classList.replace('skin-yellow', 'skin-blue'); });

devConfig.call();