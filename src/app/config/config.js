const apptitle = "G3W Client";

const plugins = {
};

const tools = {
  tools:  []
};

// get message from internalization
const i18n = {
  resources: require('./locales/app.js')
};

const client = {
  debug:  true,
  local:  false
};

const server = {
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
