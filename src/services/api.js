/**
 * @file
 * @since v3.6
 */

const { base, inherit, reject, XHR } = require('utils');
const G3WObject = require('core/g3wobject');

// Class Api Service
function ApiService(){
  this._config = null;
  this._baseUrl = null;
  this.init = function(config={}) {
    return new Promise((resolve, reject) => {
      this._config = config;
      // prende l'url base delle api dal config dell'applicazione
      this._baseUrl = config.urls.api;
      this._apiEndpoints = config.urls.apiEndpoints;
      resolve();
    })
  };
  let howManyAreLoading = 0;
  this._incrementLoaders = function(){
    howManyAreLoading === 0 && this.emit('apiquerystart');
    howManyAreLoading += 1;
  };

  this._decrementLoaders = function(){
    howManyAreLoading -= 1;
    howManyAreLoading === 0 && this.emit('apiqueryend');
  };
  this.get = function(api, options) {
    const apiEndPoint = this._apiEndpoints[api];
    if (apiEndPoint) {
      let completeUrl = this._baseUrl + '/' + apiEndPoint;
      if (options.request) completeUrl = completeUrl + '/' + options.request;
      const params = options.params || {};
      this.emit(api+'querystart');
      this._incrementLoaders();
      return XHR.get({
        url:completeUrl,
        params
      })
      .then(response => {
        this.emit(api+'queryend',response);
        return response;
      })
      .catch(error => {
        this.emit(api+'queryfail', error);
        return error;
      })
      .finally(() => this._decrementLoaders());
    }
    else return reject();
  };
  base(this);
}

inherit(ApiService, G3WObject);

export default new ApiService();