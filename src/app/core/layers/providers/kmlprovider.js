const { inherit, base } = require('core/utils/utils');
const DataProvider = require('core/layers/providers/provider');

function KMLDataProvider(options = {}) {
  base(this, options);
  this._name = 'kml';
}

inherit(KMLDataProvider, DataProvider);

const proto = KMLDataProvider.prototype;

proto.getData = function() {
  return new Promise((resolve, reject) => {})
};

module.exports = KMLDataProvider;
