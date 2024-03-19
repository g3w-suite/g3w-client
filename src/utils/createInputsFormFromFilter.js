import { SEARCH_ALLVALUE }         from 'app/constant';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService           from 'services/data';
import { toRawType }               from 'utils/toRawType';
import { getUniqueDomId }          from 'utils/getUniqueDomId';
import { createFilterFormInputs }  from 'utils/createFilterFormInputs';
import { getDataForSearchInput }   from 'utils/getDataForSearchInput';

/**
 * Create the right search structure for a search form
 * 
 * @param { Object } state
 *
 */
export async function createInputsFormFromFilter(state) {

  const dep             = state.input.dependance;
  const deps            = state.input.dependencies;
  const search_endpoint = state.search_endpoint || state.search_layers[0].getSearchEndPoint();

  for (let i = 0; i <= (state.filter || []).length - 1; i++) {
    let has_error;

    const type = state.filter[i].input.type || 'textfield'

    const input = {
      type,
      label:     state.filter[i].label,
      attribute: state.filter[i].attribute,
      options:   {
        // check if it has a dependence
        dependance_strict: false,
        dependance: false,
        values: [],
        ...state.filter[i].input.options,
      },
      value:     'selectfield' ===  type ? SEARCH_ALLVALUE : null,
      operator:  state.filter[i].op,
      logicop:   i === (state.filter.length - 1) ? null : state.filter[i].logicop,
      id:        state.filter[i].id || getUniqueDomId(),
      loading:   true,
      widget:    null,
    };

    try {

      // In case of select input
      // Request to server value for a specific select field
      // ensure setting values options to an empty array when undefined

      // get value-relation values when `layer_id` dependence is defined
      if ('selectfield' ===  input.type && !input.options.dependance_strict && input.options.layer_id) {
        const response = await DataRouterService.getData('search:features', {
          inputs: {
            layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
            search_endpoint,
            filter: createFilterFormInputs({
              layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
              search_endpoint,
              inputs: [{
                // array of unique values
                value: await getDataForSearchInput({ state, field: input.attribute }),
                attribute: input.options.value,
                logicop: "OR",
                operator: "eq"
              }]
            }),
            ordering: input.options.key
          },
          outputs: false
        });
        input.options.values = (response.data && response.data[0] && response.data[0].features || []).map(f => ({ key: f.get(input.options.key), value: f.get(input.options.value) }));
      }

      // Relation reference
      if ('selectfield' ===  input.type && !input.options.dependance_strict && !input.options.layer_id && input.options.relation_reference) {
        // call filter data with fformatter
        const response = await state.search_layers[0].getFilterData({ fformatter: input.attribute });
        // check response
        if (response && response.result && response.data) {
          input.options.values = response.data.map(([value, key]) => ({ key, value }));
        }
        if (!input.options.values.length > 0) {
          input.options.values = await getDataForSearchInput({ state, field: input.attribute })
        }
        // Set key value for select
        if ('Object' !== toRawType(input.options.values[0])) {
          input.options.values = input.options.values.map(value => ({ key: value, value }));
        }
      }

    } catch (e) {
      has_error = e;
      console.warn(e);
    }

    if (has_error && 'selectfield' ===  input.type) {
      input.options.values.splice(0, input.options.values.length);
    }

    // set `SEARCH_ALLVALUE` as first element of array
    if ('selectfield' ===  input.type && input.options.values.length) {
      input.options.values = input.options.values.filter(v => SEARCH_ALLVALUE !== v).unshift({ value: SEARCH_ALLVALUE })
    }

    const chained_select = input.options.dependance && !input.options.dependance_strict && ['selectfield', 'autocompletefield'].includes(input.type); 

    // there is a dependence
    if (chained_select) {
      dep[input.attribute]                        = input.options.dependance;        // set dependence of input
      state.loading[input.options.dependance]     = false;
      input.options.disabled                      = input.options.dependance_strict; // disabled for BACKCOMP
      // set input dependencies
      deps[input.options.dependance]              = (undefined !== deps[input.options.dependance] ? deps[input.options.dependance] : []);
      deps[input.options.dependance].push(input);
    }

    if (chained_select && input.options.values.length > 0) {
      input.options._values = [...input.options.values];
    }

    // set a widget type for fill dependency
    if (chained_select && input.options.values.length > 0) {
      input.widget = 'valuemap';
    }

    // set value-relation widget
    if (chained_select && !input.options.values.length && input.options.layer_id) {
      input.widget = 'valuerelation';
    }

    input.loading = false;

    // add form inputs to list of search input
    state.forminputs.push(input);
  }

}