import DataRouterService from 'services/data';

const { convertFeatureToGEOJSON } = require('core/utils/geo');

export default {
  /**
   * handleFilterExpressionFormInput
   * @param field
   * @param feature
   * @param qgs_layer_id
   * @returns {Promise<void|unknown>}
   */
  async handleFilterExpressionFormInput({field, feature, qgs_layer_id, parentData}={}){
    const form_data = convertFeatureToGEOJSON(feature);
    const options = field.input.options;
    let {key, value, layer_id=qgs_layer_id, filter_expression, loading} = options;
    if (filter_expression) {
      loading.state = 'loading';
      try {
        const features = await DataRouterService.getData('expression:expression', {
          inputs: {
            field_name: field.name,
            layer_id,
            qgs_layer_id,// layer id owner of the data
            form_data,
            parent: parentData && {
              form_data: convertFeatureToGEOJSON(parentData.feature),
              qgs_layer_id: parentData.qgs_layer_id,
              formatter: 0
            },
            formatter: 0,
            expression: filter_expression.expression
          },
          outputs: false
        });
        //based on input type
        switch (field.input.type){
          case 'select_autocomplete':
            field.input.options.values = [];
            /**
             * Use a temporary array to sort the keys
             * @type {*[]}
             */
            const values = [];
            for (let i = 0; i < features.length; i++) {
              values.push({
                key: features[i].properties[key],
                value: features[i].properties[value]
              })
            }
            values.sort(({key:aKey}, {key:bKey}) => {
              if (typeof aKey === 'string') {
                aKey = aKey.toLowerCase();
                bKey = bKey.toLowerCase()
              }
              if (aKey < bKey) return -1;
              if (aKey > bKey) return 1;
              return 0;
            });
            field.input.options.values = values;
            break;
        }
        return features
      } catch(err){
        return Promise.reject(err);
      } finally {
        loading.state = 'ready';
      }
    }
  },
  /*
  *handleDefaultExpressionFormInput
   */
  async handleDefaultExpressionFormInput({field, feature, qgs_layer_id, parentData}={}){
    const form_data = convertFeatureToGEOJSON(feature);
    const options = field.input.options;
    const {
      layer_id=qgs_layer_id,
      default_expression,
      loading,
      default:default_value,
    } = options;
    if (default_expression) {
      loading.state = 'loading';
      /**
       * In case of default_expression call expression_eval to get value from expression and set it to field
       */
      try {
        const value = await DataRouterService.getData('expression:expression_eval', {
          inputs: {
            field_name: field.name,
            layer_id, //
            qgs_layer_id, //layer id owner of the data
            form_data,
            formatter: 0,
            expression: default_expression.expression,
            parent: parentData && {
              form_data: convertFeatureToGEOJSON(parentData.feature),
              qgs_layer_id: parentData.qgs_layer_id,
              formatter: 0
            }
          },
          outputs: false
        });
        field.value = value;
        return value;
      } catch(err){
        if ("undefined" !== typeof default_value) {
          field.value = default_value
        }
        return Promise.reject(err);
      } finally {
        loading.state = 'ready';
      }
    }
  }
}