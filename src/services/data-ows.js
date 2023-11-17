/**
 * @file
 * @since v3.6
 */

import ApplicationService from 'services/application';

const { base, inherit, XHR } = require('utils');
const BaseService = require('core/data/service');

function OWSService(){
  base(this);
  /**
   *
   * @param params
   * @returns {Promise<{data: string, response: *}>}
   */
  this.wmsCapabilities = async function({url} ={}){
    const owsUrl = `${ApplicationService.getInterfaceOwsUrl()}`;
    try {
      const params = {
        url,
        service: "wms"
      };
      const data = JSON.stringify(params);
      const response = await XHR.post({
        url: owsUrl,
        contentType: 'application/json',
        data
      });
      return response;
    } catch(err){
      return;
    }
  };
}

inherit(OWSService, BaseService);

export default new OWSService();