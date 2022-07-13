const appService = require('./app/service');
// return an object contains key plugin name  and related service
const pluginsServices = require('./plugins/index');

module.exports = {
  app: appService,
  ...pluginsServices,
};
