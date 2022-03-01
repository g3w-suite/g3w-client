const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');
const {XHR} = require('core/utils/utils');
function ProxyService(){
  base(this);
  /**
   *
   * @param data: Object conitans data to pass to proxy
   * @param options: contain for now mode to retur data (raw = retur data as proxy return, result: parse and retur features
   * @returns {Promise<{data: string, response: *}>}
   */
  this.data = async function({url, method='GET', params={}, headers={}}={}, options={mode:'raw'}){
    const ApplicationService = require('core/applicationservice');
    let proxyUrl = `${ApplicationService.getProxyUrl()}`;
    if (method === 'GET') {
      url = new URL(url);
      Object.keys(params).forEach(param => url.searchParams.set(param, params[param]));
      url = url.toString();
    }
    try {
      const data = JSON.stringify({
        url,
        params,
        headers,
        method
      });
      const response = await XHR.post({
        url: proxyUrl,
        contentType: 'application/json',
        data
      });
      return {
        response,
        data
      };
    } catch(err){
      return;
    }
  };
}

inherit(ProxyService, BaseService);

module.exports = new ProxyService;