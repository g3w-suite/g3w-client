// TODO: check if this still useful nowdays (IE 11 ?)
// add babel runtime support for compiled/transpiled async functions
import 'regenerator-runtime';
//
import ApplicationService from 'core/applicationservice';
import ApplicationTemplate from 'gui/app/index';
import g3wsdk from './api';

/**
 * Expose "g3wsdk" variable globally
 * 
 * used by plugins to load sdk class and instances
 */
window.g3wsdk = g3wsdk; 

/**
 * Application starting point
 * 
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
ApplicationService.init()
  .then(() => {
    const app = new ApplicationTemplate({ ApplicationService });
    app.on('ready', () => ApplicationService.postBootstrap());
    app.init();
  })
  .catch(({ error = null, language }) => {
    if (error) {
      error = (error.responseJSON && error.responseJSON.error.data) ?? error.statusText ?? null;
    }
    ApplicationTemplate.fail({
      language,
      error,
    });
  });