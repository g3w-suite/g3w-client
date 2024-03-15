import { SEARCH_ALLVALUE }                               from 'app/constant';
import { createFieldsDependenciesAutocompleteParameter } from 'utils/createFieldsDependenciesAutocompleteParameter';
import { sortAlphabeticallyArray }                       from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }                              from 'utils/sortNumericArray';


/**
 * Get data for a field, based on state (form serach)
 *
 * @param { Object } opts
 * @param { Object } opts.state
 * @param { Object } opts.fromField {field, value, output}
 *
 * @returns { Promise<Array> } Data
 */
export async function getDataForSearchInput({ state, fromField }) {
  // Get unique values from field (case autocomplete)
  let { field, value, output } = fromField;

  let data = [];
  try {

    // get current field dependence
    let dep = state.input.dependance[fromField.field];
    //check if the current input field has a dependence with another input field
    //In case true, need to check if
    if (dep && (state.input.cached_deps[dep] && SEARCH_ALLVALUE !== state.input.cached_deps[dep]._currentValue)) {
      // dependence as value
      dep = { [dep]: state.input.cached_deps[dep]._currentValue };
    } else if (dep) {
      dep = { [dep]: undefined }; // undefined = so it no adding on list of field dependence
    }

    let autoFieldDependecies;

    if (dep) {
      const [field, value] = Object.entries(dep)[0];
      autoFieldDependecies = createFieldsDependenciesAutocompleteParameter({
        field,
        value,
        filter: state.filter,
        inputdependance: state.input.dependance,
        cachedependencies: state.input.cached_deps,
      })
    }

    const layers = (1 === state.search_layers.length ? [state.search_layers[0]] : state.search_layers);
    const response = Array.from(
      (
        await Promise
          .allSettled(layers.map(l => l.getFilterData({
            field:      autoFieldDependecies,
            suggest:    value !== undefined ? `${field}|${value}` : undefined,
            unique:     field,
            ordering:   field,
            fformatter: undefined,
          })))
      )
        .filter(d => 'fulfilled' === d.status)
        .reduce((acc, { value = [] }) => new Set([...acc, ...value]), [])
    )

    // check if is not an empty array
    switch (response.length && typeof response[0]) {
      case 'string': data = sortAlphabeticallyArray(response); break;
      case 'number': data = sortNumericArray(response); break;
      default:       data = response;
    }

    if ('autocomplete' === output) {
      data = data.map(d => ({ id: d, text: d }));
    }
  } catch(e) {
    console.warn(e);
  }

  return data;

}