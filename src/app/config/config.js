var plugins = {
};

var tools = {
  tools:  []
};

var mapcontrols = ['zoom','zoombox','query'];
//var mapcontrols = ['zoom','zoombox','zoomtoextent','query'];

var i18n = {
  resources: require('./locales/app.js')
};

var client =  {
  debug:  true,
  local:  false
};

var server =  {
    urls:  {
      ows:  '/ows',
      api:  '/api',
      config:  '/api/config',
      staticurl:  ''
    }
};

/*var templates =  {
  app:  require('../templates/app.html'),
  sidebar:  require('../templates/sidebar.html'),
  floatbar:  require('../templates/floatbar.html'),
};
*/

var templateConfig = require('template/template').template.TemplateConfiguration;
//inserisco l'elemento catalog
//templateConfig.catalog = require('sdk/sdk').gui.Catalog;
// vado qui eventualmente a customizzare la configurazione del template

module.exports = {
  client: client,
  server: server,
  template: templateConfig,
  plugins:  plugins,
  tools:  tools,
  map: {
    controls: mapcontrols
  },
  i18n: i18n,
};
