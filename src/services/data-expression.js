/**
 * @file
 * @since v3.6
 */
import { getFeaturesFromResponseVectorApi } from "utils/getFeaturesFromResponseVectorApi";

const BaseService = require('core/data/service');
const {
  base,
  inherit,
  XHR
}                 = require('utils');

function ExpressionService() {
 
  base(this);
  
  /**
   * POST only: accepts
   * 
   * Mandatory JSON body: expression
   * Optional JSON body: form_data and qgs_layer_id (QGIS layer id)
   * 
   * @param params.qgis_layer_id layer id owner of the form data
   * @param params.layer_id      layer owner of the data
   * @param params.form_data
   * @param params.field_name    since 3.8.0
   * @param params.expression
   * @param params.formatter
   * @param params.parent
   * 
   * @returns { Promise<void> }
   */
  this.expression = async function(params= {}) {
    try {
      return this.handleResponse(
        // response
        await this.handleRequest({
          url: `${this.project.getUrl('vector_data')}${params.layer_id}/`,
          params
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
   * @param params.layer_id
   * @param params.qgis_layer_id
   * @param params.form_data
   * @param params.field_name    since 3.8.0
   * @param params.expression
   * @param params.formatter
   * @param params.parent
   * 
   * @returns { Promise<void> }
   */
   this.expression_eval = function(params={}) {
    return this.handleRequest({
      url: this.project.getUrl('expression_eval'),
      params
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