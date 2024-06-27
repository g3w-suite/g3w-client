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
          field: (state.forminputs.find(i => i.attribute === field) || {}).dependance || field,
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
  field        = state.forminputs.find(i => i.attribute === field);
  const parent = state.forminputs.find(i => i.attribute === field.dependance);

  if (!parent || SEARCH_ALLVALUE === parent.value) {
    return (fields || []).join() || undefined;
  }
  // get current field dependance
  // In case of some input dependency is not filled
  if (undefined !== parent.value) {
    // need to set to lower a case for api purpose
    const { operator, logicop } = parent;
    fields.unshift(`${parent.attribute}|${operator.toLowerCase()}|${encodeURI(parent.value)}|` + (fields.length ? logicop : ''));
  }

  return getDataForSearchInput.field({ state, fields, field: parent.attribute });
}