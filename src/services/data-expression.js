/**
 * @file
 * @since v3.6
 */

const BaseService = require('core/data/service');
const { base, inherit, XHR } = require('core/utils/utils');
const { getFeaturesFromResponseVectorApi } = require('core/utils/geo');

function ExpressionService() {
 
  base(this);
  
  /**
   * POST only: accepts
   * 
   * Mandatory JSON body: expression
   * Optional JSON body: form_data and qgs_layer_id (QGIS layer id)
   * 
   * @param expr.qgis_layer_id layer id owner of the form data
   * @param expr.layer_id      layer owner of the data
   * @param expr.form_data
   * @param expr.field_name    since 3.8.0
   * @param expr.expression
   * @param expr.formatter
   * @param expr.parent 
   * 
   * @returns { Promise<void> }
   */
  this.expression = async function(expr) {
    expr = expr || {};
    try {
      return this.handleResponse(
        // response
        await this.handleRequest({
          url: `${this.project.getUrl('vector_data')}${expr.layer_id}/`,
          params: expr
        })
      );
    } catch(err) {
      return Promise.reject(err);
    }

  };

  /**
   * POST only method to return QGIS Expressions evaluated in Project an optional Layer/Form context
   *
   * Mandatory JSON body: expression
   * Optional JSON body: form_data and qgs_layer_id (QGIS layer id)
   * 
   * @param expr.layer_id
   * @param expr.qgis_layer_id
   * @param expr.form_data
   * @param expr.field_name    since 3.8.0
   * @param expr.expression
   * @param expr.formatter
   * @param expr.parent
   * 
   * @returns { Promise<void> }
   */
   this.expression_eval = function(expr) {
    expr = expr || {};
    return this.handleRequest({
      url: this.project.getUrl('expression_eval'),
      params: expr
    });
  };

  /**
   * Handle server request
   * 
   * @param url
   * @param params
   * @param contentType

   * @returns { Promise<*> }
   */
  this.handleRequest = function({ url, params={}, contentType='application/json' } = {}) {
    return XHR.post({ url, contentType, data: JSON.stringify(params) });
  };

  /**
   * Handle server response
   * 
   * @param response
   */
  this.handleResponse = function(response = {}) {
    return getFeaturesFromResponseVectorApi(response);
  };

}

inherit(ExpressionService, BaseService);

export default new ExpressionService();