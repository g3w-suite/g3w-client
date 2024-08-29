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
export async function getDefaultExpression({
  field,
  feature,
  qgs_layer_id,
  parentData,
} = {}) {

  const {
    layer_id = qgs_layer_id,
    default_expression,
    loading,
    default: default_value,
  } = field.input.options;

  /**
   * @FIXME should return Promise.reject('some error message') ?
   */
  if (!default_expression) { return }

  loading.state = 'loading';

  // Call `expression:expression_eval` to get value from expression and set it to field
  try {

    const value = await DataRouterService.getData('expression:expression_eval', {
      inputs: {
        field_name: field.name,
        layer_id, //
        qgs_layer_id, //layer id owner of the data
        form_data:  convertFeatureToGEOJSON(feature),
        formatter:  0,
        expression: default_expression.expression,
        parent: parentData && {
          form_data:    convertFeatureToGEOJSON(parentData.feature),
          qgs_layer_id: parentData.qgs_layer_id,
          formatter:    0
        }
      },
      outputs: false
    });

    field.value = value;

    return value;

  } catch(e) {
    if (undefined !== default_value) { field.value = default_value }
    console.warn(e);
    return Promise.reject(e);
  } finally {
    loading.state = 'ready';
  }

}