const DataRouterService = require('core/data/routerservice');
const {getFormDataExpressionRequestFromFeature, convertFeatureToGEOJSON} = require('core/utils/geo');

export default {
  async getVisibility({qgs_layer_id, expression, feature={}, contenttype}){
    const form_data = contenttype === 'editing' ? convertFeatureToGEOJSON(feature) : getFormDataExpressionRequestFromFeature(feature);
    const response = await DataRouterService.getData('expression:expression_eval', {
      inputs: {
        qgs_layer_id,
        form_data,
        expression
      },
      outputs: false
    });
    return response;
  }
}