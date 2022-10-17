/**
 * ORIGINAL SOURCE: src/app/core/data/expression/service.js@v3.4
 */

const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');
const {XHR} = require('core/utils/utils');
const {getFeaturesFromResponseVectorApi} = require('core/utils/geo');

function ExpressionService(){
  base(this);
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
  this.expression = async function({qgs_layer_id, layer_id, form_data, expression, formatter=1, parent}){
    const url = `${this.project.getUrl('vector_data')}${layer_id}/`;
    try {
      const response = await this.handleRequest({
        url,
        params: {
          layer_id,
          qgs_layer_id,
          form_data,
          expression,
          formatter,
          parent
        }
      });
      return this.handleResponse(response);
    } catch(err) {
      return Promise.reject(err);
    }
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
   this.expression_eval = function({layer_id, qgs_layer_id, form_data, expression, formatter=1, parent}={}){
     const url = this.project.getUrl('expression_eval');
     return this.handleRequest({
       url,
       params: {
         layer_id,
         qgs_layer_id,
         form_data,
         expression,
         formatter,
         parent,
       }
     });
  };

  /**
   * Common method to handel request
    * @param url
   * @param params
   * @contentType
   * @returns {Promise<*>}
   */
  this.handleRequest = function({url, params={}, contentType='application/json'}={}){
    return XHR.post({
      url,
      contentType,
      data: JSON.stringify(params)
    });
  };

  /***
   * Common method to handle response
   * @param response
   */
  this.handleResponse = function(response={}){
    return getFeaturesFromResponseVectorApi(response);
  };
}

inherit(ExpressionService, BaseService);

export default new ExpressionService();