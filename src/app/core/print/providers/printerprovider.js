const { inherit, base } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function PrinterProvider() {
  base(this);
}

inherit(PrinterProvider, G3WObject);

const proto = PrinterProvider.prototype;

proto.print = function () {
  console.log('overwrite');
};

proto.getPrintUrl = function () {
  console.log('overwrite');
};

proto.print = function () {
  console.log('overwrite');
};

module.exports = PrinterProvider;
