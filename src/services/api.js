/**
 * @file
 * @since v3.6
 */

import G3WObject      from 'g3w-object';
import { $promisify } from 'utils/promisify';
import { XHR }        from 'utils/XHR';

let howManyAreLoading = 0;

// Class Api Service
export default new (class ApiService extends G3WObject {
  constructor(opts = {}) {
    super(opts);

  }

  _incrementLoaders() {
    if (0 === howManyAreLoading) { this.emit('apiquerystart') }
    howManyAreLoading += 1;
  };

  _decrementLoaders() {
    howManyAreLoading -= 1;
    if (0 === howManyAreLoading) { this.emit('apiqueryend') }
  };

  get(api, options) {
    const apiEndPoint = window.initConfig.urls.apiEndpoints[api];
    if (apiEndPoint) {
      const url = `${window.initConfig.urls.api}/${apiEndPoint}${options.request ? `/${options.request}` : '' }`;
      this.emit(`${api}querystart`);
      this._incrementLoaders();
      return $promisify(XHR.get({ url , params: (options.params || {}) }))
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
      return $promisify(Promise.reject());
    }
  };
});