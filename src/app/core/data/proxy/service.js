import BaseService from 'core/data/service';
import ApplicationService from 'core/applicationservice';
import utils from 'core/utils/utils';

class ProxyService extends BaseService {
  constructor() {
    super();
  }

  /**
   *
   * @param data: Object conitans data to pass to proxy
   * @returns {Promise<{data: string, response: *}>}
   */
  async wms({
    url, method = 'GET', params = {}, headers = {},
  } = {}) {
    const { XHR } = utils;
    const proxyUrl = `${ApplicationService.getProxyUrl()}`;
    if (method === 'GET') {
      url = new URL(url);
      Object.keys(params).forEach((param) => url.searchParams.set(param, params[param]));
      url = url.toString();
    }
    try {
      const data = JSON.stringify({
        url,
        params,
        headers,
        method,
      });
      const response = await XHR.post({
        url: proxyUrl,
        contentType: 'application/json',
        data,
      });
      return {
        response,
        data,
      };
    } catch (err) {

    }
  }

  /**
   * Generic proxy data function
   * @param params
   */
  data(params = {}) {}
}

export default new ProxyService();
