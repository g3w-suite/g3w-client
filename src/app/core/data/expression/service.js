import BaseService from 'core/data/service';
import utils from 'core/utils/utils';
import geoutils from 'core/utils/geo';

class ExpressionService extends BaseService {
  constructor() {
    super();
  }
  /**
   *
   * @param qgis_layer_id
   * @param form_data
   * @param expression
   * @param layer_id layer owner of the data
   * @param qgs_layer_id layer id owner of the form data
   * @returns {Promise<void>}
   * POST only: accepts

   * Mandatory JSON body: expression
   * Optional JSON body: form_data and qgs_layer_id (QGIS layer id)
   */
  async expression({qgs_layer_id, layer_id, form_data, expression, formatter=1}){
    const url = `${this.project.getUrl('vector_data')}${layer_id}/`;
    const response = await this.handleRequest({
      url,
      params: {
        qgs_layer_id,
        form_data,
        expression,
        formatter
      }
    });
    const data = this.handleResponse(response);
    return data;
  };

  /**
   *
   * @param qgis_layer_id
   * @param form_data
   * @param expression
   * @returns {Promise<void>}
   * POST only method to return QGIS Expressions evaluated in Project an optional Layer/Form context
   *
   *  Mandatory JSON body: expression
    * Optional JSON body: form_data and qgs_layer_id (QGIS layer id)
   */
   async expression_eval({qgs_layer_id, form_data, expression, formatter=1}={}){
    const url = this.project.getUrl('expression_eval');
    const data = await this.handleRequest({
      url,
      params: {
        qgs_layer_id,
        form_data,
        expression,
        formatter
      }
    });
    return data;
  };

  /**
   * Common method to handel request
    * @param url
   * @param params
   * @contentType
   * @returns {Promise<*>}
   */
  async handleRequest({url, params={}, contentType='application/json'}={}){
    const {XHR} = utils;
    let data;
    try {
      data = await XHR.post({
        url,
        contentType,
        data: JSON.stringify(params)
      });
    } catch(err){}
    return data;
  };

  /***
   * Common method to handle response
   * @param response
   */
  handleResponse(response={}){
    return geoutils.getFeaturesFromResponseVectorApi(response);

  };
}


export default  new ExpressionService;