/**
 * @file
 * @since v3.6
 */

const { base, inherit, reject } = require('utils');
const G3WObject = require('core/g3wobject');

// Class Api Service
function ApiService(){
  this._config = null;
  this._baseUrl = null;
  this.init = function(config={}) {
    const d = $.Deferred();
    this._config = config;
    // prende l'url base delle api dal config dell'applicazione
    this._baseUrl = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
    d.resolve();
    return d.promise();
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
      return $.get(completeUrl,params)
      .done(response => {
        this.emit(api+'queryend',response);
        return response;
      })
      .fail(error => {
        this.emit(api+'queryfail', error);
        return error;
      })
      .always(() => this._decrementLoaders());
    }
    else return reject();
  };
  base(this);
}

inherit(ApiService, G3WObject);

export default new ApiService();