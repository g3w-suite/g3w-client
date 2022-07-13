const { base, inherit } = require('core/utils/utils');
const BaseService = require('core/data/service');
const { XHR } = require('core/utils/utils');
const { getFeaturesFromResponseVectorApi } = require('core/utils/geo');

function ExpressionService() {
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
  this.expression = async function ({
    qgs_layer_id, layer_id, form_data, expression, formatter = 1,
  }) {
    const url = `${this.project.getUrl('vector_data')}${layer_id}/`;
    const response = await this.handleRequest({
      url,
      params: {
        qgs_layer_id,
        form_data,
        expression,
        formatter,
      },
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
  this.expression_eval = async function ({
    qgs_layer_id, form_data, expression, formatter = 1,
  } = {}) {
    const url = this.project.getUrl('expression_eval');
    const data = await this.handleRequest({
      url,
      params: {
        qgs_layer_id,
        form_data,
        expression,
        formatter,
      },
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
  this.handleRequest = async function ({ url, params = {}, contentType = 'application/json' } = {}) {
    let data;
    try {
      data = await XHR.post({
        url,
        contentType,
        data: JSON.stringify(params),
      });
    } catch (err) {}
    return data;
  };

  /** *
   * Common method to handle response
   * @param response
   */
  this.handleResponse = function (response = {}) {
    return getFeaturesFromResponseVectorApi(response);
  };
}

inherit(ExpressionService, BaseService);

module.exports = new ExpressionService();
