import G3WObject from 'core/g3wobject';
import geoutils from 'core/utils/geo';
import utils from 'core/utils/utils';
import ResponseParser from 'core/parsers/response/parser';

class Provider extends G3WObject {
  constructor(options = {}) {
    super();
    this._isReady = false;
    this._name = 'provider';
    this._layer = options.layer;
    this._hasFieldsStartWithNotPermittedKey;
  }

  async getData() {}

  getLayer() {
    return this._layer;
  }

  setLayer(layer) {
    this._layer = layer;
  }

  getFeatures() {
    console.log('overwriteby single provider');
  }

  query() {
    console.log('overwriteby single provider');
  }

  setReady(bool) {
    this._isReady = bool;
  }

  isReady() {
    return this._isReady;
  }

  error() {}

  isValid() {
    console.log('overwriteby single provider');
  }

  getName() {
    return this._name;
  }

  // Method to transform xml from server to present to queryresult component
  handleQueryResponseFromServer(response, projections, layers = [this._layer], wms = true) {
    return geoutils.handleQueryResponse({
      response,
      projections,
      layers,
      wms,
    });
  }

  getQueryResponseTimeoutKey({ layers = [this._layer], resolve, query } = []) {
    /**
     * set timeout of a query
     * @type {number}
     */
    return utils.getTimeoutPromise({
      resolve,
      data: {
        data: ResponseParser.utils.getTimeoutData(layers),
        query,
      },
    });
  }
}

export default Provider;
