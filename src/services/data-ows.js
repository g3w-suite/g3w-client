/**
 * @file
 * @since v3.6
 */

import ApplicationService from 'services/application';
import { BaseService }     from 'core/data/service';

const { XHR } = require('utils');

class OWSService extends BaseService {

  /**
   * @param params.url
   * 
   * @returns {Promise<{data: string, response: *}>}
   */
  async wmsCapabilities({ url } = {})  {
    try {
      return await XHR.post({
        url:         `${ApplicationService.getInterfaceOwsUrl()}`,
        contentType: 'application/json',
        data:        JSON.stringify({ url, service: 'wms' })
      });
    } catch(e) {
      console.warn(e);
    }
  }

}

export default new OWSService();