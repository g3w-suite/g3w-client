import { SEARCH_ALLVALUE }            from 'app/constant';
import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

/**
 * @returns { Array } of unique values from field
 */
export async function getDataForSearchInput({ state, field, suggest }) {

  try {

    // check if a field has a dependance
    const parent = state.forminputs.find(d => d.attribute === field);
    let dep      = parent && parent.dependance;
    const cached = dep && state.forminputs.some(d => dep === d.dependance && d.dvalues.length);

    // get unique value from each layers
    let response = (
      await Promise.allSettled(state.search_layers.map(l => l.getFilterData({
          suggest,
          fformatter: field,
          field: getDataForSearchInput.field({
            state,
            field: dep,
            fields: cached && ![SEARCH_ALLVALUE, undefined].includes(parent.value)
              ? [createSingleFieldParameter({ field: dep, value: parent.value, operator: state.forminputs.find(d =>  d.attribute === dep).operator }) ]
              : [],
          }),
        })))
    )
      .filter(d => 'fulfilled' === d.status)
      .reduce((acc, d) => acc.concat(d.value.data || []), [])                                                                           // uniques by fformatter
      .sort((a, b) => `${a[1]}`.localeCompare(b[1], undefined, 'number' === typeof a[1] ? { numeric: true } : { sensitivity: 'base' })) // sorted by fformatter
      .map(([value, key]) => ({ key, value }));

    return response;

  } catch(e) { console.warn(e); }

  return [];
}

/**
 * Traverse field dependecies
 */
getDataForSearchInput.field = ({ state, field, fields = [] } = {}) => {
  const parent = state.forminputs.find(d => d.attribute === field);
  let dep      = parent && parent.dependance;
  const cached = dep && state.forminputs.some(d => dep === d.dependance && d.dvalues.length);

  if (!cached || SEARCH_ALLVALUE === parent.value) {
    return (fields || []).join() || undefined;
  }

  // get current field dependance
  // In case of some input dependency is not filled
  if (undefined !== parent.value) {
    // need to set to lower a case for api purpose
    const { op, logicop } = state.forminputs.find(f =>  f.attribute === dep).operator;
    fields.unshift(`${dep}|${op.toLowerCase()}|${encodeURI(parent.value)}|` + (fields.length ? logicop.toLowerCase() : ''));
  }

  return getDataForSearchInput.field({ state, fields, field: dep });
}