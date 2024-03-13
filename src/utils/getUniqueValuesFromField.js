import { getLayersFilterData }               from "utils/getLayersFilterData";
import { getAutoFieldDependeciesParamField } from "utils/getAutoFieldDependeciesParamField"

 /**
 *
 * @param layers
 * @param field
 * @param value
 * @param output
 * @param inputdependance
 * @param cachedependencies
 * @return {Promise<*[]>}
 */
export async function getUniqueValuesFromField ({
  layers = [],
  field,
  value,
  output,
  inputdependance = {},
  cachedependencies = {},
}) {
  let data = [];
  try {

    data = await getLayersFilterData(
      (1 === layers.length ? [layers[0]] : layers), {
        field: getAutoFieldDependeciesParamField({ field, inputdependance, cachedependencies,}),
        suggest: value !== undefined ? `${field}|${value}` : undefined,
        unique: field,
        ordering: field
      });

    if ('autocomplete' === output) {
      data = data.map(value => ({ id:value, text:value }));
    }
  } catch(e) { console.warn(e); }

  return data;
}