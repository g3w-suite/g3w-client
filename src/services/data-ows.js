/**
 * ORIGINAL SOURCE: src/app/core/data/ows/service.js@v3.4
 */

const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');
const {XHR} = require('core/utils/utils');

function OWSService(){
  base(this);
  /**
   *
   * @param params
   * @returns {Promise<{data: string, response: *}>}
   */
  this.wmsCapabilities = async function({url} ={}){
    const ApplicationService = require('core/applicationservice');
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