import 'babel-polyfill';
const ApplicationService = require('core/applicationservice');
// Application instance. It manages the application template
const Application = require('gui/app/index');
// set the global enviromental variable g3wsdk. It used by plugins to load sdk class and instances
window.g3wsdk = require('api');

// application starting point
const bootstrap = function() {
  ApplicationService.init()
    .then(() => {
      //create the Application instance passing the template configuration
      // and the applicationService instance that is useful to work with project API
      const applicationTemplate = new Application({
        ApplicationService
      });
      // Listen ready event emit after build interface
      applicationTemplate.on('ready', () =>  {
        ApplicationService.postBootstrap()
      });
      //call initialize applicationTemplate method
      applicationTemplate.init();
    })
    .catch(({error=null, language}) => {
      if (error) {
        if (error.responseJSON && error.responseJSON.error.data) error = error.responseJSON.error.data;
        else if (error.statusText) error = error.statusText;
      }
      Application.fail({
        language,
        error
      });
    })
};

// run  bootstrap function
bootstrap();

