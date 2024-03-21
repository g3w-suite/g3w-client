import { SEARCH_ALLVALUE }            from 'app/constant';
import { sortAlphabeticallyArray }    from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }           from 'utils/sortNumericArray';
import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

/**
 * @returns { Array } of unique values from field
 */
export async function getDataForSearchInput({ state, field, suggest, output }) {

  try {

    const layers = state.search_layers || [];
    const filter = state.filter || [];

    const createFieldsDeps = ({ field, fields = [] } = {}) => {
      const parent      = state.forminputs.find(d => d.attribute === field);
      let dep           = parent && parent.options.dependance;
      const cached_deps = dep && state.forminputs.some(d => dep === d.options.dependance && d.dvalues.length);

      if (!cached_deps || SEARCH_ALLVALUE === parent.value) {
        return fields.length && fields.join() || undefined;
      }

      // get current field dependance
      // In case of some input dependency is not filled
      if (undefined !== parent.value) {
        // need to set to lower a case for api purpose
        const { op, logicop } = filter.find(f =>  f.attribute === dep).op;
        fields.unshift(`${dep}|${op.toLowerCase()}|${encodeURI(parent.value)}|` + (fields.length ? logicop.toLowerCase() : ''));
      }

      return createFieldsDeps({ fields, field: dep });
    }

    // check if a field has a dependance
    const parent      = state.forminputs.find(d => d.attribute === field);
    let dep           = parent && parent.options.dependance;
    const cached_deps = dep && state.forminputs.some(d => dep === d.options.dependance && d.dvalues.length);

    // get unique value from each layers
    let response = Array.from(
      (
        await Promise
          .allSettled((1 === layers.length ? [layers[0]] : layers).map(l => l.getFilterData({
            field: createFieldsDeps({
              field: dep,
              fields: cached_deps && ![SEARCH_ALLVALUE, undefined].includes(parent.value) ? [createSingleFieldParameter({ field: dep, value: parent.value, operator: filter.find(f =>  f.attribute === dep).op }) ] : [],
            }),
            suggest,
            unique: field,
            ordering: field,
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

    // Get unique values from field (case autocomplete)
    if ('autocomplete' === output) {
      response = response.map(d => ({ id: d, text: d }));
    }

    return response;

  } catch(e) { console.warn(e); }

  return [];
}