/**
 * @file
 * @since v3.6
 */

import ApplicationService from 'services/application';
import { BaseService }    from 'core/data/service';

const { XHR } = require('utils');

class ProxyService extends BaseService {

  /**
   * @param data: Object conitans data to pass to proxy
   * 
   * @returns {Promise<{data: string, response: *}>}
   */
  async wms({
    url,
    method  = 'GET',
    params  = {},
    headers = {},
  } = {}) {
    if (method === 'GET') {
      url = new URL(url);
      Object.keys(params).forEach(param => url.searchParams.set(param, params[param]));
      url = url.toString();
    }
    try {
      const data = JSON.stringify({ url, params, headers, method });
      return {
        response: await XHR.post({
          url:         `${ApplicationService.getProxyUrl()}`,
          contentType: 'application/json',
          data,
        }),
        data,
      };
    } catch(e) {
      console.warn(e);
      return;
    }
  };

  /**
   * Generic proxy data function
   * 
   * @param params
   */
  data(params = {}) { }

}

export default new ProxyService();