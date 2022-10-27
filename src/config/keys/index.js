const devConfig = require('../../../config');

/**
 * DEPRECATED: this folder will be removed after v3.4 (use "/config.template.js" instead)
 */
export const GOOGLE_API_KEY = devConfig.google;
export const BING_API_KEY = devConfig.bing;
export default {
  GOOGLE_API_KEY,
  BING_API_KEY
}