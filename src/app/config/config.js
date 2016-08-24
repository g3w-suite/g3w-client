var apptitle = "G3W Client";

var plugins = {
};

var tools = {
  tools:  []
};

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
    initconfig:  '/api/initconfig',
    config:  '/api/config',
    staticurl:  '',
  }
};

/*var templates =  {
  app:  require('../templates/app.html'),
  sidebar:  require('../templates/sidebar.html'),
  floatbar:  require('../templates/floatbar.html'),
};*/

module.exports = {
  apptitle: apptitle,
  client: client,
  server: server,
  plugins:  plugins,
  tools:  tools,
  i18n: i18n
};
