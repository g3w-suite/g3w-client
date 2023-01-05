import DataRouterService from 'services/data';
const {getFormDataExpressionRequestFromFeature, convertFeatureToGEOJSON} = require('core/utils/geo');

export default {
    getVisibility({qgs_layer_id, expression, feature={}, contenttype}){
    const formatter = contenttype === 'query' ? 1 : 0;
    const form_data = contenttype === 'editing' ? convertFeatureToGEOJSON(feature) : getFormDataExpressionRequestFromFeature(feature);
    return DataRouterService.getData('expression:expression_eval', {
      inputs: {
        qgs_layer_id,
        form_data,
        expression,
        formatter
      },
      outputs: false
    });
  }
}