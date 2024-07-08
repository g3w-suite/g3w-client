import { SEARCH_ALLVALUE }            from 'app/constant';

/**
 * @returns { Array } of unique values from field
 */
export async function getDataForSearchInput({ state, field, suggest }) {

  try {
    // get unique value from each layers
    return (
      await Promise.allSettled(state.search_layers.map(l => l.getFilterData({
        suggest,
        fformatter: field,
        ordering:   field,
        field: getDataForSearchInput.field({
          state,
          //in the case of suggest parameter set (case autocomplete field), need to use current field
          field: suggest ? field : (state.forminputs.find(i => i.attribute === field) || {}).dependance || field,
          fields: []
        }),
      })))
    )
      .filter(d => 'fulfilled' === d.status)
      .reduce((acc, d) => acc.concat(d.value.data || []), []) // uniques by fformatter
      .map(([value, key]) => ({ key, value }));

  } catch(e) { console.warn(e); }

  return [];
}

/**
 * Traverse field dependecies
 */
getDataForSearchInput.field = ({ state, field, fields = [] } = {}) => {
  field        = state.forminputs.find(i => i.attribute === field);            // current input
  const parent = state.forminputs.find(i => i.attribute === field.dependance); // current input dependance (parent field)

  // get all values (un-filtered)
  if (!parent || SEARCH_ALLVALUE === parent.value) {
    return (fields || []).join() || undefined;
  }

  // filter by parent field
  if (undefined !== parent.value) {
    fields.unshift(`${parent.attribute}|${parent.operator.toLowerCase()}|${encodeURI(parent.value)}|` + (fields.length ? parent.logicop : ''));
  }

  // recursion step
  return getDataForSearchInput.field({ state, fields, field: parent.attribute });
}