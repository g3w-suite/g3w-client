/**
 * @file
 * @since v3.6
 */

import G3WObject from 'core/g3wobject';

const { reject } = require('utils');

class ApiService extends G3WObject {

  constructor() {
    super();
    this._config             = null;
    this._baseUrl            = null;
    this.__howManyAreLoading = 0;
  }

  init(config = {}) {
    const d = $.Deferred();
    this._config       = config;
    // prende l'url base delle api dal config dell'applicazione
    this._baseUrl      = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
    d.resolve();
    return d.promise();
  }

  _incrementLoaders() {
    if (0 === this.__howManyAreLoading) {
      this.emit('apiquerystart');
    }
    this.__howManyAreLoading++;
  };

  _decrementLoaders() {
    this.__howManyAreLoading--;
    if (0 === this.__howManyAreLoading) {
      this.emit('apiqueryend');
    } 
  }

  get(api, options) {

    if (!this._apiEndpoints[api]) {
      return reject();
    }

    this.emit(api + 'querystart');

    this._incrementLoaders();

    return $
      .get(
        this._baseUrl + '/' + this._apiEndpoints[api] + (options.request ? '/' + options.request : ''),
        options.params || {}
      )
      .done(response => { this.emit(api + 'queryend', response); return response; })
      .fail(error    => { this.emit(api + 'queryfail', error);   return error;    })
      .always(()     => this._decrementLoaders());
  }

}

export default new ApiService();