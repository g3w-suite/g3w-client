const baseConfig = require('./karma.base.config');
// Karma configuration
// Generated on Thu Dec 21 2017 14:20:12 GMT+0100 (CET)
module.exports = function(config) {
  const configDev = {
    ...baseConfig,
    logLevel: config.LOG_INFO,
  }
  config.set(configDev)
};
