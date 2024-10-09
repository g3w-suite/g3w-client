import DataRouterService           from 'services/data';
import { convertFeatureToGEOJSON } from 'utils/convertFeatureToGEOJSON';

/**
 * ORIGINAL SOURCE: src/app/core/expression/inputservice.js@3.8.6
 *
 * @param expr.field        related field
 * @param expr.feature      feature to transform in form_data
 * @param expr.qgs_layer_id layer id owner of the feature data
 * @param expr.parentData
 *
 * @returns { void | Promise<unknown> }
 *
 * @since 3.9.0
 */
export async function getFilterExpression({
  field,
  feature,
  qgs_layer_id,
  parentData,
} = {}) {
  let {
    key,
    value,
    layer_id = qgs_layer_id,
    filter_expression,
    loading,
    orderbyvalue
  } = field.input.options;

  /**
   * @FIXME should return Promise.reject('some error message') ?
   */
  if (!filter_expression) { return }

  loading.state = 'loading';

  try {

    const features = await DataRouterService.getData('expression:expression', {
      inputs: {
        field_name: field.name,
        layer_id,
        qgs_layer_id,
        form_data: convertFeatureToGEOJSON(feature),
        parent: parentData && ({
          form_data:    convertFeatureToGEOJSON(parentData.feature),
          qgs_layer_id: parentData.qgs_layer_id,
          formatter:    0,
        }),
        formatter:  0,
        expression: filter_expression.expression,
        ordering: [undefined, false].includes(orderbyvalue) ? key : value, //@since 3.11.0
      },
      outputs: false,
    });

    if ('select_autocomplete' === field.input.type) {
      field.input.options.values = [];
      // temporary array to sort the keys
      const values = [];
      for (let i = 0; i < features.length; i++) {
        values.push({
          key:   features[i].properties[key],
          value: features[i].properties[value]
        })
      }

      field.input.options.values = values;
    }

    return features;

  } catch(e) {
    console.warn(e);
    return Promise.reject(e);
  } finally {
    loading.state = 'ready';
  }

}