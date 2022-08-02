// TODO: check if this still useful nowdays (IE 11 ?)
// add babel runtime support for compiled/transpiled async functions
import "regenerator-runtime";
//
const ApplicationService = require('core/applicationservice');
const ApplicationTemplate = require('gui/app/index');

/**
 * Expose "g3wsdk" variable globally
 * 
 * used by plugins to load sdk class and instances
 */
window.g3wsdk = require('api');

/**
 * EXPERIMENTAL: not yet implemented
 * 
 * @see https://github.com/g3w-suite/g3w-client/issues/71
 * @see https://github.com/g3w-suite/g3w-client/issues/46
 */
// window.g3w = window.g3wsdk;

/**
 * Application starting point
 * 
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
ApplicationService.init()
  .then(() => {
    const app = new ApplicationTemplate({ ApplicationService });
    app.on('ready', () =>  ApplicationService.postBootstrap());
    app.init();
  })
  .catch(({ error=null, language }) => {
    if (error) {
      if (error.responseJSON && error.responseJSON.error.data) error = error.responseJSON.error.data;
      else if (error.statusText) error = error.statusText;
    }
    ApplicationTemplate.fail({
      language,
      error
    });
  });