import keys from 'config/keys';
import i18nresources from './i18n';
const apptitle = "G3W Client";
const supportedLng = ['en', 'it'];

export const plugins = {};

export const tools = {
  tools:  []
};

// get message from internationalization
export const _i18n = {
  resources: i18nresources
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

export const secrets = {
  keys
};

export default {
  apptitle,
  secrets,
  client,
  server,
  plugins,
  supportedLng,
  tools,
  _i18n
};

