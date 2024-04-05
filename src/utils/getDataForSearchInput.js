import { SEARCH_ALLVALUE }            from 'app/constant';
import { sortAlphabeticallyArray }    from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }           from 'utils/sortNumericArray';
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
    let response = Array.from(
      (
        await Promise.allSettled(state.search_layers.map(l => l.getFilterData({
            suggest,
            unique: field,
            ordering: field,
            field: getDataForSearchInput.field({
              state,
              field: dep,
              fields: cached && ![SEARCH_ALLVALUE, undefined].includes(parent.value)
                ? [createSingleFieldParameter({ field: dep, value: parent.value, operator: state.forminputs.find(d =>  d.attribute === dep).operator }) ]
                : [],
            }),
            // TODO ?
            // fformatter: opts.fformatter
          })))
      )
        .filter(d => 'fulfilled' === d.status)
        .reduce((acc, { value = [] }) => new Set([...acc, ...value]), [])
    )

    // sort array
    switch (response.length && typeof response[0]) {
      case 'string': response = sortAlphabeticallyArray(response);
      case 'number': response = sortNumericArray(response);
    }

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