import { SEARCH_ALLVALUE }            from 'g3w-constants';

/**
 * @returns { Array } of unique values from field
 */
export async function getDataForSearchInput({ state, field, suggest }) {

  /**
   * @since 3.11.8 in case of search_1n with filter active, filter values with current value set
   */
  if (state.search_1n_layer && state.search_1n_layer.state.filter.active) {
    return ([].concat(state.forminputs
      .find(i => field === i.attribute) || [])) // only selectfield
      .map(i => i.values.find(v => i.value === v.value));
  }
  try {
    // get unique value from each layers
    return (
      await Promise.allSettled(state.search_layers.map(l => l.getFilterData({
        suggest,
        fformatter: field,
        ordering:   field,
        field: getDataForSearchInput.field({
          state,
          //in the case of suggested parameter set (case autocomplete field), need to use current field
          field:  suggest ? field : (state.forminputs.find(i => field === i.attribute) || {}).dependance || field,
          fields: []
        }),
      })))
    )
      .filter(d => 'fulfilled' === d.status)
      .reduce((acc, d, i) => 0 === i
        ? acc.concat(d.value.data || [])                                                       // for first layer get all uninques values 
        : [...new Set([...(d.value.data || []), ...acc].map(JSON.stringify))].map(JSON.parse), // ensure uniques values (search performed on multiple serach_layers)
        [] 
      )
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
    fields.unshift(`${parent.attribute}|${parent.operator.toLowerCase()}|${encodeURI(parent.value)}` + (fields.length ? `|${parent.logicop}` : ''));
  }

  // recursion step
  return getDataForSearchInput.field({ state, fields, field: parent.attribute });
}