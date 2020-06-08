const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const DataProvider = require('core/layers/providers/provider');

function KMLDataProvider(options = {}) {
  base(this, options);
  this._name = 'kml';
}

inherit(KMLDataProvider, DataProvider);

const proto = KMLDataProvider.prototype;

proto.getData = function() {
  const d = $.Deferred();
  return d.promise();
};


module.exports = KMLDataProvider;
