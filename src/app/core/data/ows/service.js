import BaseService from 'core/data/service';
import ApplicationService from 'core/applicationservice';
import utils from 'core/utils/utils';
class OWSService extends BaseService {
  constructor() {
    super();
  }
  /**
   *
   * @param params
   * @returns {Promise<{data: string, response: *}>}
   */
  async wmsCapabilities({url} ={}){
    const {XHR} = utils;
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


export default  new OWSService;