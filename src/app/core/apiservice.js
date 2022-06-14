import utils  from 'core/utils/utils';
import G3WObject from 'core/g3wobject';

// Class Api Service
class ApiService extends G3WObject {
  constructor() {
    super();
    this._config = null;
    this._baseUrl = null;
    this.howManyAreLoading = 0;
  };

  init(config={}) {
    const d = $.Deferred();
    this._config = config;
    this._baseUrl = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
    d.resolve();
    return d.promise();
  };

  _incrementLoaders() {
    this.howManyAreLoading === 0 && this.fire('apiquerystart');
    this.howManyAreLoading += 1;
  };

  _decrementLoaders() {
    this.howManyAreLoading -= 1;
    this.howManyAreLoading === 0 && this.fire('apiqueryend');
  };

  get(api, options) {
    const apiEndPoint = this._apiEndpoints[api];
    if (apiEndPoint) {
      let completeUrl = this._baseUrl + '/' + apiEndPoint;
      if (options.request) completeUrl = completeUrl + '/' + options.request;
      const params = options.params || {};
      this.fire(api+'querystart');
      this._incrementLoaders();
      return
      $.get(completeUrl,params)
        .done(response => {
          this.fire(api+'queryend',response);
          return response;
        }).fail(error => {
          this.fire(api+'queryfail', error);
          return error;
      }).always(() => this._decrementLoaders());
    }
    else return utils.reject();
  };
}

export default  new ApiService;
