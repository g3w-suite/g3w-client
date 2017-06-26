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
    baseurl: '/',
    ows:  'ows',
    api:  'api',
    initconfig:  'api/initconfig',
    config:  'api/config'
  }
};

module.exports = {
  apptitle: apptitle,
  client: client,
  server: server,
  plugins:  plugins,
  tools:  tools,
  i18n: i18n
};
