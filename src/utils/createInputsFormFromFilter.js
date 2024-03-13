import { SEARCH_ALLVALUE }                               from 'app/constant';
import CatalogLayersStoresRegistry                       from 'store/catalog-layers';
import DataRouterService                                 from 'services/data';
import { toRawType }                                     from 'utils/toRawType';
import { getUniqueDomId }                                from 'utils/getUniqueDomId';
import { createFilterFormInputs }                        from 'utils/createFilterFormInputs';
import { createFieldsDependenciesAutocompleteParameter } from 'utils/createFieldsDependenciesAutocompleteParameter';
import { sortAlphabeticallyArray }                       from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }                              from 'utils/sortNumericArray';
import { getUniqueValuesFromField }                      from "utils/getUniqueValuesFromField";

/**
 * Create right search structure for search form
 * 
 * @param { Object } opts
 * @param { Array } opts.filter input
 * 
 * @returns { Promise<void> } form input
 */
export async function createInputsFormFromFilter({ state, fromField }) {

  // Get unique values from field
  if (fromField) {
    let { field, value, output } = fromField.field;
    let data = [];
    try {

      // get current field dependance
      let dep = state.input.dependance[fromField.field];
      if (dep && (state.input.cached_deps[dep] && SEARCH_ALLVALUE !== state.input.cached_deps[dep]._currentValue)) {
        dep = { [dep]: state.input.cached_deps[dep]._currentValue }; // dependance as value
      } else if(dep) {
        dep = { [dep]: undefined }; // undefined = so it no add on list o field dependance
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

      // get unique value from each layers
      const response = Array.from(
        await Promise
          .allSettled(layers.map(l => l.getFilterData({
            field:      autoFieldDependecies,
            suggest:    value !== undefined ? `${field}|${value}` : undefined,
            unique:     field,
            ordering:   field,
            fformatter: undefined,
          })))
          .filter(d => 'fulfilled' === d.status)
          .reduce((acc, { value = [] }) => new Set([...acc, ...value]), [])
      )

      // check if is not an empty array
      switch (response.length && typeof response[0]) {
        case 'string': data = sortAlphabeticallyArray(response);
        case 'number': data = sortNumericArray(response);
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

  const inputdependance   = state.input.dependance;
  const inputdependencies = state.input.dependencies;
  const cachedependencies = state.input.cached_deps;
  const filter            = state.filter || [];
  const searchLayer       = state.search_layers[0];
  const search_endpoint   = state.search_endpoint || searchLayer.getSearchEndPoint();

  // set key value for select
  const valuesToKeysValues = values => values.length ? ('Object' !== toRawType(values[0]) ? values.map(value => ({ key: value, value })) : values) : values;

  for (let i = 0; i <= filter.length - 1; i++) {

    const input = {
      label:     filter[i].label,
      attribute: filter[i].attribute,
      type:      filter[i].input.type || 'textfield',
      options:   { ...filter[i].input.options },
      value:     null,
      operator:  filter[i].op,
      logicop:   i === (filter.length - 1) ? null : filter[i].logicop,
      id:        filter[i].id || getUniqueDomId(),
      loading:   false,
      widget:    null,
    };

    // check if it has a dependence
    const dep_strict             = undefined !== input.options.dependance_strict ? input.options.dependance_strict : false;
    const dep                    = undefined !== input.options.dependance        ? input.options.dependance        : false;
    const isInputSelectType      = ['selectfield', 'autocompletefield'].includes(input.type);
    input.options.values         = undefined !== input.options.values            ? input.options.values            : [];
    const { values }             = input.options;

    //In case of select input
    if ('selectfield' ===  input.type) {
      // Request to server value for a specific select field
       (async function () {
        // ensure setting values options to empty array when undefined
        input.loading = true;

        let _values;

        try {

          // in case of dependence load right now
          if ((dep && dep_strict) || dep_strict) {
            return;
          }

          // if defined layer_id dependence
          if (input.options.layer_id) {
            //array of unique values
            const uniqueValues = await getUniqueValuesFromField({
              layers: state.search_layers,
              field: input.attribute,
              inputdependance,
              cachedependencies,
            });
            const filter = createFilterFormInputs({
              layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
              search_endpoint,
              inputs: [{value: uniqueValues, attribute: input.options.value, logicop: "OR", operator: "eq"}]
            });
            // get value relation values
            try {
              const {data = []} = await DataRouterService.getData('search:features', {
                inputs: {
                  layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
                  search_endpoint,
                  filter,
                  ordering: input.options.key
                },
                outputs: false
              });
              const values = [];
              (data && data[0] && data[0].features || []).forEach(feature => {
                values.push({key: feature.get(input.options.key), value: feature.get(input.options.value)})
              });
              _values = values;
            } catch (e) {
              console.warn(e);
              _values = [];
            }
            return;
          }

          // Relation reference
          if (input.options.relation_reference) {
            //call filter data with fformatter
            const response = await searchLayer.getFilterData({fformatter: input.attribute});
            //check response
            if (response && response.result && response.data) {
              input.options.values = response.data.map(([value, key]) => ({key, value}));
            }
          }

          // return mapped values
          if (input.options.values.length > 0) {
            _values = input.options.values.filter(value => SEARCH_ALLVALUE !== value);
            return;
          }
          _values = await getUniqueValuesFromField({
            field: input.attribute,
            layers: state.search_layers,
            inputdependance,
            cachedependencies,
          })
        } catch (e) {
          console.warn(e);
          values.length = 0;
        } finally {
          if (undefined !== _values) {
            values.splice(0, values.length, ...valuesToKeysValues(_values));
          }
          input.loading = false;
          if (values.length && SEARCH_ALLVALUE !== values[0].value) {
            values.unshift({value: SEARCH_ALLVALUE});
          } else {
            values.push({value: SEARCH_ALLVALUE});
          }
          input.value = SEARCH_ALLVALUE;
        }

      })();

    }

    // there is a dependence
    if (isInputSelectType && dep) {
      inputdependance[input.attribute] = dep;              // set dependence of input
      state.loading[dep]        = false;
      input.options.disabled    = dep_strict;       // disabled for BACKCOMP
      // set input dependencies
      inputdependencies[dep] = (undefined !== inputdependencies[dep] ? inputdependencies[dep] : []);
      inputdependencies[dep].push(input);
    }

    // set a widget type for fill dependency
    if (isInputSelectType && dep && values.length > 0) {
      input.widget          = 'valuemap';
      input.options._values = [...values];
    }

    //Set input widget
    if (isInputSelectType && dep && !values.length && input.options.layer_id) {
      input.widget = 'valuerelation';
    }

    // add form inputs to list of search input
    state.forminputs.push(input);
  }
}