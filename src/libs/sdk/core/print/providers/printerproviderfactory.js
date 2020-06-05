const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const G3WObject = require('core/g3wobject');

const PrinterQGISProvider = require('./qgis/printerQGISProvider');

const Providers = {
  'QGIS': PrinterQGISProvider
};

function PrinterProviderFactory() {
  this.get = function(type = 'QGIS') {
    return new Providers[type];
  };
  base(this);
}

inherit(PrinterProviderFactory, G3WObject);

module.exports =  new PrinterProviderFactory;

