import keys from 'config/keys';
const apptitle = "G3W Client";

export const plugins = {};

export const tools = {
  tools:  []
};

// get message from internalization
export const _i18n = {
  resources: require('./i18n/index.js')
};

export const client = {
  debug:  true,
  local:  false
};

export const server = {
  urls:  {
    baseurl: '/',
    ows:  'ows',
    api:  'api',
    initconfig:  'api/initconfig',
    config:  'api/config'
  }
};

export const utils = {
  merge: function(type) {
    if (type) {
      console.log(CONFIG)
    }
  }
};

export const secrets = {
  keys
};

export default {
  apptitle,
  secrets,
  client,
  server,
  plugins,
  tools,
  _i18n,
  utils
};

