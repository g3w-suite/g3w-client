import DataRouterService from 'services/data';

const { convertFeatureToGEOJSON } = require('core/utils/geo');

export default {
  
  /**
   * @param expr.field
   * @param expr.feature
   * @param expr.qgs_layer_id
   * @param expr.parentData
   * 
   * @returns { void | Promise<unknown> }
   */
  async handleFilterExpressionFormInput({ field, feature, qgs_layer_id, parentData } = {}) {
    let {
      key,
      value,
      layer_id = qgs_layer_id,
      filter_expression,
      loading,
    } = field.input.options;
  
    /**
     * @FIXME should return Promise.reject('some error message') ?
     */
    if (!filter_expression) {
      return;
    }

    loading.state = 'loading';

    try {

      const features = await DataRouterService.getData('expression:expression', {
        inputs: {
          field_name: field.name,
          layer_id,
          qgs_layer_id, // layer id owner of the data
          form_data: convertFeatureToGEOJSON(feature),
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

      if('select_autocomplete' === field.input.type) {
        field.input.options.values = [];
        // temporary array to sort the keys
        const values = [];
        for (let i = 0; i < features.length; i++) {
          values.push({
            key: features[i].properties[key],
            value: features[i].properties[value]
          })
        }
        values.sort(({key:aKey}, {key:bKey}) => {
          if ('string' === typeof aKey ) {
            aKey = aKey.toLowerCase();
            bKey = bKey.toLowerCase()
          }
          if (aKey < bKey) return -1;
          if (aKey > bKey) return 1;
          return 0;
        });
        field.input.options.values = values;
      }

      return features;

    } catch(err) {
      return Promise.reject(err);
    } finally {
      loading.state = 'ready';
    }

  },

  /**
   * @param expr.field
   * @param expr.feature
   * @param expr.qgs_layer_id
   * @param expr.parentData
   *  
   * @returns { void | Promise<unknown> } 
   */
  async handleDefaultExpressionFormInput({ field, feature, qgs_layer_id, parentData } = {}) {
    
    const {
      layer_id = qgs_layer_id,
      default_expression,
      loading,
      default: default_value,
    } = field.input.options;

    /**
     * @FIXME should return Promise.reject('some error message') ?
     */
    if (!default_expression) {
      return;
    }

    loading.state = 'loading';

    // Call `expression:expression_eval` to get value from expression and set it to field
    try {

      const value = await DataRouterService.getData('expression:expression_eval', {
        inputs: {
          field_name: field.name,
          layer_id, //
          qgs_layer_id, //layer id owner of the data
          form_data: convertFeatureToGEOJSON(feature),
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

    } catch(err) {
      if ("undefined" !== typeof default_value) {
        field.value = default_value
      }
      return Promise.reject(err);
    } finally {
      loading.state = 'ready';
    }

  }

}