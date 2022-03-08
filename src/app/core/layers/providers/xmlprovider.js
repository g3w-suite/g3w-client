const {inherit, base} = require('core/utils/utils');
const DataProvider = require('core/layers/providers/provider');

function XMLDataProvider(options={}) {
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
