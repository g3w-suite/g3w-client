 import { getLayersFilterData } from "utils/getLayersFilterData";

 /**
 *
 * @param layers
 * @param field
 * @param value
 * @param output
 * @return {Promise<*[]>}
 */
export async function getUniqueValuesFromField ({
  layers = [],
  field,
  value,
  output
}) {
  let data = [];
  try {
    data = await getLayersFilterData(
      (1 === layers.length ? [layers[0]] : layers), {
        field: getAutoFieldDependeciesParamField(field),
        suggest: value !== undefined ? `${field}|${value}` : undefined,
        unique: field,
        ordering: field
      });

    if ('autocomplete' === output) {
      data = data.map(value => ({ id:value, text:value }));
    }
  } catch(e) { console.warn(e); }

  return data;
};