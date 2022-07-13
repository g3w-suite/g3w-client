const { inherit, base } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const PrinterProviderFactory = require('./providers/printerproviderfactory');

function PrintService(options = {}) {
  base(this);
  const type = options.type || 'QGIS';
  this.provider = PrinterProviderFactory.get(type);
}

inherit(PrintService, G3WObject);

const proto = PrintService.prototype;

proto.print = function (options = {}, method = 'GET') {
  return this.provider.print(options, method);
};

proto.printAtlas = function (options = {}, method = 'GET') {
  return this.provider.printAtlas(options, method);
};

module.exports = PrintService;
