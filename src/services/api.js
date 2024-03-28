/**
 * @file
 * @since v3.6
 */

const { base, inherit, reject } = require('utils');
const G3WObject                 = require('core/g3wobject');

// Class Api Service
function ApiService() {
  this._config  = null;
  this._baseUrl = null;
  this.init = function(config = {}) {
    const d            = $.Deferred();
    this._config       = config;
    // get url from base api of application config
    this._baseUrl      = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
    d.resolve();
    return d.promise();
  };
  let howManyAreLoading = 0;
  this._incrementLoaders = function() {
    if (0 === howManyAreLoading) { this.emit('apiquerystart') }
    howManyAreLoading += 1;
  };

  this._decrementLoaders = function() {
    howManyAreLoading -= 1;
    if (0 === howManyAreLoading) { this.emit('apiqueryend') }
  };

  this.get = function(api, options) {
    const apiEndPoint = this._apiEndpoints[api];
    if (apiEndPoint) {
      const url = `${this._baseUrl}/${apiEndPoint}${options.request ? `/${options.request}` : '' }`;
      this.emit(`${api}querystart`);
      this._incrementLoaders();
      return $.get(url, (options.params || {}))
      .done(response => {
        this.emit(`${api}queryend`, response);
        return response;
      })
      .fail(e => {
        this.emit(`${api}queryfail`, e);
        return e;
      })
      .always(() => this._decrementLoaders());
    } else {
      return reject();
    }
  };
  base(this);
}

inherit(ApiService, G3WObject);

export default new ApiService();