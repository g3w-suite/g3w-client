/**
 * @file
 * @since v3.6
 */

import ApplicationService from 'services/application';

const { base, inherit, XHR } = require('utils');
const BaseService = require('core/data/service');

function ProxyService(){
  base(this);
  /**
   *
   * @param data: Object conitans data to pass to proxy
   * @returns {Promise<{data: string, response: *}>}
   */
  this.wms = async function({url, method='GET', params={}, headers={}}={}){
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

  /**
   * Generic proxy data function
   * @param params
   */
  this.data = function(params={}){}
}

inherit(ProxyService, BaseService);

export default new ProxyService();