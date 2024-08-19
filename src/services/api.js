/**
 * @file
 * @since v3.6
 */
const { reject }                = require('utils');
const G3WObject                 = require('core/g3wobject');

let howManyAreLoading = 0;

// Class Api Service
export default new (class ApiService extends G3WObject {
  constructor(opts = {}) {
    super(opts);
    this._baseUrl = null;

  }
  init(config = {}) {
    const d            = $.Deferred();
    // get url from base api of application config
    this._baseUrl      = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
    d.resolve();
    return d.promise();
  };

  _incrementLoaders() {
    if (0 === howManyAreLoading) { this.emit('apiquerystart') }
    howManyAreLoading += 1;
  };

  _decrementLoaders() {
    howManyAreLoading -= 1;
    if (0 === howManyAreLoading) { this.emit('apiqueryend') }
  };

  get(api, options) {
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
          console.warn(e);
          this.emit(`${api}queryfail`, e);
          return e;
        })
        .always(() => this._decrementLoaders());
    } else {
      return reject();
    }
  };
});