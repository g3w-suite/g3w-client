/**
 * @TODO consolidate configuration parameters in a single location
 * (eg. appConfig, ApplicationState, Constants, ...)
 */

import translations from '../locales';

const apptitle           = "G3W Client";
const supportedLanguages = ['en', 'it'];

export const plugins = {};

export const tools = { tools:  [] };

// get a message from internationalization
export const _i18n = { resources: translations };

export const client = {
  debug:  true,
  local:  false
};

export const server = {
  urls:  {
    baseurl:     '/',
    ows:         'ows',
    api:         'api',
    initconfig:  'api/initconfig',
    config:      'api/config'
  }
};

export const utils = {
  merge(type) {
    if (type) { console.log(type) }
  }
};

export default {
  apptitle,
  client,
  server,
  plugins,
  supportedLanguages,
  tools,
  _i18n,
  utils
};

