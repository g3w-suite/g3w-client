const devConfig = require('app/../../config');

/**
 * DEPRECATED: this folder will be removed after v3.4 (use "/config.template.js" instead)
 */
export default {
  createProject: devConfig.createProject,
  setCurrentProject: devConfig.setCurrentProject,
  plugins: devConfig.plugins
};
