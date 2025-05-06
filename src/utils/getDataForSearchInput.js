import { SEARCH_ALLVALUE }      from 'g3w-constants';

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
  if (!parent || [].concat(parent.value).find(v => v === SEARCH_ALLVALUE)) {
    return (fields || []).join() || undefined;
  }

  // filter by parent field
  if (undefined !== parent.value) {
    //Take in account in operator (array values)
    fields.unshift(`${parent.attribute}|${parent.operator.toLowerCase()}|${'in' === parent.operator ? `(${[].concat(parent.value).map(v => encodeURIComponent(v)).join(',')})` : `${encodeURIComponent(parent.value)}`}` + (fields.length ? `|${parent.logicop}` : ''));
  }

  // recursion step
  return getDataForSearchInput.field({ state, fields, field: parent.attribute });
}