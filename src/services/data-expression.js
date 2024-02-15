/**
 * @file
 * @since v3.6
 */
import { BaseService } from 'core/data/service'

const { XHR }                              = require('utils');
const { getFeaturesFromResponseVectorApi } = require('utils/geo');

class ExpressionService extends BaseService {

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
  async expression(params= {}) {
    try {
      return this.handleResponse(
        // response
        await this.handleRequest({
          url: `${this.project.getUrl('vector_data')}${params.layer_id}/`,
          params,
        })
      );
    } catch(err) {
      return Promise.reject(err);
    }

  }

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
   expression_eval(params = {}) {
    return this.handleRequest({
      url: this.project.getUrl('expression_eval'),
      params,
    });
  }

  /**
   * Handle server request
   * 
   * @param opts.url
   * @param opts.params
   * @param opts.contentType

   * @returns { Promise<*> }
   */
  handleRequest({
    url,
    params      = {},
    contentType = 'application/json',
  } = {}) {
    return XHR.post({ url, contentType, data: JSON.stringify(params) });
  }

  /**
   * Handle server response
   * 
   * @param response
   */
  handleResponse(response = {}) {
    return getFeaturesFromResponseVectorApi(response);
  }

}

export default new ExpressionService();