import { SEARCH_ALLVALUE }                               from 'app/constant';
import CatalogLayersStoresRegistry                       from 'store/catalog-layers';
import DataRouterService                                 from 'services/data';
import { toRawType }                                     from 'utils/toRawType';
import { getUniqueDomId }                                from 'utils/getUniqueDomId';
import { createFilterFormInputs }                        from 'utils/createFilterFormInputs';
import { getUniqueValuesFromField }                      from "utils/getUniqueValuesFromField";

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

    const input = {
      label:     state.filter[i].label,
      attribute: state.filter[i].attribute,
      type:      state.filter[i].input.type || 'textfield',
      options:   {
        // check if it has a dependence
        dependance_strict: false,
        dependance: false,
        values: [],
        ...state.filter[i].input.options,
      },
      value:     null,
      operator:  state.filter[i].op,
      logicop:   i === (state.filter.length - 1) ? null : state.filter[i].logicop,
      id:        state.filter[i].id || getUniqueDomId(),
      loading:   false,
      widget:    null,
    };

    // In case of select input
    // Request to server value for a specific select field
    // ensure setting values options to an empty array when undefined
    if ('selectfield' ===  input.type) {
      input.loading = true;
    }

    try {

      // get value relation values
      // if defined layer_id dependence
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
                value: await getUniqueValuesFromField({
                  layers:            state.search_layers,
                  field:             input.attribute,
                  inputdependance:   dep,
                  cachedependencies: state.input.cached_deps,
                }),
                attribute: input.options.value,
                logicop: "OR",
                operator: "eq"
              }]
            }),
            ordering: input.options.key
          },
          outputs: false
        });
        input.options.values = (response.data && response.data[0] && response.data[0].features || []).map(f => ({key: f.get(input.options.key), value: f.get(input.options.value)}));
      }

      // Relation reference
      if ('selectfield' ===  input.type && !input.options.dependance_strict && !input.options.layer_id && input.options.relation_reference) {
        //call filter data with fformatter
        const response = await state.search_layers[0].getFilterData({ fformatter: input.attribute });
        //check response
        if (response && response.result && response.data) {
          input.options.values = response.data.map(([value, key]) => ({ key, value })).filter(v => SEARCH_ALLVALUE !== v);
        }
        if (!input.options.values.length > 0) {
          input.options.values = await getUniqueValuesFromField({
            field:             input.attribute,
            layers:            state.search_layers,
            inputdependance:   dep,
            cachedependencies: state.input.cached_deps,
          })
        }
      }

    } catch (e) {
      has_error = e;
      console.warn(e);
    }

    if (has_error && 'selectfield' ===  input.type && !input.options.dependance_strict && !(!input.options.dependance_strict && input.options.layer_id)) {
      input.options.values.splice(0, input.options.values.length);
    }

    if (has_error && 'selectfield' ===  input.type && !input.options.dependance_strict && input.options.layer_id) {
      input.options.values = [];
    }

    // Set key value for select
    if ('selectfield' ===  input.type && input.options.values && input.options.values.length && 'Object' !== toRawType(input.options.values[0])) {
      input.options.values = input.options.values.map(value => ({ key: value, value }));
    }
  
    if ('selectfield' ===  input.type && input.options.values.length && SEARCH_ALLVALUE !== input.options.values[0].value) {
      input.options.values.unshift({ value: SEARCH_ALLVALUE });
    }

    if ('selectfield' ===  input.type && !(input.options.values.length && SEARCH_ALLVALUE !== input.options.values[0].value)) {
      input.options.values.push({ value: SEARCH_ALLVALUE });
    }
  
    if ('selectfield' ===  input.type) {
      input.value   = SEARCH_ALLVALUE;
      input.loading = false;;
    }

    // there is a dependence
    if (input.options.dependance && !input.options.dependance_strict && ['selectfield', 'autocompletefield'].includes(input.type)) {
      dep[input.attribute]                    = input.options.dependance;        // set dependence of input
      state.loading[input.options.dependance]     = false;
      input.options.disabled                      = input.options.dependance_strict; // disabled for BACKCOMP
      // set input dependencies
      deps[input.options.dependance]              = (undefined !== deps[input.options.dependance] ? deps[input.options.dependance] : []);
      deps[input.options.dependance].push(input);
    }

    // set a widget type for fill dependency
    if (input.options.dependance && !input.options.dependance_strict && ['selectfield', 'autocompletefield'].includes(input.type) && input.options.values.length > 0) {
      input.widget          = 'valuemap';
      input.options._values = [...input.options.values];
    }

    // Set input widget
    if (input.options.dependance && !input.options.dependance_strict && ['selectfield', 'autocompletefield'].includes(input.type) && !input.options.values.length && input.options.layer_id) {
      input.widget = 'valuerelation';
    }

    if (!input.options.dependance_strict) {
      // add form inputs to list of search input
      state.forminputs.push(input);
    }
  }

}