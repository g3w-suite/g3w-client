const apptitle = "G3W Client";

const plugins = {
};

const tools = {
  tools:  []
};

// get message from internalization
const _i18n = {
  resources: require('./i18n/index.js')
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

const utils = {
  merge: function(type) {
    if (type) {
      console.log(CONFIG)
    }
  }
};

export default {
  apptitle,
  client,
  server,
  plugins,
  tools,
  _i18n,
  utils
};

