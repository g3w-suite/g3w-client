/**
 * @file shims legacy variables to ensure backward compatibily with old G3W-CLIENT plugins (eg. window variables)
 * @since v3.8
 */

import * as VueColor from 'vue-color';

const initConfig = window.initConfig;

// convert relative base URLs to absolute (eg. '/' → 'http://localhost:8080/')
if (initConfig.baseurl) {
  try {
    new URL(initConfig.baseurl);
  } catch (error) {
    initConfig.baseurl = (new URL(initConfig.baseurl, window.location)).toString();
  }
}

// BACKCOMP v3.x (initConfig → initConfig.group)
initConfig.group = Object.assign(initConfig.group || {}, new Proxy(Object.fromEntries(Object.keys(initConfig).filter(key => ![
  "i18n",
  "staticurl",
  "client",
  "mediaurl",
  "user",
  "baseurl",
  "vectorurl",
  "proxyurl",
  "rasterurl",
  "interfaceowsurl",
  "main_map_title",
  'main_map_title',
  "g3wsuite_logo_img",
  "credits",
  "version",
  "group",
  "frontendurl",
].includes(key)).map(key => ([key, initConfig[key]]))), {
  get(target, prop, receiver) { console.warn(`[G3W-CLIENT] initConfig.group.${prop.toString()} is deprecated`); return Reflect.get(...arguments); }
}));

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use ESM imports from 'vue-color' instead
 */
window.VueColor = VueColor;

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use require('vue-cookie') instead of window.VueCookie
 */
window.VueCookie = require('vue-cookie');