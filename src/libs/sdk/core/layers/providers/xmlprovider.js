const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const DataProvider = require('core/layers/providers/provider');

function XMLDataProvider(options) {
  options = options || {};
  base(this);
  this._name = 'xml';
}

inherit(XMLDataProvider, DataProvider);

const proto = XMLDataProvider.prototype;

proto.getData = function() {
  const d = $.Deferred();
  return d.promise();
};

module.exports = XMLDataProvider;
