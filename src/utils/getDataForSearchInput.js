import { SEARCH_ALLVALUE }            from 'app/constant';
import { sortAlphabeticallyArray }    from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }           from 'utils/sortNumericArray';
import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

/**
 * @returns { Array } of unique values from field
 */
export async function getDataForSearchInput({ state, field, suggest, output }) {

  try {

    const layers          = state.search_layers || [];
    const cached          = state.cached_deps || {};
    const filter          = state.filter || [];

    const createFieldsDeps = ({ field, fields = [] } = {}) => {
      let dep = field && filter.find(d => d.attribute === field).input.options.dependance;
      let dvalue = undefined;

      if (!dep || !cached[dep] || SEARCH_ALLVALUE === cached[dep]._currentValue) {
        return fields.length && fields.join() || undefined;
      }

      // get current field dependance
      if (dep && cached[dep] && SEARCH_ALLVALUE !== cached[dep]._currentValue) {
        dvalue = cached[dep]._currentValue; // dependance as value
      }

      // In case of some input dependency is not filled
      if (undefined !== dvalue) {
        // need to set to lower a case for api purpose
        const { op, logicop } = filter.find(f =>  f.attribute === dep).op;
        fields.unshift(`${dep}|${op.toLowerCase()}|${encodeURI(dvalue)}|` + (fields.length ? logicop.toLowerCase() : ''));
      }

      return createFieldsDeps({ fields, field: dep });
    }

    // check if a field has a dependance
    let dep    = filter.find(d => d.attribute === field).input.options.dependance;
    let dvalue = undefined;

    if (dep && cached[dep] && SEARCH_ALLVALUE !== cached[dep]._currentValue) {
      dvalue = cached[dep]._currentValue // dependance as value
    }

    // get unique value from each layers
    let response = Array.from(
      (
        await Promise
          .allSettled((1 === layers.length ? [layers[0]] : layers).map(l => l.getFilterData({
            field: createFieldsDeps({
              field: dep,
              fields: undefined !== dvalue ? [createSingleFieldParameter({ field: dep, value: dvalue, operator: filter.find(f =>  f.attribute === dep).op }) ] : [],
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