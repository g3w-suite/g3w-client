const { base, inherit, getTimeoutPromise } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const { handleQueryResponse } = require('core/utils/geo');
const { utils: queryResponseUtils } = require('core/parsers/response/parser');

function Provider(options = {}) {
  this._isReady = false;
  this._name = 'provider';
  this._layer = options.layer;
  this._hasFieldsStartWithNotPermittedKey;
  base(this);
}

inherit(Provider, G3WObject);

const proto = Provider.prototype;

proto.getLayer = function () {
  return this._layer;
};

proto.setLayer = function (layer) {
  this._layer = layer;
};

proto.getFeatures = function () {
  console.log('overwriteby single provider');
};

proto.query = function () {
  console.log('overwriteby single provider');
};

proto.setReady = function (bool) {
  this._isReady = bool;
};

proto.isReady = function () {
  return this._isReady;
};

proto.error = function () {};

proto.isValid = function () {
  console.log('overwriteby single provider');
};

proto.getName = function () {
  return this._name;
};

// Method to transform xml from server to present to queryresult component
proto.handleQueryResponseFromServer = function (response, projections, layers = [this._layer], wms = true) {
  return handleQueryResponse({
    response,
    projections,
    layers,
    wms,
  });
};

proto.getQueryResponseTimeoutKey = function ({ layers = [this._layer], resolve, query } = []) {
  /**
   * set timeout of a query
   * @type {number}
   */
  return getTimeoutPromise({
    resolve,
    data: {
      data: queryResponseUtils.getTimeoutData(layers),
      query,
    },
  });
};

module.exports = Provider;
