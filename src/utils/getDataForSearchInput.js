import { SEARCH_ALLVALUE }            from 'app/constant';
import { sortAlphabeticallyArray }    from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }           from 'utils/sortNumericArray';
import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

/**
 * @returns { Array } of unique values from field
 */
export async function getDataForSearchInput({ state, field, suggest, output, search_layers, formatter, value }) {

  try {

    const layers = search_layers || state.search_layers || [];

    // check if a field has a dependance
    const parent = state.forminputs.find(d => d.attribute === field);
    let dep      = parent && parent.dependance;
    const cached = dep && state.forminputs.some(d => dep === d.dependance && d.dvalues.length);

    // get unique value from each layers
    let response = Array.from(
      (
        await Promise
          .allSettled((1 === layers.length ? [layers[0]] : layers).map(l => l.getFilterData({
            suggest,
            formatter,
            unique: field,
            ordering: field,
            field: _createFieldsDeps(
              // set undefined because if it has a subscribed input with valuerelations widget
              value
              // this is a parent elment ?
              ? ({
                state,
                field,
                fields: undefined !== value
                  ? [createSingleFieldParameter({ field, value, operator: parent.operator })]
                  : [],
              })
              // this is a child elment ?
              : ({
                state,
                field: dep,
                fields: cached && ![SEARCH_ALLVALUE, undefined].includes(parent.value)
                  ? [createSingleFieldParameter({ field: dep, value: parent.value, operator: state.forminputs.find(d =>  d.attribute === dep).operator }) ]
                  : [],
              })
            ).join() || undefined,
            // TODO ?
            // fformatter: opts.fformatter 
            
          })))
      )
        .filter(d => {
          console.log(d);
          return 'fulfilled' === d.status
        })
        .reduce((acc, { value = [] }) => new Set([...acc, ...value]), [])
    )

    // sort array
    switch (response.length && typeof response[0]) {
      case 'string': response = sortAlphabeticallyArray(response);
      case 'number': response = sortNumericArray(response);
    }

    // Get unique values from field (case autocomplete)
    if ('autocomplete' === output) {
      response = response.map(d => ({ id: d, text: d }));
    }

    return response;

  } catch(e) { console.warn(e); }

  return [];
}

/**
 * Traverse field dependecies
 */
function _createFieldsDeps({ state, field, fields = [] } = {}) {
  const parent = state.forminputs.find(d => d.attribute === field);
  let dep      = parent && parent.dependance;
  const cached = dep && state.forminputs.some(d => dep === d.dependance && d.dvalues.length);

  if (!cached || SEARCH_ALLVALUE === parent.value) {
    return fields;
  }

  // get current field dependance
  // In case of some input dependency is not filled
  if (undefined !== parent.value) {
    // need to set to lower a case for api purpose
    const { op, logicop } = state.forminputs.find(f =>  f.attribute === dep).operator;
    fields.unshift(`${dep}|${op.toLowerCase()}|${encodeURI(parent.value)}|` + (fields.length ? logicop.toLowerCase() : ''));
  }

  return _createFieldsDeps({ state, fields, field: dep });
}